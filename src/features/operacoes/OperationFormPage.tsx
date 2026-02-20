import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getErrorMessage, http } from '../../shared/api/http';
import { PageFrame } from '../../shared/ui/PageFrame';
import { formatDateTime, readPagedResponse } from '../cadastros/cadastroCommon';
import './operations/operation-form.css';

type TabKey = 'operacao' | 'recebiveis' | 'sacados' | 'anexos' | 'observacoes' | 'historico';
type PagedResponse<T> = { items: T[]; page: number; pageSize: number; totalItems: number; totalPages: number };

type OperacaoDto = {
  id: string;
  numero: string;
  descricao: string;
  valor: number;
  dataOperacao: string;
  status: string;
  cedenteId?: string | null;
  quantidadeRecebiveis?: number;
  valorTotalRecebiveis?: number;
  quantidadeSacados?: number;
};

type OperacaoRecebivelDto = {
  id: string;
  numero: string;
  chaveNfe: string;
  numeroDuplicata: string;
  valorFace: number;
  dataVencimento: string;
  xmlFileName: string;
  sacadoDocumento?: string | null;
  sacadoNome?: string | null;
};

type OperacaoSacadoDto = {
  id: string;
  sacadoId?: string | null;
  documento: string;
  nome: string;
  origem: string;
  createdAt: string;
};

type CadastroArquivoDto = {
  id: string;
  nomeArquivo: string;
  contentType: string;
  tamanhoBytes: number;
  createdAt: string;
  uploadedByUserEmail?: string | null;
};

type CadastroObservacaoDto = {
  id: string;
  texto: string;
  createdAt: string;
  autorUserEmail?: string | null;
};

type OperacaoHistoricoDto = {
  id: string;
  acao: string;
  entidade: string;
  userEmail?: string | null;
  createdAt: string;
  traceId: string;
  payloadJson?: string | null;
};

type SacadoOption = { id: string; nome: string; documento?: string | null };

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'operacao', label: 'Operação' },
  { key: 'recebiveis', label: 'Recebíveis' },
  { key: 'sacados', label: 'Sacados' },
  { key: 'anexos', label: 'Anexos' },
  { key: 'observacoes', label: 'Observações' },
  { key: 'historico', label: 'Histórico' },
];

const formatMoney = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(value) ? value : 0);

export const OperationFormPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabKey>('operacao');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [operacao, setOperacao] = useState<OperacaoDto | null>(null);
  const [recebiveisPaged, setRecebiveisPaged] = useState<PagedResponse<OperacaoRecebivelDto>>({ items: [], page: 1, pageSize: 20, totalItems: 0, totalPages: 1 });
  const [sacados, setSacados] = useState<OperacaoSacadoDto[]>([]);
  const [anexos, setAnexos] = useState<CadastroArquivoDto[]>([]);
  const [observacoes, setObservacoes] = useState<CadastroObservacaoDto[]>([]);
  const [historicoPaged, setHistoricoPaged] = useState<PagedResponse<OperacaoHistoricoDto>>({ items: [], page: 1, pageSize: 20, totalItems: 0, totalPages: 1 });

  const [observacaoTexto, setObservacaoTexto] = useState('');
  const [anexoFile, setAnexoFile] = useState<File | null>(null);
  const [sacadoId, setSacadoId] = useState('');
  const [sacadosOptions, setSacadosOptions] = useState<SacadoOption[]>([]);

  const canLoad = Boolean(id);

  const loadOperacao = useCallback(async () => {
    if (!id) return;
    const response = await http.get<OperacaoDto>(`/operacoes/${id}`);
    setOperacao(response.data);
  }, [id]);

  const loadRecebiveis = useCallback(async (page = 1) => {
    if (!id) return;
    const response = await http.get(`/operacoes/${id}/recebiveis`, {
      params: { page, pageSize: recebiveisPaged.pageSize, sortBy: 'vencimento', sortDir: 'desc' },
    });
    setRecebiveisPaged(readPagedResponse<OperacaoRecebivelDto>(response.data));
  }, [id, recebiveisPaged.pageSize]);

  const loadSacados = useCallback(async () => {
    if (!id) return;
    const response = await http.get<OperacaoSacadoDto[]>(`/operacoes/${id}/sacados`);
    setSacados(response.data ?? []);
  }, [id]);

  const loadAnexos = useCallback(async () => {
    if (!id) return;
    const response = await http.get<CadastroArquivoDto[]>(`/operacoes/${id}/anexos`);
    setAnexos(response.data ?? []);
  }, [id]);

  const loadObservacoes = useCallback(async () => {
    if (!id) return;
    const response = await http.get<CadastroObservacaoDto[]>(`/operacoes/${id}/observacoes`);
    setObservacoes(response.data ?? []);
  }, [id]);

  const loadHistorico = useCallback(async (page = 1) => {
    if (!id) return;
    const response = await http.get(`/operacoes/${id}/historico`, {
      params: { page, pageSize: historicoPaged.pageSize, sortBy: 'createdAt', sortDir: 'desc' },
    });
    setHistoricoPaged(readPagedResponse<OperacaoHistoricoDto>(response.data));
  }, [id, historicoPaged.pageSize]);

  const loadSacadosOptions = useCallback(async () => {
    const response = await http.get('/cadastros/sacados', { params: { page: 1, pageSize: 200 } });
    const data = readPagedResponse<SacadoOption>(response.data);
    setSacadosOptions(data.items ?? []);
  }, []);

  const loadAll = useCallback(async () => {
    if (!canLoad) return;
    setLoading(true);
    try {
      await Promise.all([loadOperacao(), loadRecebiveis(1), loadSacados(), loadAnexos(), loadObservacoes(), loadHistorico(1), loadSacadosOptions()]);
    } finally {
      setLoading(false);
    }
  }, [canLoad, loadOperacao, loadRecebiveis, loadSacados, loadAnexos, loadObservacoes, loadHistorico, loadSacadosOptions]);

  useEffect(() => {
    void loadAll().catch((error) => toast.error(getErrorMessage(error)));
  }, [loadAll]);

  const onSaveOperacao = async () => {
    if (!id || !operacao) return;
    setSaving(true);
    try {
      await http.put(`/operacoes/${id}`, {
        numero: operacao.numero,
        descricao: operacao.descricao,
        valor: operacao.valor,
        dataOperacao: operacao.dataOperacao,
        status: operacao.status,
        cedenteId: operacao.cedenteId,
      });
      toast.success('Operação atualizada.');
      await loadOperacao();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const onAddSacado = async () => {
    if (!id || !sacadoId) {
      toast.error('Selecione um sacado.');
      return;
    }

    try {
      await http.post(`/operacoes/${id}/sacados`, { sacadoId });
      setSacadoId('');
      toast.success('Sacado vinculado.');
      await Promise.all([loadSacados(), loadOperacao()]);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const onRemoveSacado = async (operacaoSacadoId: string) => {
    if (!id || !window.confirm('Remover sacado da operação?')) return;
    try {
      await http.delete(`/operacoes/${id}/sacados/${operacaoSacadoId}`);
      toast.success('Sacado removido.');
      await Promise.all([loadSacados(), loadOperacao()]);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const onUploadAnexo = async () => {
    if (!id || !anexoFile) {
      toast.error('Selecione um arquivo.');
      return;
    }

    try {
      const fd = new FormData();
      fd.append('file', anexoFile);
      await http.post(`/operacoes/${id}/anexos`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setAnexoFile(null);
      toast.success('Anexo enviado.');
      await loadAnexos();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const onDownloadAnexo = async (anexoId: string, nomeArquivo: string) => {
    if (!id) return;
    try {
      const response = await http.get(`/operacoes/${id}/anexos/${anexoId}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = nomeArquivo;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const onRemoveAnexo = async (anexoId: string) => {
    if (!id || !window.confirm('Remover anexo?')) return;
    try {
      await http.delete(`/operacoes/${id}/anexos/${anexoId}`);
      toast.success('Anexo removido.');
      await loadAnexos();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const onAddObservacao = async () => {
    if (!id || !observacaoTexto.trim()) {
      toast.error('Informe um texto para observação.');
      return;
    }

    try {
      await http.post(`/operacoes/${id}/observacoes`, { texto: observacaoTexto.trim() });
      setObservacaoTexto('');
      toast.success('Observação incluída.');
      await loadObservacoes();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const onRemoveObservacao = async (observacaoId: string) => {
    if (!id || !window.confirm('Remover observação?')) return;
    try {
      await http.delete(`/operacoes/${id}/observacoes/${observacaoId}`);
      toast.success('Observação removida.');
      await loadObservacoes();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const activeSacadoIds = useMemo(() => new Set(sacados.map((item) => item.sacadoId).filter(Boolean)), [sacados]);

  if (!canLoad) {
    return (
      <PageFrame title="Operação" subtitle="ID da operação não informado.">
        <div className="entity-loading">ID inválido.</div>
      </PageFrame>
    );
  }

  return (
    <PageFrame
      title="Edição de Operação"
      subtitle="Paridade com legado: Operação, Recebíveis, Sacados, Anexos, Observações e Histórico."
      actions={<button className="btn-muted" onClick={() => navigate('/operacoes')}>Voltar para lista</button>}
    >
      {loading ? <div className="entity-loading">Carregando operação...</div> : null}

      {operacao ? (
        <>
          <div className="operation-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`entity-tab-btn ${activeTab === tab.key ? 'is-active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'operacao' ? (
            <section className="entity-form-stack">
              <section className="entity-card">
                <div className="entity-grid cols-2">
                  <label><span>Número</span><input value={operacao.numero} onChange={(e) => setOperacao((p) => (p ? { ...p, numero: e.target.value } : p))} /></label>
                  <label><span>Status</span>
                    <select value={operacao.status} onChange={(e) => setOperacao((p) => (p ? { ...p, status: e.target.value } : p))}>
                      <option value="Aberta">Aberta</option>
                      <option value="Liquidada">Liquidada</option>
                      <option value="Cancelada">Cancelada</option>
                    </select>
                  </label>
                  <label className="span-all"><span>Descrição</span><input value={operacao.descricao} onChange={(e) => setOperacao((p) => (p ? { ...p, descricao: e.target.value } : p))} /></label>
                  <label><span>Valor da Capa</span><input type="number" step="0.01" value={operacao.valor} onChange={(e) => setOperacao((p) => (p ? { ...p, valor: Number(e.target.value) || 0 } : p))} /></label>
                  <label><span>Data da Operação</span><input type="date" value={operacao.dataOperacao?.substring(0, 10)} onChange={(e) => setOperacao((p) => (p ? { ...p, dataOperacao: e.target.value } : p))} /></label>
                </div>
                <div className="entity-actions">
                  <button type="button" className="btn-main" onClick={() => void onSaveOperacao()} disabled={saving}>{saving ? 'Salvando...' : 'Salvar capa da operação'}</button>
                </div>
              </section>
              <section className="entity-card operation-summary-grid">
                <article><h4>Recebíveis</h4><strong>{operacao.quantidadeRecebiveis ?? recebiveisPaged.totalItems}</strong></article>
                <article><h4>Valor Total Recebíveis</h4><strong>{formatMoney(operacao.valorTotalRecebiveis ?? 0)}</strong></article>
                <article><h4>Sacados</h4><strong>{operacao.quantidadeSacados ?? sacados.length}</strong></article>
              </section>
            </section>
          ) : null}

          {activeTab === 'recebiveis' ? (
            <section className="entity-card">
              <div className="entity-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Número</th>
                      <th>Chave NFe</th>
                      <th>Duplicata</th>
                      <th>Sacado</th>
                      <th>Vencimento</th>
                      <th>Valor</th>
                      <th>XML</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recebiveisPaged.items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.numero}</td>
                        <td>{item.chaveNfe}</td>
                        <td>{item.numeroDuplicata}</td>
                        <td>{item.sacadoNome ?? '-'}{item.sacadoDocumento ? ` (${item.sacadoDocumento})` : ''}</td>
                        <td>{formatDateTime(item.dataVencimento)}</td>
                        <td>{formatMoney(item.valorFace)}</td>
                        <td>{item.xmlFileName}</td>
                      </tr>
                    ))}
                    {recebiveisPaged.items.length === 0 ? <tr><td colSpan={7}>Nenhum recebível encontrado.</td></tr> : null}
                  </tbody>
                </table>
              </div>
              <div className="entity-pagination">
                <button disabled={recebiveisPaged.page <= 1} onClick={() => void loadRecebiveis(recebiveisPaged.page - 1)}>Anterior</button>
                <span>{recebiveisPaged.page} de {recebiveisPaged.totalPages}</span>
                <button disabled={recebiveisPaged.page >= recebiveisPaged.totalPages} onClick={() => void loadRecebiveis(recebiveisPaged.page + 1)}>Próxima</button>
              </div>
            </section>
          ) : null}

          {activeTab === 'sacados' ? (
            <section className="entity-form-stack">
              <section className="entity-card">
                <div className="entity-grid cols-2">
                  <label>
                    <span>Adicionar sacado</span>
                    <select value={sacadoId} onChange={(e) => setSacadoId(e.target.value)}>
                      <option value="">Selecione</option>
                      {sacadosOptions.map((option) => (
                        <option key={option.id} value={option.id} disabled={activeSacadoIds.has(option.id)}>
                          {option.nome} {option.documento ? `(${option.documento})` : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="entity-inline-actions"><button type="button" className="btn-main" onClick={() => void onAddSacado()}>Vincular</button></div>
                </div>
              </section>
              <section className="entity-table-wrap">
                <table>
                  <thead><tr><th>Nome</th><th>Documento</th><th>Origem</th><th>Data</th><th className="col-actions">Ações</th></tr></thead>
                  <tbody>
                    {sacados.map((item) => (
                      <tr key={item.id}>
                        <td>{item.nome}</td>
                        <td>{item.documento || '-'}</td>
                        <td>{item.origem}</td>
                        <td>{formatDateTime(item.createdAt)}</td>
                        <td className="col-actions"><div className="table-actions"><button type="button" className="danger" onClick={() => void onRemoveSacado(item.id)}>Remover</button></div></td>
                      </tr>
                    ))}
                    {sacados.length === 0 ? <tr><td colSpan={5}>Nenhum sacado vinculado.</td></tr> : null}
                  </tbody>
                </table>
              </section>
            </section>
          ) : null}

          {activeTab === 'anexos' ? (
            <section className="entity-form-stack">
              <section className="entity-card">
                <div className="entity-grid cols-2">
                  <label><span>Arquivo</span><input type="file" onChange={(e) => setAnexoFile(e.target.files?.[0] ?? null)} /></label>
                  <div className="entity-inline-actions"><button type="button" className="btn-main" onClick={() => void onUploadAnexo()}>Enviar anexo</button></div>
                </div>
              </section>
              <section className="entity-table-wrap">
                <table>
                  <thead><tr><th>Arquivo</th><th>Tipo</th><th>Tamanho</th><th>Data</th><th className="col-actions">Ações</th></tr></thead>
                  <tbody>
                    {anexos.map((item) => (
                      <tr key={item.id}>
                        <td>{item.nomeArquivo}</td>
                        <td>{item.contentType}</td>
                        <td>{item.tamanhoBytes}</td>
                        <td>{formatDateTime(item.createdAt)}</td>
                        <td className="col-actions"><div className="table-actions"><button type="button" onClick={() => void onDownloadAnexo(item.id, item.nomeArquivo)}>Download</button><button type="button" className="danger" onClick={() => void onRemoveAnexo(item.id)}>Remover</button></div></td>
                      </tr>
                    ))}
                    {anexos.length === 0 ? <tr><td colSpan={5}>Nenhum anexo cadastrado.</td></tr> : null}
                  </tbody>
                </table>
              </section>
            </section>
          ) : null}

          {activeTab === 'observacoes' ? (
            <section className="entity-form-stack">
              <section className="entity-card">
                <label className="span-all"><span>Texto</span><textarea value={observacaoTexto} onChange={(e) => setObservacaoTexto(e.target.value)} /></label>
                <div className="entity-actions"><button type="button" className="btn-main" onClick={() => void onAddObservacao()}>Incluir observação</button></div>
              </section>
              <section className="entity-table-wrap">
                <table>
                  <thead><tr><th>Autor</th><th>Data</th><th>Texto</th><th className="col-actions">Ações</th></tr></thead>
                  <tbody>
                    {observacoes.map((item) => (
                      <tr key={item.id}>
                        <td>{item.autorUserEmail ?? '-'}</td>
                        <td>{formatDateTime(item.createdAt)}</td>
                        <td>{item.texto}</td>
                        <td className="col-actions"><div className="table-actions"><button type="button" className="danger" onClick={() => void onRemoveObservacao(item.id)}>Remover</button></div></td>
                      </tr>
                    ))}
                    {observacoes.length === 0 ? <tr><td colSpan={4}>Nenhuma observação cadastrada.</td></tr> : null}
                  </tbody>
                </table>
              </section>
            </section>
          ) : null}

          {activeTab === 'historico' ? (
            <section className="entity-card">
              <div className="entity-table-wrap">
                <table>
                  <thead><tr><th>Ação</th><th>Entidade</th><th>Usuário</th><th>Data</th><th>TraceId</th><th>Payload</th></tr></thead>
                  <tbody>
                    {historicoPaged.items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.acao}</td>
                        <td>{item.entidade}</td>
                        <td>{item.userEmail ?? '-'}</td>
                        <td>{formatDateTime(item.createdAt)}</td>
                        <td className="trace-id-cell">{item.traceId}</td>
                        <td>{item.payloadJson ?? '-'}</td>
                      </tr>
                    ))}
                    {historicoPaged.items.length === 0 ? <tr><td colSpan={6}>Nenhum histórico encontrado.</td></tr> : null}
                  </tbody>
                </table>
              </div>
              <div className="entity-pagination">
                <button disabled={historicoPaged.page <= 1} onClick={() => void loadHistorico(historicoPaged.page - 1)}>Anterior</button>
                <span>{historicoPaged.page} de {historicoPaged.totalPages}</span>
                <button disabled={historicoPaged.page >= historicoPaged.totalPages} onClick={() => void loadHistorico(historicoPaged.page + 1)}>Próxima</button>
              </div>
            </section>
          ) : null}
        </>
      ) : (
        <section className="entity-card">
          <p>Operação não encontrada.</p>
          <Link className="btn-muted" to="/operacoes">Voltar</Link>
        </section>
      )}
    </PageFrame>
  );
};
