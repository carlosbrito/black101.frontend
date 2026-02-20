import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getErrorMessage, http } from '../../../shared/api/http';
import { PageFrame } from '../../../shared/ui/PageFrame';
import type { PagedResponse } from '../../../shared/types/paging';
import {
  applyCpfCnpjMask,
  applyPhoneMask,
  buildPessoaPayload,
  defaultPessoaFormState,
  formatCpfCnpj,
  formatDateTime,
  isValidCpfCnpj,
  isValidPhone,
  sanitizeDocument,
  type CadastroArquivoDto,
  type HistoricoItemDto,
  type PessoaDto,
  type PessoaFormState,
  type CadastroObservacaoDto,
  readPagedResponse,
} from '../cadastroCommon';
import '../cadastro.css';
import '../administradoras/entity-form.css';

type TabKey = 'representante' | 'documentos' | 'anexos' | 'observacoes' | 'historico';

type RepresentanteDto = {
  id: string;
  status?: number;
  pessoa?: PessoaDto;
};

type DocumentoDto = {
  id: string;
  tipoDocumento: string;
  nomeArquivo: string;
  contentType: string;
  tamanhoBytes: number;
  createdAt: string;
};

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'representante', label: 'Representante' },
  { key: 'documentos', label: 'Documentos' },
  { key: 'anexos', label: 'Anexos' },
  { key: 'observacoes', label: 'Observacoes' },
  { key: 'historico', label: 'Historico' },
];

export const RepresentanteFormPage = () => {
  const params = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const representanteId = params.id;
  const isEdit = !!representanteId;

  const [loading, setLoading] = useState<boolean>(isEdit);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('representante');

  const [pessoaId, setPessoaId] = useState<string | null>(null);
  const [representanteAtivo, setRepresentanteAtivo] = useState(true);
  const [pessoaForm, setPessoaForm] = useState<PessoaFormState>(defaultPessoaFormState);

  const [documentosRows, setDocumentosRows] = useState<DocumentoDto[]>([]);
  const [tipoDocumento, setTipoDocumento] = useState('');
  const [documentoFile, setDocumentoFile] = useState<File | null>(null);

  const [anexosRows, setAnexosRows] = useState<CadastroArquivoDto[]>([]);
  const [anexoFile, setAnexoFile] = useState<File | null>(null);

  const [observacoesRows, setObservacoesRows] = useState<CadastroObservacaoDto[]>([]);
  const [textoObservacao, setTextoObservacao] = useState('');

  const [historicoPaged, setHistoricoPaged] = useState<PagedResponse<HistoricoItemDto>>({
    items: [],
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 1,
  });

  const canAccessSubTabs = isEdit;
  const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';
  const statusFromActive = (ativo: boolean) => (ativo ? 0 : 1);

  const syncPessoaForm = (pessoa: PessoaDto) => {
    setPessoaId(pessoa.id);
    setPessoaForm({
      nome: pessoa.nome ?? '',
      cnpjCpf: applyCpfCnpjMask(pessoa.cnpjCpf ?? ''),
      email: pessoa.email ?? '',
      telefone: applyPhoneMask(pessoa.telefone ?? ''),
      cidade: pessoa.cidade ?? '',
      uf: pessoa.uf ?? '',
      observacoesGerais: pessoa.observacoesGerais ?? '',
      ativo: pessoa.ativo,
      enderecos: pessoa.enderecos ?? [],
      contatos: pessoa.contatos ?? [],
      qsas: pessoa.qsas ?? [],
    });
  };

  const loadHistorico = async (id: string, page: number) => {
    try {
      const response = await http.get('/admin/auditoria', {
        params: {
          page,
          pageSize: historicoPaged.pageSize,
          entity: 'Representante',
        },
      });
      const paged = readPagedResponse<HistoricoItemDto>(response.data);
      const filteredItems = paged.items.filter((item) => item.entidadeId === id);
      setHistoricoPaged({
        items: filteredItems,
        page,
        pageSize: historicoPaged.pageSize,
        totalItems: filteredItems.length,
        totalPages: 1,
      });
    } catch {
      setHistoricoPaged({
        items: [],
        page,
        pageSize: historicoPaged.pageSize,
        totalItems: 0,
        totalPages: 1,
      });
    }
  };

  const loadSubTabs = async (id: string) => {
    const [documentosRes, anexosRes, observacoesRes] = await Promise.all([
      http.get('/api/representante/get/documentos', { params: { id } }).catch(() => ({ data: [] as DocumentoDto[] })),
      http.get(`/cadastros/representantes/${id}/anexos`).catch(() => ({ data: [] as CadastroArquivoDto[] })),
      http.get(`/cadastros/representantes/${id}/observacoes`).catch(() => ({ data: [] as CadastroObservacaoDto[] })),
    ]);

    setDocumentosRows((documentosRes.data as DocumentoDto[]) ?? []);
    setAnexosRows((anexosRes.data as CadastroArquivoDto[]) ?? []);
    setObservacoesRows((observacoesRes.data as CadastroObservacaoDto[]) ?? []);
    await loadHistorico(id, 1);
  };

  useEffect(() => {
    const bootstrap = async () => {
      setLoading(true);
      try {
        if (representanteId) {
          const repResponse = await http.get(`/api/representante/get/unique/${representanteId}`);
          const representante = repResponse.data as RepresentanteDto;

          setRepresentanteAtivo(Number(representante.status ?? 0) === 0);
          if (representante.pessoa) {
            syncPessoaForm(representante.pessoa);
          }

          await loadSubTabs(representanteId);
        } else {
          const documento = sanitizeDocument(searchParams.get('documento') ?? '');
          if (documento) {
            setPessoaForm((current) => ({ ...current, cnpjCpf: applyCpfCnpjMask(documento) }));
            const pessoaResponse = await http.get<PessoaDto>(`/api/pessoa/get/cnpjcpf/${documento}`, {
              params: { enrichData: false, fazerConsultaPadrao: false, isToGetQSA: false },
            });
            const pessoa = pessoaResponse.data;
            if (pessoa?.id && pessoa.id !== EMPTY_GUID) {
              syncPessoaForm(pessoa);
            }
          }
        }
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, [representanteId, searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const ensureValidPessoaForm = (): boolean => {
    const document = sanitizeDocument(pessoaForm.cnpjCpf);

    if (!pessoaForm.nome.trim()) {
      toast.error('Informe o nome do representante.');
      return false;
    }

    if (!isValidCpfCnpj(document)) {
      toast.error('Informe um CPF/CNPJ valido.');
      return false;
    }

    if (pessoaForm.telefone.trim() && !isValidPhone(pessoaForm.telefone)) {
      toast.error('Informe um telefone valido com DDD.');
      return false;
    }

    return true;
  };

  const upsertPessoa = async (): Promise<string> => {
    const payload = buildPessoaPayload(pessoaForm);
    const document = sanitizeDocument(payload.cnpjCpf);
    let resolvedPessoaId = pessoaId;

    if (!resolvedPessoaId) {
      const pessoaByDocument = await http.get<PessoaDto>(`/api/pessoa/get/cnpjcpf/${document}`, {
        params: { enrichData: false, fazerConsultaPadrao: false, isToGetQSA: false },
      });
      const found = pessoaByDocument.data;
      if (found?.id && found.id !== EMPTY_GUID) {
        resolvedPessoaId = found.id;
      }
    }

    if (resolvedPessoaId) {
      await http.put('/api/pessoa/update', {
        id: resolvedPessoaId,
        ...payload,
        ativo: pessoaForm.ativo,
      });

      return resolvedPessoaId;
    }

    const createResponse = await http.post('/api/pessoa/register', payload);
    const created = createResponse.data as { id: string };
    return created.id;
  };

  const onSaveRepresentante = async (event: FormEvent) => {
    event.preventDefault();

    if (!ensureValidPessoaForm()) {
      return;
    }

    setSaving(true);

    try {
      const resolvedPessoaId = await upsertPessoa();
      setPessoaId(resolvedPessoaId);

      if (representanteId) {
        await http.put('/api/representante/update', { id: representanteId, status: statusFromActive(representanteAtivo) });

        toast.success('Representante atualizado.');
      } else {
        const createResponse = await http.post('/api/representante/register', { pessoaId: resolvedPessoaId });
        const created = createResponse.data as { id: string };

        if (!representanteAtivo) {
          await http.put('/api/representante/update', { id: created.id, status: statusFromActive(false) });
        }

        toast.success('Representante criado.');
        navigate(`/cadastro/representantes/${created.id}`, { replace: true });
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const parseFileName = (header: string | null, fallbackName: string): string => {
    if (!header) {
      return fallbackName;
    }

    const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(header);
    if (utf8Match?.[1]) {
      return decodeURIComponent(utf8Match[1]);
    }

    const quotedMatch = /filename="?([^";]+)"?/i.exec(header);
    if (quotedMatch?.[1]) {
      return quotedMatch[1];
    }

    return fallbackName;
  };

  const downloadBlobFromEndpoint = async (url: string, fallbackName: string) => {
    const response = await http.get(url, { responseType: 'blob' });
    const fileName = parseFileName(response.headers['content-disposition'] ?? null, fallbackName);
    const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(blobUrl);
  };

  const uploadDocumento = async () => {
    if (!representanteId || !documentoFile || !tipoDocumento.trim()) {
      toast.error('Informe tipo de documento e selecione um arquivo.');
      return;
    }

    const formData = new FormData();
    formData.append('id', representanteId);
    formData.append('tipoDocumentoRepresentante', tipoDocumento.trim());
    formData.append('file', documentoFile);

    try {
      await http.post('/api/representante/documento', formData);
      setTipoDocumento('');
      setDocumentoFile(null);
      toast.success('Documento enviado.');
      await loadSubTabs(representanteId);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const removeDocumento = async (item: DocumentoDto) => {
    if (!representanteId) {
      return;
    }

    if (!window.confirm(`Excluir documento '${item.nomeArquivo}'?`)) {
      return;
    }

    try {
      await http.delete(`/api/representante/documento/${item.id}`);
      toast.success('Documento removido.');
      await loadSubTabs(representanteId);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const uploadAnexo = async () => {
    if (!representanteId || !anexoFile) {
      toast.error('Selecione um arquivo para anexar.');
      return;
    }

    const formData = new FormData();
    formData.append('file', anexoFile);

    try {
      await http.post(`/cadastros/representantes/${representanteId}/anexos`, formData);
      setAnexoFile(null);
      toast.success('Anexo enviado.');
      await loadSubTabs(representanteId);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const removeAnexo = async (item: CadastroArquivoDto) => {
    if (!representanteId) {
      return;
    }

    if (!window.confirm(`Excluir anexo '${item.nomeArquivo}'?`)) {
      return;
    }

    try {
      await http.delete(`/cadastros/representantes/${representanteId}/anexos/${item.id}`);
      toast.success('Anexo removido.');
      await loadSubTabs(representanteId);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const addObservacao = async () => {
    if (!representanteId || !textoObservacao.trim()) {
      toast.error('Informe a observacao.');
      return;
    }

    try {
      await http.post(`/cadastros/representantes/${representanteId}/observacoes`, {
        texto: textoObservacao.trim(),
      });

      setTextoObservacao('');
      toast.success('Observacao adicionada.');
      await loadSubTabs(representanteId);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const removeObservacao = async (item: CadastroObservacaoDto) => {
    if (!representanteId) {
      return;
    }

    if (!window.confirm('Excluir observacao?')) {
      return;
    }

    try {
      await http.delete(`/cadastros/representantes/${representanteId}/observacoes/${item.id}`);
      toast.success('Observacao removida.');
      await loadSubTabs(representanteId);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const currentTitle = useMemo(
    () => (isEdit ? `Representante: ${pessoaForm.nome || 'Editar'}` : 'Novo Representante'),
    [isEdit, pessoaForm.nome],
  );

  const changeTab = (key: TabKey) => {
    if (!canAccessSubTabs && key !== 'representante') {
      toast('Salve o representante para liberar as abas complementares.');
      return;
    }

    setActiveTab(key);
  };

  const renderRepresentanteTab = () => (
    <form className="entity-form-stack" onSubmit={onSaveRepresentante}>
      <section className="entity-card">
        <header>
          <h3>Dados da Pessoa</h3>
        </header>
        <div className="entity-grid cols-3">
          <label>
            <span>Nome</span>
            <input
              value={pessoaForm.nome}
              onChange={(event) => setPessoaForm((current) => ({ ...current, nome: event.target.value }))}
              required
            />
          </label>
          <label>
            <span>CPF/CNPJ</span>
            <input
              value={pessoaForm.cnpjCpf}
              onChange={(event) => setPessoaForm((current) => ({ ...current, cnpjCpf: applyCpfCnpjMask(event.target.value) }))}
              required
            />
          </label>
          <label className="checkbox-inline">
            <input
              type="checkbox"
              checked={representanteAtivo}
              onChange={(event) => setRepresentanteAtivo(event.target.checked)}
            />
            <span>Representante ativo</span>
          </label>
          <label>
            <span>E-mail</span>
            <input
              type="email"
              value={pessoaForm.email}
              onChange={(event) => setPessoaForm((current) => ({ ...current, email: event.target.value }))}
            />
          </label>
          <label>
            <span>Telefone</span>
            <input
              value={pessoaForm.telefone}
              onChange={(event) => setPessoaForm((current) => ({ ...current, telefone: applyPhoneMask(event.target.value) }))}
            />
          </label>
          <label>
            <span>Cidade</span>
            <input
              value={pessoaForm.cidade}
              onChange={(event) => setPessoaForm((current) => ({ ...current, cidade: event.target.value }))}
            />
          </label>
          <label>
            <span>UF</span>
            <input
              maxLength={2}
              value={pessoaForm.uf}
              onChange={(event) => setPessoaForm((current) => ({ ...current, uf: event.target.value.toUpperCase() }))}
            />
          </label>
          <label className="span-all">
            <span>Observacoes Gerais</span>
            <textarea
              rows={6}
              maxLength={5000}
              value={pessoaForm.observacoesGerais}
              onChange={(event) => setPessoaForm((current) => ({ ...current, observacoesGerais: event.target.value }))}
            />
          </label>
        </div>
      </section>

      <div className="entity-actions">
        <button type="button" className="btn-muted" onClick={() => navigate('/cadastro/representantes')}>
          Voltar
        </button>
        <button type="submit" className="btn-main" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  );

  const renderDocumentosTab = () => (
    <section className="entity-form-stack">
      <section className="entity-card">
        <header>
          <h3>Novo documento</h3>
        </header>
        <div className="entity-grid cols-3">
          <label>
            <span>Tipo do documento</span>
            <input value={tipoDocumento} onChange={(event) => setTipoDocumento(event.target.value)} />
          </label>
          <label className="span-all">
            <span>Arquivo</span>
            <input type="file" onChange={(event) => setDocumentoFile(event.target.files?.[0] ?? null)} />
          </label>
          <div className="entity-inline-actions">
            <button type="button" className="btn-main" onClick={uploadDocumento}>Enviar documento</button>
          </div>
        </div>
      </section>

      <section className="entity-card">
        <div className="entity-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Arquivo</th>
                <th>Tamanho</th>
                <th>Data</th>
                <th className="col-actions">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {documentosRows.map((item) => (
                <tr key={item.id}>
                  <td>{item.tipoDocumento}</td>
                  <td>{item.nomeArquivo}</td>
                  <td>{(item.tamanhoBytes / 1024).toFixed(1)} KB</td>
                  <td>{formatDateTime(item.createdAt)}</td>
                  <td className="col-actions">
                    <div className="table-actions">
                      <button onClick={() => void downloadBlobFromEndpoint(`/cadastros/representantes/${representanteId}/documentos/${item.id}/download`, item.nomeArquivo)}>
                        Download
                      </button>
                      <button className="danger" onClick={() => removeDocumento(item)}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );

  const renderAnexosTab = () => (
    <section className="entity-form-stack">
      <section className="entity-card">
        <header>
          <h3>Novo anexo</h3>
        </header>
        <div className="entity-grid cols-3">
          <label className="span-all">
            <span>Arquivo</span>
            <input type="file" onChange={(event) => setAnexoFile(event.target.files?.[0] ?? null)} />
          </label>
          <div className="entity-inline-actions">
            <button type="button" className="btn-main" onClick={uploadAnexo}>Enviar anexo</button>
          </div>
        </div>
      </section>

      <section className="entity-card">
        <div className="entity-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Arquivo</th>
                <th>Tamanho</th>
                <th>Data</th>
                <th className="col-actions">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {anexosRows.map((item) => (
                <tr key={item.id}>
                  <td>{item.nomeArquivo}</td>
                  <td>{(item.tamanhoBytes / 1024).toFixed(1)} KB</td>
                  <td>{formatDateTime(item.createdAt)}</td>
                  <td className="col-actions">
                    <div className="table-actions">
                      <button onClick={() => void downloadBlobFromEndpoint(`/cadastros/representantes/${representanteId}/anexos/${item.id}/download`, item.nomeArquivo)}>
                        Download
                      </button>
                      <button className="danger" onClick={() => removeAnexo(item)}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );

  const renderObservacoesTab = () => (
    <section className="entity-form-stack">
      <section className="entity-card">
        <header>
          <h3>Nova observacao</h3>
        </header>
        <div className="entity-grid cols-2">
          <label className="span-all">
            <span>Texto</span>
            <textarea rows={4} value={textoObservacao} onChange={(event) => setTextoObservacao(event.target.value)} />
          </label>
          <div className="entity-inline-actions">
            <button type="button" className="btn-main" onClick={addObservacao}>Adicionar observacao</button>
          </div>
        </div>
      </section>

      <section className="entity-card">
        <div className="entity-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Texto</th>
                <th>Autor</th>
                <th>Data</th>
                <th className="col-actions">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {observacoesRows.map((item) => (
                <tr key={item.id}>
                  <td>{item.texto}</td>
                  <td>{item.autorEmail || '-'}</td>
                  <td>{formatDateTime(item.createdAt)}</td>
                  <td className="col-actions">
                    <div className="table-actions">
                      <button className="danger" onClick={() => removeObservacao(item)}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );

  const renderHistoricoTab = () => (
    <section className="entity-card entity-form-stack">
      <header>
        <h3>Historico de Auditoria</h3>
      </header>
      <div className="entity-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Acao</th>
              <th>Entidade</th>
              <th>Usuario</th>
              <th>Data</th>
              <th>TraceId</th>
            </tr>
          </thead>
          <tbody>
            {historicoPaged.items.map((item) => (
              <tr key={item.id}>
                <td>{item.acao}</td>
                <td>{item.entidade}</td>
                <td>{item.userEmail || '-'}</td>
                <td>{formatDateTime(item.createdAt)}</td>
                <td className="trace-id-cell" title={item.traceId}>{item.traceId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {representanteId ? (
        <div className="pager">
          <span>{historicoPaged.totalItems} evento(s)</span>
          <div>
            <button
              disabled={historicoPaged.page <= 1}
              onClick={() => void loadHistorico(representanteId, historicoPaged.page - 1)}
            >
              Anterior
            </button>
            <span>{historicoPaged.page} de {historicoPaged.totalPages}</span>
            <button
              disabled={historicoPaged.page >= historicoPaged.totalPages}
              onClick={() => void loadHistorico(representanteId, historicoPaged.page + 1)}
            >
              Proxima
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );

  const renderCurrentTab = () => {
    switch (activeTab) {
      case 'representante':
        return renderRepresentanteTab();
      case 'documentos':
        return renderDocumentosTab();
      case 'anexos':
        return renderAnexosTab();
      case 'observacoes':
        return renderObservacoesTab();
      case 'historico':
        return renderHistoricoTab();
      default:
        return null;
    }
  };

  return (
    <PageFrame
      title={currentTitle}
      subtitle={isEdit ? 'Edicao completa com abas no padrao do legado.' : 'Criacao com vinculo em Pessoa e fluxo completo.'}
      actions={
        <button className="btn-muted" onClick={() => navigate('/cadastro/representantes')}>
          Voltar para listagem
        </button>
      }
    >
      <div className="entity-meta-bar">
        <span><strong>Pessoa:</strong> {pessoaId ?? 'Nao vinculada'}</span>
        <span><strong>Documento:</strong> {formatCpfCnpj(pessoaForm.cnpjCpf)}</span>
      </div>

      <div className="entity-tabs" role="tablist" aria-label="Abas de cadastro do representante">
        {tabs.map((tab) => {
          const disabled = !canAccessSubTabs && tab.key !== 'representante';

          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              className={`entity-tab-btn ${activeTab === tab.key ? 'is-active' : ''}`}
              onClick={() => changeTab(tab.key)}
              disabled={disabled}
              aria-selected={activeTab === tab.key}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {loading ? <div className="entity-loading">Carregando cadastro...</div> : renderCurrentTab()}
    </PageFrame>
  );
};
