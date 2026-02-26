import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getErrorMessage, http } from '../../shared/api/http';
import { PageFrame } from '../../shared/ui/PageFrame';
import { formatDateTime, readPagedResponse } from '../cadastros/cadastroCommon';
import {
  GarantiaStatusJuridico,
  GarantiaStatusAlocacao,
  GarantiaTipoAlocacao,
  garantiaStatusJuridicoLabel,
} from '../cadastros/garantias/types';
import './operations/operation-form.css';

type TabKey = 'operacao' | 'recebiveis' | 'sacados' | 'garantias' | 'anexos' | 'observacoes' | 'historico';
type PagedResponse<T> = { items: T[]; page: number; pageSize: number; totalItems: number; totalPages: number };

type OperacaoDto = {
  id: string;
  numero: string;
  descricao: string;
  valor: number;
  dataOperacao: string;
  createdAt: string;
  status: string;
  cedenteId?: string | null;
  quantidadeRecebiveis?: number;
  valorTotalRecebiveis?: number;
  quantidadeSacados?: number;
  cedenteNome?: string | null;
  cedenteCnpjCpf?: string | null;
  modalidade?: string | null;
  abertoPorEmail?: string | null;
  fechadoPorEmail?: string | null;
  agenteNome?: string | null;
  hasLastro?: boolean;
  valorFace?: number | null;
  desagio?: number | null;
  taxa?: number | null;
  float?: number | null;
  feeTerceirosPercentual?: number | null;
  feeTerceirosCalculado?: number | null;
  prazoMedioDias?: number | null;
  roa?: number | null;
  cet?: number | null;
  cedenteLimiteTotal?: number | null;
  cedenteTrancheModalidade?: number | null;
  cedenteValoresEmAberto?: number | null;
  cedentePrimeiraOperacao?: string | null;
  cedenteUltimaOperacao?: string | null;
  cedenteContaBancaria?: string | null;
  validacaoTemRecebiveis?: boolean;
  validacaoTemSacados?: boolean;
  validacaoTemGarantiasAtivas?: boolean;
  validacaoValorOperacaoPositivo?: boolean;
  validacaoValorFaceCompativel?: boolean;
  validacaoCedenteInformado?: boolean;
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
type GarantiaListDto = {
  id: string;
  codigoInterno: string;
  titulo: string;
  statusJuridico: number;
  valorElegivelDisponivel: number;
  valorAlocadoAtivo: number;
  createdAt: string;
};

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'operacao', label: 'Operação' },
  { key: 'recebiveis', label: 'Recebíveis' },
  { key: 'sacados', label: 'Sacados' },
  { key: 'garantias', label: 'Garantias' },
  { key: 'anexos', label: 'Anexos' },
  { key: 'observacoes', label: 'Observações' },
  { key: 'historico', label: 'Histórico' },
];

const formatMoney = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(value) ? value : 0);
const formatPercent = (value?: number | null, digits = 2) => (typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(digits)}%` : '-');
const valueOrDash = (value?: unknown) => {
  if (value === null || value === undefined) return '-';
  const text = String(value).trim();
  return text.length > 0 ? text : '-';
};

export const OperationFormPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState<TabKey>('operacao');
  const [loading, setLoading] = useState(true);

  const [operacao, setOperacao] = useState<OperacaoDto | null>(null);
  const [recebiveisPaged, setRecebiveisPaged] = useState<PagedResponse<OperacaoRecebivelDto>>({ items: [], page: 1, pageSize: 20, totalItems: 0, totalPages: 1 });
  const [sacados, setSacados] = useState<OperacaoSacadoDto[]>([]);
  const [garantiasVinculadas, setGarantiasVinculadas] = useState<GarantiaListDto[]>([]);
  const [garantiasDisponiveis, setGarantiasDisponiveis] = useState<GarantiaListDto[]>([]);
  const [anexos, setAnexos] = useState<CadastroArquivoDto[]>([]);
  const [observacoes, setObservacoes] = useState<CadastroObservacaoDto[]>([]);
  const [historicoPaged, setHistoricoPaged] = useState<PagedResponse<OperacaoHistoricoDto>>({ items: [], page: 1, pageSize: 20, totalItems: 0, totalPages: 1 });

  const [observacaoTexto, setObservacaoTexto] = useState('');
  const [anexoFile, setAnexoFile] = useState<File | null>(null);
  const [sacadoId, setSacadoId] = useState('');
  const [sacadosOptions, setSacadosOptions] = useState<SacadoOption[]>([]);
  const [garantiaId, setGarantiaId] = useState('');
  const [garantiaValorAlocado, setGarantiaValorAlocado] = useState('');

  const canLoad = Boolean(id);

  useEffect(() => {
    const initialTab = (location.state as { initialTab?: TabKey } | null)?.initialTab;
    if (initialTab && tabs.some((tab) => tab.key === initialTab)) {
      setActiveTab(initialTab);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

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

  const loadGarantias = useCallback(async () => {
    if (!id) return;

    const [vinculadasResponse, todasResponse] = await Promise.all([
      http.get('/cadastros/garantias', {
        params: { page: 1, pageSize: 200, operacaoId: id, sortBy: 'codigoInterno', sortDir: 'asc' },
      }),
      http.get('/cadastros/garantias', {
        params: { page: 1, pageSize: 200, sortBy: 'codigoInterno', sortDir: 'asc' },
      }),
    ]);

    const vinculadas = readPagedResponse<GarantiaListDto>(vinculadasResponse.data).items ?? [];
    const todas = readPagedResponse<GarantiaListDto>(todasResponse.data).items ?? [];
    const vinculadasIds = new Set(vinculadas.map((item) => item.id));

    setGarantiasVinculadas(vinculadas);
    setGarantiasDisponiveis(todas.filter((item) => !vinculadasIds.has(item.id) && item.valorElegivelDisponivel > 0));
    setGarantiaId((current) => (current && !vinculadasIds.has(current) ? current : ''));
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
      await Promise.all([loadOperacao(), loadRecebiveis(1), loadSacados(), loadGarantias(), loadAnexos(), loadObservacoes(), loadHistorico(1), loadSacadosOptions()]);
    } finally {
      setLoading(false);
    }
  }, [canLoad, loadOperacao, loadRecebiveis, loadSacados, loadGarantias, loadAnexos, loadObservacoes, loadHistorico, loadSacadosOptions]);

  useEffect(() => {
    void loadAll().catch((error) => toast.error(getErrorMessage(error)));
  }, [loadAll]);

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

  const onVincularGarantia = async () => {
    if (!id || !operacao) return;
    if (!garantiaId) {
      toast.error('Selecione uma garantia para vincular.');
      return;
    }

    const selectedGarantia = garantiasDisponiveis.find((item) => item.id === garantiaId);
    const valorAlocado = Number(garantiaValorAlocado);
    if (!Number.isFinite(valorAlocado) || valorAlocado <= 0) {
      toast.error('Informe um valor alocado válido.');
      return;
    }

    if (selectedGarantia && valorAlocado > selectedGarantia.valorElegivelDisponivel) {
      toast.error('Valor alocado maior que o elegível disponível da garantia.');
      return;
    }

    try {
      await http.post(`/cadastros/garantias/${garantiaId}/alocacoes`, {
        operacaoId: id,
        tipoAlocacao: GarantiaTipoAlocacao.ValorFixo,
        percentualAlocado: null,
        valorAlocado,
        exposicaoReferencia: Number(operacao.valor ?? 0),
        dataAlocacao: new Date().toISOString().slice(0, 10),
        status: GarantiaStatusAlocacao.Ativa,
      });
      toast.success('Garantia vinculada à operação.');
      setGarantiaId('');
      setGarantiaValorAlocado('');
      await loadGarantias();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const activeSacadoIds = useMemo(() => new Set(sacados.map((item) => item.sacadoId).filter(Boolean)), [sacados]);
  const garantiaLinkResumo = garantiasVinculadas.length > 0
    ? `${garantiasVinculadas.length} garantia(s) vinculada(s).`
    : 'Nenhuma garantia vinculada.';
  const operationStatusTone = String(operacao?.status ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const validacoesGraficos = useMemo(() => {
    const groups = [
      {
        label: 'Cedente',
        rules: [Boolean(operacao?.validacaoCedenteInformado)],
      },
      {
        label: 'Operação',
        rules: [Boolean(operacao?.validacaoValorOperacaoPositivo), Boolean(operacao?.validacaoValorFaceCompativel)],
      },
      {
        label: 'Recebíveis',
        rules: [Boolean(operacao?.validacaoTemRecebiveis)],
      },
      {
        label: 'Sacados',
        rules: [Boolean(operacao?.validacaoTemSacados)],
      },
      {
        label: 'Garantias',
        rules: [Boolean(operacao?.validacaoTemGarantiasAtivas)],
      },
    ];

    return groups.map((group) => {
      const total = group.rules.length;
      const ok = group.rules.filter(Boolean).length;
      const percent = total > 0 ? Math.round((ok / total) * 100) : 0;
      return { label: group.label, ok, total, percent };
    });
  }, [operacao]);

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
      subtitle="Paridade com legado: Operação, Recebíveis, Sacados, Garantias, Anexos, Observações e Histórico."
      actions={<button className="btn-muted" onClick={() => navigate('/operacoes')}>Voltar para lista</button>}
    >
      {loading ? <div className="entity-loading">Carregando operação...</div> : null}

      {operacao ? (
        <>
          <section className="operation-legacy-header">
            <article className="operation-legacy-card operation-card-main">
              <header className="operation-card-title-row">
                <div>
                  <span className="operation-card-kicker">Capa da operação</span>
                  <h2>OPERAÇÃO: {operacao.numero}</h2>
                </div>
                <span className={`operation-status-pill is-${operationStatusTone}`}>{valueOrDash(operacao.status)}</span>
              </header>
              <div className="operation-card-content operation-card-content-main">
                <p className="operation-card-value-highlight">{formatMoney(operacao.valor ?? 0)}</p>
                <div className="operation-card-data-grid">
                  <p><strong>Cedente</strong><span>{valueOrDash(operacao.cedenteNome)}</span></p>
                  <p><strong>CNPJ</strong><span>{valueOrDash(operacao.cedenteCnpjCpf)}</span></p>
                  <p><strong>Modalidade</strong><span>{valueOrDash(operacao.modalidade)}</span></p>
                  <p><strong>Data criação</strong><span>{formatDateTime(operacao.createdAt)}</span></p>
                  <p><strong>Data operação</strong><span>{operacao.dataOperacao ? formatDateTime(operacao.dataOperacao) : '-'}</span></p>
                  <p><strong>Status</strong><span>{valueOrDash(operacao.status)}</span></p>
                </div>
              </div>
              {operacao.hasLastro ? <p className="legacy-disclaimer">*Operação lastreada.</p> : null}
            </article>

            <article className="operation-legacy-card operation-card-summary">
              <header className="operation-card-title-row">
                <div>
                  <span className="operation-card-kicker">Resumo</span>
                  <h3>Dados</h3>
                </div>
              </header>
              <div className="operation-card-content">
                <p><strong>Recebíveis</strong><span>{operacao.quantidadeRecebiveis ?? recebiveisPaged.totalItems}</span></p>
                <p><strong>Documentos</strong><span>{operacao.quantidadeRecebiveis ?? recebiveisPaged.totalItems}</span></p>
                <p><strong>Sacados</strong><span>{operacao.quantidadeSacados ?? sacados.length}</span></p>
                <p><strong>Garantias</strong><span>{garantiasVinculadas.length}</span></p>
              </div>
            </article>

            <article className="operation-legacy-card operation-card-trace">
              <header className="operation-card-title-row">
                <div>
                  <span className="operation-card-kicker">Rastreabilidade</span>
                  <h3>Informações</h3>
                </div>
              </header>
              <div className="operation-card-content">
                <p><strong>Aberto por</strong><span>{valueOrDash(operacao.abertoPorEmail)}</span></p>
                <p><strong>Fechado por</strong><span>{valueOrDash(operacao.fechadoPorEmail)}</span></p>
                <p><strong>Agente</strong><span>{valueOrDash(operacao.agenteNome)}</span></p>
              </div>
            </article>
          </section>

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
              <section className="operation-cover-legacy-grid">
                <article className="entity-card operation-cover-card">
                  <header><h3>Dados da Operação</h3></header>
                  <div className="operation-cover-list">
                    <p><strong>Valor de Face</strong><span>{formatMoney(Number(operacao.valorFace ?? operacao.valorTotalRecebiveis ?? 0))}</span></p>
                    <p><strong>Deságio</strong><span>{formatMoney(Number(operacao.desagio ?? 0))}</span></p>
                    <p><strong>Taxa</strong><span>{formatPercent(operacao.taxa, 4)}</span></p>
                    <p><strong>Float</strong><span>{operacao.float ?? '-'}</span></p>
                    <p><strong>Fee - Terceiros ({formatPercent(operacao.feeTerceirosPercentual)})</strong><span>{formatMoney(Number(operacao.feeTerceirosCalculado ?? 0))}</span></p>
                    <p><strong>Prazo Médio</strong><span>{operacao.prazoMedioDias ? `${operacao.prazoMedioDias} dias` : '-'}</span></p>
                    <p><strong>ROA</strong><span>{formatPercent(operacao.roa, 4)}</span></p>
                    <p><strong>CET</strong><span>{formatPercent(operacao.cet, 4)}</span></p>
                  </div>
                </article>

                <article className="entity-card operation-cover-card">
                  <header><h3>Dados do Cedente</h3></header>
                  <div className="operation-cover-list">
                    <p><strong>Nome</strong><span>{valueOrDash(operacao.cedenteNome)}</span></p>
                    <p><strong>CNPJ</strong><span>{valueOrDash(operacao.cedenteCnpjCpf)}</span></p>
                    <p><strong>Modalidade</strong><span>{valueOrDash(operacao.modalidade)}</span></p>
                    <p><strong>Limite Total</strong><span>{formatMoney(Number(operacao.cedenteLimiteTotal ?? 0))}</span></p>
                    <p><strong>Tranche Modalidade</strong><span>{formatMoney(Number(operacao.cedenteTrancheModalidade ?? 0))}</span></p>
                    <p><strong>Valores em Aberto</strong><span>{formatMoney(Number(operacao.cedenteValoresEmAberto ?? 0))}</span></p>
                    <p><strong>Primeira Operação</strong><span>{operacao.cedentePrimeiraOperacao ? formatDateTime(operacao.cedentePrimeiraOperacao) : '-'}</span></p>
                    <p><strong>Última Operação</strong><span>{operacao.cedenteUltimaOperacao ? formatDateTime(operacao.cedenteUltimaOperacao) : '-'}</span></p>
                    <p><strong>Conta Bancária</strong><span>{valueOrDash(operacao.cedenteContaBancaria)}</span></p>
                  </div>
                </article>

                <article className="entity-card operation-cover-card">
                  <header><h3>Validações</h3></header>
                  <div className="operation-validation-gauges">
                    {validacoesGraficos.map((gauge) => (
                      <article key={gauge.label} className="operation-validation-gauge">
                        <div
                          className="operation-validation-ring"
                          style={{ background: `conic-gradient(#20a8d8 ${gauge.percent}%, #dde6f6 ${gauge.percent}% 100%)` }}
                        >
                          <span>{gauge.percent}%</span>
                        </div>
                        <h4>{gauge.label}</h4>
                        <small>{gauge.ok}/{gauge.total} regras</small>
                      </article>
                    ))}
                  </div>
                </article>
              </section>

              <section className={`entity-card operation-guarantee-highlight ${garantiasVinculadas.length > 0 ? 'is-linked' : 'is-unlinked'}`}>
                <h4>Vínculo com Garantias</h4>
                <p>{garantiaLinkResumo}</p>
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

          {activeTab === 'garantias' ? (
            <section className="entity-form-stack">
              <section className="entity-card">
                <header><h3>Vincular garantia à operação</h3></header>
                <div className="entity-grid cols-3">
                  <label>
                    <span>Garantia disponível</span>
                    <select value={garantiaId} onChange={(event) => setGarantiaId(event.target.value)}>
                      <option value="">Selecione</option>
                      {garantiasDisponiveis.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.codigoInterno} - {item.titulo}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Valor alocado</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={garantiaValorAlocado}
                      onChange={(event) => setGarantiaValorAlocado(event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Exposição da operação</span>
                    <input value={formatMoney(Number(operacao.valor ?? 0))} readOnly />
                  </label>
                </div>
                <div className="entity-actions">
                  <button type="button" className="btn-main" onClick={() => void onVincularGarantia()}>
                    Vincular garantia
                  </button>
                  <button type="button" className="btn-muted" onClick={() => void loadGarantias()}>
                    Recarregar lista
                  </button>
                </div>
              </section>

              <section className="entity-card">
                <header><h3>Garantias já vinculadas</h3></header>
                <div className="entity-table-wrap">
                  <table>
                    <thead><tr><th>Código</th><th>Título</th><th>Status</th><th>Valor já alocado</th><th>Data cadastro</th></tr></thead>
                    <tbody>
                      {garantiasVinculadas.map((item) => (
                        <tr key={item.id}>
                          <td>{item.codigoInterno}</td>
                          <td>{item.titulo}</td>
                          <td>{garantiaStatusJuridicoLabel[item.statusJuridico as GarantiaStatusJuridico] ?? item.statusJuridico}</td>
                          <td>{formatMoney(item.valorAlocadoAtivo)}</td>
                          <td>{formatDateTime(item.createdAt)}</td>
                        </tr>
                      ))}
                      {garantiasVinculadas.length === 0 ? <tr><td colSpan={5}>Nenhuma garantia vinculada a esta operação.</td></tr> : null}
                    </tbody>
                  </table>
                </div>
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
