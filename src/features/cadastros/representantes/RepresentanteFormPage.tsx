import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  pessoaId: string;
  nome: string;
  cnpjCpf: string;
  email?: string | null;
  telefone?: string | null;
  ativo: boolean;
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
    const response = await http.get(`/cadastros/representantes/${id}/historico`, {
      params: { page, pageSize: historicoPaged.pageSize },
    });

    setHistoricoPaged(readPagedResponse<HistoricoItemDto>(response.data));
  };

  const loadSubTabs = async (id: string) => {
    const [documentosRes, anexosRes, observacoesRes, historicoRes] = await Promise.all([
      http.get(`/cadastros/representantes/${id}/documentos`),
      http.get(`/cadastros/representantes/${id}/anexos`),
      http.get(`/cadastros/representantes/${id}/observacoes`),
      http.get(`/cadastros/representantes/${id}/historico`, { params: { page: 1, pageSize: 20 } }),
    ]);

    setDocumentosRows((documentosRes.data as DocumentoDto[]) ?? []);
    setAnexosRows((anexosRes.data as CadastroArquivoDto[]) ?? []);
    setObservacoesRows((observacoesRes.data as CadastroObservacaoDto[]) ?? []);
    setHistoricoPaged(readPagedResponse<HistoricoItemDto>(historicoRes.data));
  };

  useEffect(() => {
    const bootstrap = async () => {
      if (!representanteId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const repResponse = await http.get(`/cadastros/representantes/${representanteId}`);
        const representante = repResponse.data as RepresentanteDto;

        setRepresentanteAtivo(representante.ativo);

        const pessoaResponse = await http.get(`/cadastros/pessoas/${representante.pessoaId}`);
        syncPessoaForm(pessoaResponse.data as PessoaDto);

        await loadSubTabs(representanteId);
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, [representanteId]);

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
      const pessoaByDocument = await http.get('/cadastros/pessoas', {
        params: {
          documento: document,
        },
      });

      const found = pessoaByDocument.data as PessoaDto | null;

      if (found?.id) {
        resolvedPessoaId = found.id;
      }
    }

    if (resolvedPessoaId) {
      await http.put(`/cadastros/pessoas/${resolvedPessoaId}`, {
        ...payload,
        ativo: pessoaForm.ativo,
      });

      return resolvedPessoaId;
    }

    const createResponse = await http.post('/cadastros/pessoas', payload);
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
        await http.put(`/cadastros/representantes/${representanteId}`, {
          pessoaId: resolvedPessoaId,
          ativo: representanteAtivo,
        });

        toast.success('Representante atualizado.');
      } else {
        const createResponse = await http.post('/cadastros/representantes', {
          pessoaId: resolvedPessoaId,
        });

        const created = createResponse.data as { id: string };

        if (!representanteAtivo) {
          await http.put(`/cadastros/representantes/${created.id}`, {
            pessoaId: resolvedPessoaId,
            ativo: representanteAtivo,
          });
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
    formData.append('tipoDocumento', tipoDocumento.trim());
    formData.append('file', documentoFile);

    try {
      await http.post(`/cadastros/representantes/${representanteId}/documentos`, formData);
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
      await http.delete(`/cadastros/representantes/${representanteId}/documentos/${item.id}`);
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
