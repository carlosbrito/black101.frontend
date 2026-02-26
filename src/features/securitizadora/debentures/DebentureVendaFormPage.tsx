import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getErrorMessage, http } from '../../../shared/api/http';
import type { PagedResponse } from '../../../shared/types/paging';
import { PageFrame } from '../../../shared/ui/PageFrame';
import { formatCpfCnpj, isValidCpfCnpj, readPagedResponse, sanitizeDocument } from '../../cadastros/cadastroCommon';
import {
  DebentureStatusVenda,
  debentureModoResgateLabel,
  debentureStatusResgateLabel,
  debentureTipoResgateLabel,
  type DebentureComprovanteDto,
  type DebentureEmissaoListDto,
  type DebentureResgateDto,
  type DebentureSerieDto,
  type DebentureVendaDto,
  type DebentureVendaRendimentoDiarioDto,
  type DebentureVendaRendimentoPagedResponse,
  type DebentureVendaRendimentoResumoDto,
} from './types';
import '../../cadastros/cadastro.css';
import '../../cadastros/administradoras/entity-form.css';

type VendaFormState = {
  debentureEmissaoId: string;
  debentureSerieId: string;
  investidorNome: string;
  investidorDocumento: string;
  quantidadeVendida: string;
  valorUnitario: string;
  dataVenda: string;
  status: DebentureStatusVenda;
};

const emptyForm: VendaFormState = {
  debentureEmissaoId: '',
  debentureSerieId: '',
  investidorNome: '',
  investidorDocumento: '',
  quantidadeVendida: '',
  valorUnitario: '',
  dataVenda: '',
  status: DebentureStatusVenda.Ativa,
};

const toDateInput = (value?: string | null) => (value ? value.slice(0, 10) : '');
const toTodayDateInput = () => {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
};

const toDecimal = (value: string) => {
  if (!value.trim()) return 0;
  const normalized = value.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const decimalFormatter = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 6 });
const formatDecimalDisplay = (value?: number | string | null) => {
  if (value === null || value === undefined || value === '') return '';
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return '';
  return decimalFormatter.format(parsed);
};

const factorFormatter = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 6, maximumFractionDigits: 10 });
const formatFactor = (value?: number | null) => factorFormatter.format(Number(value ?? 0));

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('pt-BR');
};

const getWeekdayLabel = (value?: string | null) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('pt-BR', { weekday: 'long' });
};

const isWeekendDate = (value?: string | null) => {
  if (!value) return false;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  const day = parsed.getDay();
  return day === 0 || day === 6;
};

type InvestidorRow = {
  id: string;
  nome: string;
  documento?: string | null;
  ativo: boolean;
};

type VendaTabKey = 'dados' | 'rendimentos' | 'resgates';

const timelinePageSize = 50;

const normalizeTimelineResumo = (value: unknown): DebentureVendaRendimentoResumoDto | null => {
  if (!value || typeof value !== 'object') return null;
  const src = value as Record<string, unknown>;
  return {
    rendimentoAcumulado: Number(src.rendimentoAcumulado ?? src.RendimentoAcumulado ?? 0),
    valorIrAcumulado: Number(src.valorIrAcumulado ?? src.ValorIrAcumulado ?? 0),
    valorIofAcumulado: Number(src.valorIofAcumulado ?? src.ValorIofAcumulado ?? 0),
    principalAtual: Number(src.principalAtual ?? src.PrincipalAtual ?? 0),
    ultimaDataProcessada: String(src.ultimaDataProcessada ?? src.UltimaDataProcessada ?? '') || null,
  };
};

const normalizeTimelineRows = (value: unknown): DebentureVendaRendimentoDiarioDto[] => {
  if (!Array.isArray(value)) return [];

  return value.map((item) => {
    const src = item as Record<string, unknown>;
    return {
      dataReferencia: String(src.dataReferencia ?? src.DataReferencia ?? ''),
      principalAbertura: Number(src.principalAbertura ?? src.PrincipalAbertura ?? 0),
      fatorCdiUtilizado: Number(src.fatorCdiUtilizado ?? src.FatorCdiUtilizado ?? 0),
      fatorAplicado: Number(src.fatorAplicado ?? src.FatorAplicado ?? 0),
      rendimentoDia: Number(src.rendimentoDia ?? src.RendimentoDia ?? 0),
      rendimentoAcumulado: Number(src.rendimentoAcumulado ?? src.RendimentoAcumulado ?? 0),
      valorIrAcumulado: Number(src.valorIrAcumulado ?? src.ValorIrAcumulado ?? 0),
      valorIofAcumulado: Number(src.valorIofAcumulado ?? src.ValorIofAcumulado ?? 0),
      principalFechamento: Number(src.principalFechamento ?? src.PrincipalFechamento ?? 0),
      isSinteticoDiaVenda: Boolean(src.isSinteticoDiaVenda ?? src.IsSinteticoDiaVenda ?? false),
    };
  });
};

export const DebentureVendaFormPage = () => {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const vendaId = params.id;
  const isEdit = !!vendaId;

  const [loading, setLoading] = useState<boolean>(isEdit);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState<VendaFormState>(() => ({ ...emptyForm, dataVenda: isEdit ? '' : toTodayDateInput() }));
  const [emissoes, setEmissoes] = useState<DebentureEmissaoListDto[]>([]);
  const [series, setSeries] = useState<DebentureSerieDto[]>([]);
  const [comprovante, setComprovante] = useState<DebentureComprovanteDto | null>(null);
  const [investidores, setInvestidores] = useState<InvestidorRow[]>([]);
  const [investidoresLoading, setInvestidoresLoading] = useState(false);
  const [selectedInvestidorId, setSelectedInvestidorId] = useState('');
  const [quantidadeDisponivelParaVenda, setQuantidadeDisponivelParaVenda] = useState(0);
  const [activeTab, setActiveTab] = useState<VendaTabKey>('dados');
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineRows, setTimelineRows] = useState<DebentureVendaRendimentoDiarioDto[]>([]);
  const [timelinePage, setTimelinePage] = useState(1);
  const [timelineTotalItems, setTimelineTotalItems] = useState(0);
  const [timelineTotalPages, setTimelineTotalPages] = useState(1);
  const [timelineResumo, setTimelineResumo] = useState<DebentureVendaRendimentoResumoDto | null>(null);
  const [resgatesLoading, setResgatesLoading] = useState(false);
  const [resgates, setResgates] = useState<DebentureResgateDto[]>([]);

  const loadEmissoes = async () => {
    try {
      const response = await http.get<PagedResponse<DebentureEmissaoListDto>>('/securitizadora/debentures/emissoes', {
        params: { page: 1, pageSize: 200, sortBy: 'numero', sortDir: 'asc' },
      });
      setEmissoes(response.data.items ?? []);
    } catch {
      setEmissoes([]);
    }
  };

  const loadSeries = async (selectedEmissaoId: string, preferredSerieId?: string) => {
    if (!selectedEmissaoId) {
      setSeries([]);
      return;
    }

    try {
      const response = await http.get<DebentureSerieDto[]>(`/securitizadora/debentures/emissoes/${selectedEmissaoId}/series`);
      const list = response.data ?? [];
      setSeries(list);

      if (!preferredSerieId && list.length > 0 && !isEdit) {
        setForm((prev) => ({ ...prev, debentureSerieId: list[0].id }));
      }
    } catch {
      setSeries([]);
    }
  };

  const loadInvestidores = async () => {
    setInvestidoresLoading(true);
    try {
      const response = await http.get('/cadastros/investidores', {
        params: {
          page: 1,
          pageSize: 100,
        },
      });
      const paged = readPagedResponse<InvestidorRow>(response.data);
      setInvestidores((paged.items ?? []).filter((item) => item.ativo));
    } catch {
      setInvestidores([]);
    } finally {
      setInvestidoresLoading(false);
    }
  };

  const loadTimeline = async (pageToLoad: number) => {
    if (!vendaId) return;

    setTimelineLoading(true);
    try {
      const response = await http.get<DebentureVendaRendimentoPagedResponse>(`/securitizadora/debentures/vendas/${vendaId}/rendimentos`, {
        params: {
          page: pageToLoad,
          pageSize: timelinePageSize,
          sortBy: 'data',
          sortDir: 'asc',
        },
      });

      const data = response.data as unknown as Record<string, unknown>;
      setTimelineRows(normalizeTimelineRows(data.items ?? data.Items));
      setTimelineTotalItems(Number(data.totalItems ?? data.TotalItems ?? 0));
      setTimelineTotalPages(Number(data.totalPages ?? data.TotalPages ?? 1));
      setTimelineResumo(normalizeTimelineResumo(data.resumo ?? data.Resumo));
    } catch (error) {
      toast.error(getErrorMessage(error));
      setTimelineRows([]);
      setTimelineTotalItems(0);
      setTimelineTotalPages(1);
      setTimelineResumo(null);
    } finally {
      setTimelineLoading(false);
    }
  };

  const loadResgates = async () => {
    if (!vendaId) return;

    setResgatesLoading(true);
    try {
      const response = await http.get<DebentureResgateDto[]>(`/securitizadora/debentures/vendas/${vendaId}/resgates`);
      setResgates(response.data ?? []);
    } catch (error) {
      toast.error(getErrorMessage(error));
      setResgates([]);
    } finally {
      setResgatesLoading(false);
    }
  };

  useEffect(() => {
    void loadEmissoes();
  }, []);

  useEffect(() => {
    void loadInvestidores();
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      if (!vendaId) return;

      setLoading(true);
      try {
        const response = await http.get<DebentureVendaDto>(`/securitizadora/debentures/vendas/${vendaId}`);
        const venda = response.data;
        setForm({
          debentureEmissaoId: venda.debentureEmissaoId,
          debentureSerieId: venda.debentureSerieId,
          investidorNome: venda.investidorNome,
          investidorDocumento: venda.investidorDocumento,
          quantidadeVendida: String(venda.quantidadeVendida),
          valorUnitario: formatDecimalDisplay(venda.valorUnitario),
          dataVenda: toDateInput(venda.dataVenda),
          status: venda.status,
        });
        setQuantidadeDisponivelParaVenda(venda.quantidadeDisponivelParaVenda ?? 0);

        if (venda.comprovanteNumero) {
          setComprovante({
            id: venda.id,
            numero: venda.comprovanteNumero,
            tipo: 'VENDA',
            enviadoCertificadora: venda.comprovanteEnviadoCertificadora,
          });
        }

        await loadSeries(venda.debentureEmissaoId, venda.debentureSerieId);
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isEdit) return;
    void loadSeries(form.debentureEmissaoId);
  }, [form.debentureEmissaoId, isEdit]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isEdit) return;
    const selectedSerie = series.find((item) => item.id === form.debentureSerieId);
    setForm((prev) => ({ ...prev, valorUnitario: selectedSerie ? formatDecimalDisplay(selectedSerie.valorUnitario) : '' }));
  }, [series, form.debentureSerieId, isEdit]);

  useEffect(() => {
    if (!isEdit || !vendaId || activeTab !== 'rendimentos') return;
    void loadTimeline(timelinePage);
  }, [isEdit, vendaId, activeTab, timelinePage]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isEdit || !vendaId || activeTab !== 'resgates') return;
    void loadResgates();
  }, [isEdit, vendaId, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedInvestidorId || !form.investidorNome || !form.investidorDocumento) {
      return;
    }

    const match = investidores.find(
      (item) => item.nome === form.investidorNome && sanitizeDocument(item.documento ?? '') === sanitizeDocument(form.investidorDocumento),
    );
    if (match) {
      setSelectedInvestidorId(match.id);
    }
  }, [investidores, selectedInvestidorId, form.investidorNome, form.investidorDocumento]);

  const ensureValid = () => {
    if (!form.debentureEmissaoId) {
      toast.error('Selecione a emissão.');
      return false;
    }

    if (!form.debentureSerieId) {
      toast.error('Selecione a série.');
      return false;
    }

    if (!form.investidorNome.trim()) {
      toast.error('Informe o nome do investidor.');
      return false;
    }

    if (!isValidCpfCnpj(form.investidorDocumento)) {
      toast.error('Informe um CPF/CNPJ válido para o investidor.');
      return false;
    }

    if (!isEdit && Number(form.quantidadeVendida) <= 0) {
      toast.error('Informe a quantidade vendida.');
      return false;
    }

    if (toDecimal(form.valorUnitario) <= 0) {
      toast.error('Informe o valor unitário.');
      return false;
    }

    if (!form.dataVenda) {
      toast.error('Informe a data da venda.');
      return false;
    }

    return true;
  };

  const onSave = async (event: FormEvent) => {
    event.preventDefault();

    if (!ensureValid()) return;

    setSaving(true);
    try {
      if (isEdit && vendaId) {
        await http.put(`/securitizadora/debentures/vendas/${vendaId}`, {
          investidorNome: form.investidorNome.trim(),
          investidorDocumento: sanitizeDocument(form.investidorDocumento),
          valorUnitario: toDecimal(form.valorUnitario),
          dataVenda: form.dataVenda,
          status: Number(form.status),
        });

        toast.success('Venda atualizada.');
      } else {
        const response = await http.post<{ id: string }>('/securitizadora/debentures/vendas', {
          debentureEmissaoId: form.debentureEmissaoId,
          debentureSerieId: form.debentureSerieId,
          investidorNome: form.investidorNome.trim(),
          investidorDocumento: sanitizeDocument(form.investidorDocumento),
          quantidadeVendida: Number(form.quantidadeVendida),
          valorUnitario: toDecimal(form.valorUnitario),
          dataVenda: form.dataVenda,
          status: Number(form.status),
        });

        toast.success('Venda criada.');
        navigate(`/securitizadora/debentures/vendas/${response.data.id}`, { replace: true });
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const runComprovanteAction = async (action: 'gerar' | 'enviar') => {
    if (!vendaId) {
      toast.error('Salve a venda antes de gerar comprovante.');
      return;
    }

    setSending(true);
    try {
      const response = action === 'gerar'
        ? await http.post<DebentureComprovanteDto>(`/securitizadora/debentures/vendas/${vendaId}/comprovante/gerar`)
        : await http.post<DebentureComprovanteDto>(`/securitizadora/debentures/vendas/${vendaId}/comprovante/enviar-certificadora`, { provedor: 'UR' });

      setComprovante(response.data);
      toast.success(action === 'gerar' ? 'Comprovante gerado.' : 'Comprovante enviado para certificadora.');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSending(false);
    }
  };

  const valorTotalVenda = useMemo(() => {
    const quantidade = Number(form.quantidadeVendida);
    const valorUnitario = toDecimal(form.valorUnitario);

    if (!Number.isFinite(quantidade) || !Number.isFinite(valorUnitario)) {
      return 0;
    }

    return quantidade * valorUnitario;
  }, [form.quantidadeVendida, form.valorUnitario]);

  if (loading) {
    return (
      <PageFrame title="Cadastro de Venda" subtitle="Carregando dados...">
        <div className="entity-loading">Carregando venda...</div>
      </PageFrame>
    );
  }

  return (
    <PageFrame
      title={isEdit ? `Venda: ${form.investidorNome || 'Editar'}` : 'Nova Venda de Debêntures'}
      subtitle="Cadastro em tela cheia para venda, comprovante e envio para certificadora."
      actions={<Link className="btn-muted" to="/securitizadora/debentures/vendas">Voltar para listagem</Link>}
    >
      {isEdit ? (
        <div className="entity-tabs" role="tablist" aria-label="Abas da venda">
          <button type="button" className={`entity-tab-btn ${activeTab === 'dados' ? 'is-active' : ''}`} onClick={() => setActiveTab('dados')}>
            Dados da Venda
          </button>
          <button type="button" className={`entity-tab-btn ${activeTab === 'rendimentos' ? 'is-active' : ''}`} onClick={() => setActiveTab('rendimentos')}>
            Rendimento Diário
          </button>
          <button type="button" className={`entity-tab-btn ${activeTab === 'resgates' ? 'is-active' : ''}`} onClick={() => setActiveTab('resgates')}>
            Resgate
          </button>
        </div>
      ) : null}

      {!isEdit || activeTab === 'dados' ? (
        <form className="entity-form-stack" onSubmit={onSave}>
          <section className="entity-card">
            <header>
              <h3>Dados da Venda</h3>
              <p>Preencha os dados principais da venda de debêntures.</p>
            </header>

            {isEdit ? (
              <div className="entity-meta-bar">
                <span><strong>Unidades Disponíveis para Venda:</strong> {Number(quantidadeDisponivelParaVenda ?? 0).toLocaleString('pt-BR')}</span>
              </div>
            ) : null}

            <div className="entity-grid cols-3">
              <label>
                <span>Emissão</span>
                <select
                  value={form.debentureEmissaoId}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      debentureEmissaoId: event.target.value,
                      debentureSerieId: '',
                      valorUnitario: '',
                    }))
                  }
                  disabled={isEdit}
                  required
                >
                  <option value="">Selecione</option>
                  {emissoes.map((item) => (
                    <option key={item.id} value={item.id}>{item.numeroEmissao} - {item.nomeEmissao}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>Série</span>
                <select
                  value={form.debentureSerieId}
                  onChange={(event) => setForm((prev) => ({ ...prev, debentureSerieId: event.target.value }))}
                  disabled={isEdit}
                  required
                >
                  <option value="">Selecione</option>
                  {series.map((serie) => (
                    <option key={serie.id} value={serie.id}>{serie.codigoSerie}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>Investidor</span>
                <select
                  value={selectedInvestidorId}
                  onChange={(event) => {
                    const nextId = event.target.value;
                    setSelectedInvestidorId(nextId);
                    const selected = investidores.find((item) => item.id === nextId);
                    setForm((prev) => ({
                      ...prev,
                      investidorNome: selected?.nome ?? '',
                      investidorDocumento: sanitizeDocument(selected?.documento ?? ''),
                    }));
                  }}
                  required={!isEdit}
                >
                  <option value="">
                    {investidoresLoading ? 'Carregando...' : isEdit && form.investidorNome ? `Atual: ${form.investidorNome}` : 'Selecione'}
                  </option>
                  {investidores.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nome}
                      {item.documento ? ` (${formatCpfCnpj(item.documento)})` : ''}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Quantidade Vendida</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.quantidadeVendida}
                  onChange={(event) => setForm((prev) => ({ ...prev, quantidadeVendida: event.target.value }))}
                  disabled={isEdit}
                  required
                />
              </label>

              <label>
                <span>Valor Unitário</span>
                <input type="text" value={form.valorUnitario} readOnly required />
              </label>

              <label>
                <span>Data da Venda</span>
                <input type="date" value={form.dataVenda} onChange={(event) => setForm((prev) => ({ ...prev, dataVenda: event.target.value }))} required />
              </label>

              <label>
                <span>Valor Total da Venda</span>
                <input value={formatCurrency(valorTotalVenda)} readOnly />
              </label>
            </div>
          </section>

          {isEdit ? (
            <section className="entity-card">
              <header>
                <h3>Comprovante de Venda</h3>
                <p>Gerar comprovante e enviar para certificadora (quando necessário).</p>
              </header>

              <div className="entity-meta-bar">
                <span><strong>Número:</strong> {comprovante?.numero ?? '-'}</span>
                <span><strong>Enviado:</strong> {comprovante?.enviadoCertificadora ? 'Sim' : 'Não'}</span>
              </div>

              <div className="entity-actions">
                <button type="button" className="btn-muted" onClick={() => void runComprovanteAction('gerar')} disabled={sending}>
                  Gerar Comprovante
                </button>
                <button type="button" className="btn-main" onClick={() => void runComprovanteAction('enviar')} disabled={sending}>
                  Enviar para Certificadora
                </button>
              </div>
            </section>
          ) : null}

          <div className="entity-actions">
            <button type="button" className="btn-muted" onClick={() => navigate('/securitizadora/debentures/vendas')}>Cancelar</button>
            <button type="submit" className="btn-main" disabled={saving}>{saving ? 'Salvando...' : 'Salvar Venda'}</button>
          </div>
        </form>
      ) : null}

      {isEdit && activeTab === 'rendimentos' ? (
        <div className="entity-form-stack">
          <section className="entity-card">
            <header>
              <h3>Resumo Atual</h3>
              <p>Consolidado do rendimento da venda até a última atualização processada.</p>
            </header>

            <div className="entity-grid cols-3">
              <label>
                <span>Rendimento Acumulado</span>
                <input value={formatCurrency(timelineResumo?.rendimentoAcumulado ?? 0)} readOnly />
              </label>
              <label>
                <span>Valor IR Acumulado</span>
                <input value={formatCurrency(timelineResumo?.valorIrAcumulado ?? 0)} readOnly />
              </label>
              <label>
                <span>Valor IOF Acumulado</span>
                <input value={formatCurrency(timelineResumo?.valorIofAcumulado ?? 0)} readOnly />
              </label>
              <label>
                <span>Principal Atual</span>
                <input value={formatCurrency(timelineResumo?.principalAtual ?? 0)} readOnly />
              </label>
              <label>
                <span>Última Data Processada</span>
                <input value={formatDate(timelineResumo?.ultimaDataProcessada)} readOnly />
              </label>
              <label>
                <span>Registros</span>
                <input value={`${timelineTotalItems} item(ns)`} readOnly />
              </label>
            </div>
          </section>

          <section className="entity-card">
            <header>
              <h3>Histórico Diário</h3>
              <p>Evolução diária do rendimento desde o primeiro dia da venda.</p>
            </header>

            <div className="entity-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Dia da Semana</th>
                    <th>Principal Abertura</th>
                    <th>Fator CDI</th>
                    <th>Fator Aplicado</th>
                    <th>Rendimento Dia</th>
                    <th>Rendimento Acumulado</th>
                    <th>IR Acumulado</th>
                    <th>IOF Acumulado</th>
                    <th>Principal Fechamento</th>
                    <th>Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  {timelineLoading ? (
                    <tr>
                      <td colSpan={11}>Carregando histórico de rendimento...</td>
                    </tr>
                  ) : timelineRows.length === 0 ? (
                    <tr>
                      <td colSpan={11}>Nenhum rendimento diário encontrado para esta venda.</td>
                    </tr>
                  ) : (
                    timelineRows.map((item, index) => (
                      <tr
                        key={`${item.dataReferencia}-${index}`}
                        style={isWeekendDate(item.dataReferencia) ? { background: '#fff8e6' } : undefined}
                      >
                        <td>{formatDate(item.dataReferencia)}</td>
                        <td>
                          {getWeekdayLabel(item.dataReferencia)}
                          {isWeekendDate(item.dataReferencia) ? ' (fim de semana)' : ''}
                        </td>
                        <td>{formatCurrency(item.principalAbertura)}</td>
                        <td>{formatFactor(item.fatorCdiUtilizado)}</td>
                        <td>{formatFactor(item.fatorAplicado)}</td>
                        <td>{formatCurrency(item.rendimentoDia)}</td>
                        <td>{formatCurrency(item.rendimentoAcumulado)}</td>
                        <td>{formatCurrency(item.valorIrAcumulado)}</td>
                        <td>{formatCurrency(item.valorIofAcumulado)}</td>
                        <td>{formatCurrency(item.principalFechamento)}</td>
                        <td>{item.isSinteticoDiaVenda ? 'Dia da venda' : 'Processado'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="entity-actions" style={{ justifyContent: 'space-between' }}>
              <span>Página {timelinePage} de {timelineTotalPages} (50 por página)</span>
              <div style={{ display: 'flex', gap: '0.45rem' }}>
                <button
                  type="button"
                  className="btn-muted"
                  disabled={timelineLoading || timelinePage <= 1}
                  onClick={() => setTimelinePage((current) => Math.max(1, current - 1))}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  className="btn-main"
                  disabled={timelineLoading || timelinePage >= timelineTotalPages}
                  onClick={() => setTimelinePage((current) => Math.min(timelineTotalPages, current + 1))}
                >
                  Próxima
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {isEdit && activeTab === 'resgates' ? (
        <div className="entity-form-stack">
          <section className="entity-card">
            <header>
              <h3>Resgates da Debênture</h3>
              <p>Detalhes dos resgates efetuados para esta venda.</p>
            </header>

            <div className="entity-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Modo</th>
                    <th>Tipo</th>
                    <th>Quantidade</th>
                    <th>Valor Resgate</th>
                    <th>Rendimento</th>
                    <th>IR</th>
                    <th>IOF</th>
                    <th>Status</th>
                    <th>Comprovante</th>
                  </tr>
                </thead>
                <tbody>
                  {resgatesLoading ? (
                    <tr>
                      <td colSpan={10}>Carregando resgates...</td>
                    </tr>
                  ) : resgates.length === 0 ? (
                    <tr>
                      <td colSpan={10}>Nenhum resgate encontrado para esta venda.</td>
                    </tr>
                  ) : (
                    resgates.map((item) => (
                      <tr key={item.id}>
                        <td>{formatDate(item.dataSolicitacao)}</td>
                        <td>{debentureModoResgateLabel[item.modoResgate] ?? '-'}</td>
                        <td>{debentureTipoResgateLabel[item.tipoResgate] ?? '-'}</td>
                        <td>{item.quantidadeResgatada.toLocaleString('pt-BR')}</td>
                        <td>{formatCurrency(item.valorResgateMonetario)}</td>
                        <td>{formatCurrency(item.valorRendimento)}</td>
                        <td>{formatCurrency(item.valorIr)}</td>
                        <td>{formatCurrency(item.valorIof)}</td>
                        <td>{debentureStatusResgateLabel[item.status] ?? '-'}</td>
                        <td>{item.comprovanteNumero ?? '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}
    </PageFrame>
  );
};
