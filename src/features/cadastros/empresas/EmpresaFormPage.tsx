import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getErrorMessage, http } from '../../../shared/api/http';
import { PageFrame } from '../../../shared/ui/PageFrame';
import {
  applyCpfCnpjMask,
  applyPhoneMask,
  formatDateTime,
  isValidCpfCnpj,
  isValidPhone,
  readPagedResponse,
  sanitizeDocument,
  type CadastroArquivoDto,
  type CadastroObservacaoDto,
  type HistoricoItemDto,
} from '../cadastroCommon';
import '../cadastro.css';
import '../administradoras/entity-form.css';

type TabKey = 'cadastro' | 'parametrizacao' | 'anexos' | 'observacoes' | 'historico';

type FormState = {
  nome: string;
  documento: string;
  email: string;
  telefone: string;
  cidade: string;
  uf: string;
  ativo: boolean;
};

type ModalidadeDto = { id: string; nome: string; codigo: string; ativo: boolean };
type ParamForm = Record<string, string | boolean>;
type MetricInputKind = 'currency' | 'percentage' | 'decimal' | 'integer' | 'text';

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'cadastro', label: 'Cadastro' },
  { key: 'parametrizacao', label: 'Parametrização' },
  { key: 'anexos', label: 'Anexos' },
  { key: 'observacoes', label: 'Observações' },
  { key: 'historico', label: 'Histórico' },
];

const numericDecimalKeys = [
  'limite', 'tranche', 'float', 'fator', 'feeTerceiros',
  'multaBaixa', 'multaBaixaCheque', 'multaRecompra', 'encargoBaixa', 'encargoBaixaCheque', 'encargoRecompra',
  'prorrogacao', 'tarifaProrrogacao', 'tarifaRecompra', 'antecipacao', 'tarifaAntecipacao',
  'taxaMinima', 'taxaMaxima', 'limiteMinimoSacado', 'limiteMaximoSacado',
] as const;
const numericIntKeys = ['prazoMinimo', 'prazoMaximo', 'tipoBanco'] as const;
const stringNullableKeys = ['fidcParametrizacaoCalculoId', 'contaCobrancaPadraoId', 'meioRecebimentoPadrao', 'classificacaoId'] as const;
const currencyMetricKeys = ['limite', 'tranche', 'tarifaProrrogacao', 'tarifaAntecipacao', 'tarifaRecompra', 'limiteMinimoSacado', 'limiteMaximoSacado'] as const;
const percentageMetricKeys = ['fator', 'feeTerceiros', 'taxaMinima', 'taxaMaxima', 'multaBaixa', 'multaBaixaCheque', 'multaRecompra', 'encargoBaixa', 'encargoBaixaCheque', 'encargoRecompra', 'prorrogacao', 'antecipacao'] as const;
const decimalMetricKeys = ['float'] as const;

const receivedTypeFlags: Array<{ key: string; label: string }> = [
  { key: 'isDuplicata', label: 'Duplicata (DP)' },
  { key: 'isNotaPromissoria', label: 'Nota Promissória (NP)' },
  { key: 'isNotaDeSeguro', label: 'Nota de Seguro (NS)' },
  { key: 'isCobrancaSeriada', label: 'Cobrança Seriada (CS)' },
  { key: 'isPedidoDeVenda', label: 'Recibo - Pedido de Venda' },
  { key: 'isRecibo', label: 'Recibo (RCB)' },
  { key: 'isNotaPromissoriaFisica', label: 'Nota Promissória Física (NPF)' },
  { key: 'isNotaComercial', label: 'Nota Comercial (NC)' },
  { key: 'isLetrasCombio', label: 'Letras de Câmbio (LCC)' },
  { key: 'isNotaDebito', label: 'Nota de Débito (ND)' },
  { key: 'isDuplicataServico', label: 'Duplicata de Serviços (DS)' },
  { key: 'isPrecatorios', label: 'Precatórios (PCT)' },
  { key: 'isDuplicataServicoFisico', label: 'Duplicata de Serviço Físico (DSF)' },
  { key: 'isDuplicataTransporteDigital', label: 'Duplicata Transporte Digital (DTD)' },
  { key: 'isDuplicataTransporteFisica', label: 'Duplicata Transporte Física (DTF)' },
  { key: 'isRenegociacaoDivida', label: 'Renegociação de Dívida (RD)' },
  { key: 'isNotaComercial3', label: 'Nota Comercial 3' },
  { key: 'isCcbDigital', label: 'CCB Digital' },
  { key: 'isCheque', label: 'Cheque' },
  { key: 'isChequeManual', label: 'Cheque Manual' },
  { key: 'isCteDigital', label: 'CTE Digital' },
  { key: 'isCedulaProdutoRural', label: 'Cédula Produto Rural' },
  { key: 'isContratoNormal', label: 'Contrato (CT)' },
  { key: 'isContrato', label: 'Contrato Físico (CTF)' },
  { key: 'isConfissaoDivida', label: 'Confissão de Dívida' },
  { key: 'isAssuncaoDivida', label: 'Assunção de Dívida' },
  { key: 'isOperacaoCartaoCredito', label: 'Operação Cartão de Crédito' },
  { key: 'isOperacaoCartaoCreditoLimine', label: 'Operação Cartão de Crédito - Limine' },
  { key: 'isCcbPreDigital', label: 'CCB Pré-Digital' },
  { key: 'isCcbPreBalcao', label: 'CCB Pré-Balcão' },
  { key: 'isCcbPreCetip', label: 'CCB Pré-Cetip' },
  { key: 'isOutros', label: 'Outros' },
  { key: 'isCcbFormalizacaoFonada', label: 'CCB Formalização Fonada' },
  { key: 'isNotaComercial2', label: 'Nota Comercial 2' },
  { key: 'isCreditosJudiciais', label: 'Créditos Judiciais' },
  { key: 'isCcb2', label: 'CCB 2' },
  { key: 'isCedulaProdutoRuralFinanceira', label: 'Cédula Produto Rural Financeira' },
  { key: 'isCheque2', label: 'Cheque 2' },
  { key: 'isOutro', label: 'Outro' },
];

const receiveMediumFlags: Array<{ key: string; label: string }> = [
  { key: 'isBoletoNormal', label: 'Boleto Normal' },
  { key: 'isBoletoEspecial', label: 'Boleto Especial' },
  { key: 'isContaEscrow', label: 'Conta Escrow' },
  { key: 'isDeposito', label: 'Depósito' },
  { key: 'isChequeCustodia', label: 'Cheque Custódia' },
  { key: 'isCartaoCredito', label: 'Cartão de Crédito' },
];

const allBooleanFlags = [
  'habilitado',
  ...receivedTypeFlags.map((x) => x.key),
  ...receiveMediumFlags.map((x) => x.key),
] as const;

const metricLabels: Array<{ key: string; label: string; kind: MetricInputKind }> = [
  { key: 'limite', label: 'Limite', kind: 'currency' },
  { key: 'tranche', label: 'Tranche', kind: 'currency' },
  { key: 'float', label: 'Float', kind: 'decimal' },
  { key: 'fator', label: 'Taxa (Fator %)', kind: 'percentage' },
  { key: 'feeTerceiros', label: 'Fee Terceiros (%)', kind: 'percentage' },
  { key: 'taxaMinima', label: 'Taxa Mínima (%)', kind: 'percentage' },
  { key: 'taxaMaxima', label: 'Taxa Máxima (%)', kind: 'percentage' },
  { key: 'prazoMinimo', label: 'Prazo Mínimo (dias)', kind: 'integer' },
  { key: 'prazoMaximo', label: 'Prazo Máximo (dias)', kind: 'integer' },
  { key: 'tarifaProrrogacao', label: 'Tarifa Prorrogação', kind: 'currency' },
  { key: 'tarifaAntecipacao', label: 'Tarifa Antecipação', kind: 'currency' },
  { key: 'tarifaRecompra', label: 'Tarifa Recompra', kind: 'currency' },
  { key: 'multaBaixa', label: 'Multa Baixa', kind: 'percentage' },
  { key: 'multaBaixaCheque', label: 'Multa Baixa Cheque', kind: 'percentage' },
  { key: 'multaRecompra', label: 'Multa Recompra', kind: 'percentage' },
  { key: 'encargoBaixa', label: 'Encargo Baixa', kind: 'percentage' },
  { key: 'encargoBaixaCheque', label: 'Encargo Baixa Cheque', kind: 'percentage' },
  { key: 'encargoRecompra', label: 'Encargo Recompra', kind: 'percentage' },
  { key: 'prorrogacao', label: 'Prorrogação (%)', kind: 'percentage' },
  { key: 'antecipacao', label: 'Antecipação (%)', kind: 'percentage' },
  { key: 'limiteMinimoSacado', label: 'Limite Mínimo Sacado', kind: 'currency' },
  { key: 'limiteMaximoSacado', label: 'Limite Máximo Sacado', kind: 'currency' },
  { key: 'fidcParametrizacaoCalculoId', label: 'FIDC Parametrização Cálculo ID', kind: 'text' },
  { key: 'contaCobrancaPadraoId', label: 'Conta Cobrança Padrão ID', kind: 'text' },
  { key: 'meioRecebimentoPadrao', label: 'Meio Recebimento Padrão', kind: 'text' },
  { key: 'tipoBanco', label: 'Tipo Banco', kind: 'integer' },
  { key: 'classificacaoId', label: 'Classificação ID', kind: 'text' },
];

const buildDefaultParamForm = (): ParamForm => {
  const form: ParamForm = { modalidadeId: '' };
  numericDecimalKeys.forEach((key) => {
    form[key] = '';
  });
  numericIntKeys.forEach((key) => {
    form[key] = '';
  });
  stringNullableKeys.forEach((key) => {
    form[key] = '';
  });
  allBooleanFlags.forEach((key) => {
    form[key] = false;
  });
  return form;
};

const percentageMetricSet = new Set<string>(percentageMetricKeys as readonly string[]);
const currencyMetricSet = new Set<string>(currencyMetricKeys as readonly string[]);
const decimalMetricSet = new Set<string>(decimalMetricKeys as readonly string[]);

const brCurrencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const brDecimalFormatter = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 4 });

const clampPercentage = (value: number) => Math.min(99.9999, Math.max(0, value));

const parseDecimal = (value: string) => {
  if (!value.trim()) return null;
  const normalized = value
    .replace(/R\$\s?/g, '')
    .replace('%', '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseInteger = (value: string) => {
  if (!value.trim()) return null;
  const parsed = Number.parseInt(value.replace(/\D/g, ''), 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatCurrencyFromNumber = (value: number | null | undefined) => (value === null || value === undefined ? '' : brCurrencyFormatter.format(value));
const formatPercentageFromNumber = (value: number | null | undefined) => (value === null || value === undefined ? '' : `${brDecimalFormatter.format(clampPercentage(value))}%`);
const formatDecimalFromNumber = (value: number | null | undefined) => (value === null || value === undefined ? '' : brDecimalFormatter.format(value));

const maskCurrencyInput = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  return brCurrencyFormatter.format(Number(digits) / 100);
};

const maskPercentageInput = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  const numeric = clampPercentage(Number(digits) / 10000);
  return `${brDecimalFormatter.format(numeric)}%`;
};

const maskDecimalInput = (value: string) => {
  const sanitized = value.replace(/[^\d,.-]/g, '').replace(',', '.');
  if (!sanitized) return '';
  const parsed = Number(sanitized);
  if (!Number.isFinite(parsed)) return '';
  return brDecimalFormatter.format(parsed);
};

const maskIntegerInput = (value: string) => value.replace(/\D/g, '');

export const EmpresaFormPage = () => {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const cadastroId = params.id;
  const isEdit = !!cadastroId;

  const [loading, setLoading] = useState<boolean>(isEdit);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('cadastro');
  const [form, setForm] = useState<FormState>({
    nome: '',
    documento: '',
    email: '',
    telefone: '',
    cidade: '',
    uf: '',
    ativo: true,
  });
  const [anexosRows, setAnexosRows] = useState<CadastroArquivoDto[]>([]);
  const [anexoFile, setAnexoFile] = useState<File | null>(null);
  const [observacoesRows, setObservacoesRows] = useState<CadastroObservacaoDto[]>([]);
  const [textoObservacao, setTextoObservacao] = useState('');
  const [historicoPaged, setHistoricoPaged] = useState({
    items: [] as HistoricoItemDto[],
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 1,
  });
  const [modalidades, setModalidades] = useState<ModalidadeDto[]>([]);
  const [parametrizacoes, setParametrizacoes] = useState<any[]>([]);
  const [parametrizacaoId, setParametrizacaoId] = useState<string | null>(null);
  const [parametrizacaoForm, setParametrizacaoForm] = useState<ParamForm>(buildDefaultParamForm);
  const [savingParametrizacao, setSavingParametrizacao] = useState(false);

  const canAccessSubTabs = isEdit;

  const loadSubTabs = async (id: string) => {
    const [anexosRes, observacoesRes, historicoRes, modalidadesRes, parametrizacaoRes] = await Promise.all([
      http.get(`/cadastros/empresas/${id}/anexos`),
      http.get(`/cadastros/empresas/${id}/observacoes`),
      http.get(`/cadastros/empresas/${id}/historico`, { params: { page: 1, pageSize: 20 } }),
      http.get('/cadastros/modalidades', { params: { page: 1, pageSize: 200 } }),
      http.get(`/cadastros/empresas/${id}/parametrizacao`),
    ]);

    setAnexosRows((anexosRes.data as CadastroArquivoDto[]) ?? []);
    setObservacoesRows((observacoesRes.data as CadastroObservacaoDto[]) ?? []);
    setHistoricoPaged(readPagedResponse<HistoricoItemDto>(historicoRes.data));
    const modalidadesPaged = readPagedResponse<ModalidadeDto>(modalidadesRes.data);
    setModalidades(modalidadesPaged.items.filter((item) => item.ativo));
    setParametrizacoes((parametrizacaoRes.data as any[]) ?? []);
  };

  const loadHistorico = async (id: string, page: number) => {
    const historicoRes = await http.get(`/cadastros/empresas/${id}/historico`, {
      params: { page, pageSize: historicoPaged.pageSize },
    });
    setHistoricoPaged(readPagedResponse<HistoricoItemDto>(historicoRes.data));
  };

  const reloadParametrizacao = async (id: string) => {
    const [modalidadesRes, parametrizacaoRes] = await Promise.all([
      http.get('/cadastros/modalidades', { params: { page: 1, pageSize: 200 } }),
      http.get(`/cadastros/empresas/${id}/parametrizacao`),
    ]);
    const modalidadesPaged = readPagedResponse<ModalidadeDto>(modalidadesRes.data);
    setModalidades(modalidadesPaged.items.filter((item) => item.ativo));
    setParametrizacoes((parametrizacaoRes.data as any[]) ?? []);
  };

  useEffect(() => {
    const bootstrap = async () => {
      if (!cadastroId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await http.get(`/cadastros/empresas/${cadastroId}`);
        const item = response.data as any;
        setForm({
          nome: item.nome ?? '',
          documento: applyCpfCnpjMask(item.documento ?? ''),
          email: item.email ?? '',
          telefone: applyPhoneMask(item.telefone ?? ''),
          cidade: item.cidade ?? '',
          uf: item.uf ?? '',
          ativo: item.ativo,
        });
        await loadSubTabs(cadastroId);
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, [cadastroId]);

  useEffect(() => {
    if (!cadastroId || activeTab !== 'historico') return;
    void loadHistorico(cadastroId, historicoPaged.page);
  }, [cadastroId, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const ensureValidForm = () => {
    if (!form.nome.trim()) {
      toast.error('Informe o nome da empresa.');
      return false;
    }
    if (!isValidCpfCnpj(form.documento)) {
      toast.error('Informe um CPF/CNPJ válido.');
      return false;
    }
    if (form.telefone.trim() && !isValidPhone(form.telefone)) {
      toast.error('Informe um telefone válido com DDD.');
      return false;
    }
    return true;
  };

  const onSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!ensureValidForm()) return;

    setSaving(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        documento: sanitizeDocument(form.documento),
        email: form.email.trim() || null,
        telefone: form.telefone.trim() || null,
        cidade: form.cidade.trim() || null,
        uf: form.uf.trim() || null,
        ativo: form.ativo,
      };

      if (cadastroId) {
        await http.put(`/cadastros/empresas/${cadastroId}`, payload);
        toast.success('Empresa atualizada.');
      } else {
        const response = await http.post('/cadastros/empresas', payload);
        const created = response.data as { id: string };
        toast.success('Empresa criada.');
        navigate(`/cadastro/empresas/${created.id}`, { replace: true });
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const currentTitle = useMemo(() => (isEdit ? `Empresa: ${form.nome || 'Editar'}` : 'Nova Empresa'), [isEdit, form.nome]);

  const changeTab = (key: TabKey) => {
    if (!canAccessSubTabs && key !== 'cadastro') {
      toast('Salve a empresa para liberar as abas complementares.');
      return;
    }
    setActiveTab(key);
  };

  const applyParametrizacao = (item: any) => {
    const next = buildDefaultParamForm();
    next.modalidadeId = String(item.modalidadeId ?? '');
    allBooleanFlags.forEach((key) => {
      next[key] = Boolean(item[key]);
    });
    numericDecimalKeys.forEach((key) => {
      const value = item[key];
      if (value === null || value === undefined) {
        next[key] = '';
        return;
      }
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) {
        next[key] = '';
        return;
      }
      if (currencyMetricSet.has(key)) {
        next[key] = formatCurrencyFromNumber(parsed);
      } else if (percentageMetricSet.has(key)) {
        next[key] = formatPercentageFromNumber(parsed);
      } else if (decimalMetricSet.has(key)) {
        next[key] = formatDecimalFromNumber(parsed);
      } else {
        next[key] = String(value);
      }
    });
    numericIntKeys.forEach((key) => {
      const value = item[key];
      next[key] = value === null || value === undefined ? '' : String(value);
    });
    stringNullableKeys.forEach((key) => {
      next[key] = item[key] ?? '';
    });
    setParametrizacaoId(String(item.id));
    setParametrizacaoForm(next);
  };

  const changeModalidade = (modalidadeId: string) => {
    const existing = parametrizacoes.find((item) => item.modalidadeId === modalidadeId);
    if (existing) {
      applyParametrizacao(existing);
      return;
    }
    setParametrizacaoId(null);
    const next = buildDefaultParamForm();
    next.modalidadeId = modalidadeId;
    setParametrizacaoForm(next);
  };

  const buildPayload = () => {
    const payload: Record<string, unknown> = {
      modalidadeId: parametrizacaoForm.modalidadeId,
    };
    allBooleanFlags.forEach((key) => {
      payload[key] = Boolean(parametrizacaoForm[key]);
    });
    numericDecimalKeys.forEach((key) => {
      const parsed = parseDecimal(String(parametrizacaoForm[key] ?? ''));
      payload[key] = parsed === null ? null : percentageMetricSet.has(key) ? clampPercentage(parsed) : parsed;
    });
    numericIntKeys.forEach((key) => {
      payload[key] = parseInteger(String(parametrizacaoForm[key] ?? ''));
    });
    stringNullableKeys.forEach((key) => {
      const value = String(parametrizacaoForm[key] ?? '').trim();
      payload[key] = value || null;
    });
    return payload;
  };

  const updateMetricValue = (key: string, kind: MetricInputKind, rawValue: string) => {
    let nextValue = rawValue;
    if (kind === 'currency') nextValue = maskCurrencyInput(rawValue);
    if (kind === 'percentage') nextValue = maskPercentageInput(rawValue);
    if (kind === 'decimal') nextValue = maskDecimalInput(rawValue);
    if (kind === 'integer') nextValue = maskIntegerInput(rawValue);
    setParametrizacaoForm((c) => ({ ...c, [key]: nextValue }));
  };

  const saveParametrizacao = async () => {
    if (!cadastroId) return;
    if (!String(parametrizacaoForm.modalidadeId || '')) {
      toast.error('Selecione uma modalidade.');
      return;
    }

    setSavingParametrizacao(true);
    try {
      const payload = buildPayload();
      if (parametrizacaoId) {
        await http.put(`/cadastros/empresas/${cadastroId}/parametrizacao/${parametrizacaoId}`, payload);
        toast.success('Parametrização atualizada.');
      } else {
        const response = await http.post(`/cadastros/empresas/${cadastroId}/parametrizacao`, payload);
        const created = response.data as { id: string };
        setParametrizacaoId(created.id);
        toast.success('Parametrização criada.');
      }
      await reloadParametrizacao(cadastroId);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSavingParametrizacao(false);
    }
  };

  const removeParametrizacao = async (item: any) => {
    if (!cadastroId || !window.confirm(`Remover parametrização de '${item.modalidadeNome}'?`)) return;
    try {
      await http.delete(`/cadastros/empresas/${cadastroId}/parametrizacao/${item.id}`);
      await reloadParametrizacao(cadastroId);
      if (String(parametrizacaoId) === String(item.id)) {
        setParametrizacaoId(null);
        setParametrizacaoForm(buildDefaultParamForm());
      }
      toast.success('Parametrização removida.');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const renderCadastroTab = () => (
    <form className="entity-form-stack" onSubmit={onSave}>
      <section className="entity-card">
        <header>
          <h3>Dados Cadastrais</h3>
          <p>Cadastro principal em tela inteira com conceito de abas do legado.</p>
        </header>
        <div className="entity-grid cols-3">
          <label><span>Nome</span><input value={form.nome} onChange={(event) => setForm((c) => ({ ...c, nome: event.target.value }))} required /></label>
          <label><span>CPF/CNPJ</span><input value={form.documento} onChange={(event) => setForm((c) => ({ ...c, documento: applyCpfCnpjMask(event.target.value) }))} required /></label>
          <label className="checkbox-inline"><input type="checkbox" checked={form.ativo} onChange={(event) => setForm((c) => ({ ...c, ativo: event.target.checked }))} /><span>Registro ativo</span></label>
          <label><span>E-mail</span><input type="email" value={form.email} onChange={(event) => setForm((c) => ({ ...c, email: event.target.value }))} /></label>
          <label><span>Telefone</span><input value={form.telefone} onChange={(event) => setForm((c) => ({ ...c, telefone: applyPhoneMask(event.target.value) }))} /></label>
          <label><span>Cidade</span><input value={form.cidade} onChange={(event) => setForm((c) => ({ ...c, cidade: event.target.value }))} /></label>
          <label><span>UF</span><input maxLength={2} value={form.uf} onChange={(event) => setForm((c) => ({ ...c, uf: event.target.value.toUpperCase() }))} /></label>
        </div>
      </section>
      <div className="entity-actions">
        <button type="button" className="btn-muted" onClick={() => navigate('/cadastro/empresas')}>Voltar</button>
        <button type="submit" className="btn-main" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
      </div>
    </form>
  );

  const renderParametrizacaoTab = () => (
    <section className="entity-card entity-form-stack">
      <header>
        <h3>Parametrização</h3>
        <p>Configuração completa por modalidade, incluindo tipos de recebível e meios de recebimento.</p>
      </header>
      <div className="entity-grid cols-3">
        <label>
          <span>Modalidade</span>
          <select value={String(parametrizacaoForm.modalidadeId)} onChange={(event) => changeModalidade(event.target.value)}>
            <option value="">Selecione...</option>
            {modalidades.map((item) => <option key={item.id} value={item.id}>{item.nome} ({item.codigo})</option>)}
          </select>
        </label>
        <label className="checkbox-inline">
          <input type="checkbox" checked={Boolean(parametrizacaoForm.habilitado)} onChange={(event) => setParametrizacaoForm((c) => ({ ...c, habilitado: event.target.checked }))} />
          <span>Habilitado</span>
        </label>
      </div>
      <section className="entity-card">
        <header><h3>Parâmetros</h3></header>
        <div className="entity-grid cols-3">
          {metricLabels.map((item) => (
            <label key={item.key}>
              <span>{item.label}</span>
              <input
                value={String(parametrizacaoForm[item.key] ?? '')}
                inputMode={item.kind === 'text' ? 'text' : 'decimal'}
                onChange={(event) => updateMetricValue(item.key, item.kind, event.target.value)}
              />
            </label>
          ))}
        </div>
      </section>
      <section className="entity-card">
        <header><h3>Tipos de Recebível</h3></header>
        <div className="entity-grid cols-3">
          {receivedTypeFlags.map((item) => (
            <label className="checkbox-grid-item" key={item.key}>
              <input type="checkbox" checked={Boolean(parametrizacaoForm[item.key])} onChange={(event) => setParametrizacaoForm((c) => ({ ...c, [item.key]: event.target.checked }))} />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
      </section>
      <section className="entity-card">
        <header><h3>Meios de Recebimento</h3></header>
        <div className="entity-grid cols-3">
          {receiveMediumFlags.map((item) => (
            <label className="checkbox-grid-item" key={item.key}>
              <input type="checkbox" checked={Boolean(parametrizacaoForm[item.key])} onChange={(event) => setParametrizacaoForm((c) => ({ ...c, [item.key]: event.target.checked }))} />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
      </section>
      <div className="entity-actions">
        <button className="btn-main" type="button" onClick={() => void saveParametrizacao()} disabled={savingParametrizacao}>
          {savingParametrizacao ? 'Salvando...' : 'Salvar parametrização'}
        </button>
      </div>
      <section className="entity-table-wrap">
        <table>
          <thead><tr><th>Modalidade</th><th>Habilitado</th><th>Limite</th><th>Taxa Min/Max</th><th className="col-actions">Ações</th></tr></thead>
          <tbody>
            {parametrizacoes.map((item) => (
              <tr key={item.id}>
                <td>{item.modalidadeNome}</td>
                <td>{item.habilitado ? 'Sim' : 'Não'}</td>
                <td>{item.limite ?? '-'}</td>
                <td>{item.taxaMinima ?? '-'} / {item.taxaMaxima ?? '-'}</td>
                <td className="col-actions">
                  <div className="table-actions">
                    <button type="button" className="ghost" onClick={() => applyParametrizacao(item)}>Editar</button>
                    <button type="button" className="danger" onClick={() => void removeParametrizacao(item)}>Remover</button>
                  </div>
                </td>
              </tr>
            ))}
            {parametrizacoes.length === 0 ? <tr><td colSpan={5}>Nenhuma parametrização cadastrada.</td></tr> : null}
          </tbody>
        </table>
      </section>
    </section>
  );

  const addAnexo = async () => {
    if (!cadastroId || !anexoFile) {
      toast.error('Selecione um arquivo.');
      return;
    }
    try {
      const data = new FormData();
      data.append('file', anexoFile);
      await http.post(`/cadastros/empresas/${cadastroId}/anexos`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setAnexoFile(null);
      await loadSubTabs(cadastroId);
      toast.success('Anexo incluído.');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const removeAnexo = async (anexoId: string) => {
    if (!cadastroId || !window.confirm('Remover anexo?')) return;
    try {
      await http.delete(`/cadastros/empresas/${cadastroId}/anexos/${anexoId}`);
      await loadSubTabs(cadastroId);
      toast.success('Anexo removido.');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const addObservacao = async () => {
    if (!cadastroId || !textoObservacao.trim()) return;
    try {
      await http.post(`/cadastros/empresas/${cadastroId}/observacoes`, { texto: textoObservacao.trim() });
      setTextoObservacao('');
      await loadSubTabs(cadastroId);
      toast.success('Observação adicionada.');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const removeObservacao = async (observacaoId: string) => {
    if (!cadastroId || !window.confirm('Remover observação?')) return;
    try {
      await http.delete(`/cadastros/empresas/${cadastroId}/observacoes/${observacaoId}`);
      await loadSubTabs(cadastroId);
      toast.success('Observação removida.');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const renderAnexosTab = () => (
    <section className="entity-card entity-form-stack">
      <header><h3>Anexos</h3></header>
      <div className="entity-grid cols-3">
        <label><span>Arquivo</span><input type="file" onChange={(event) => setAnexoFile(event.target.files?.[0] ?? null)} /></label>
        <button type="button" className="btn-main" onClick={() => void addAnexo()}>Enviar anexo</button>
      </div>
      <section className="entity-table-wrap">
        <table>
          <thead><tr><th>Arquivo</th><th>Tipo</th><th>Tamanho</th><th>Data</th><th className="col-actions">Ações</th></tr></thead>
          <tbody>
            {anexosRows.map((item) => (
              <tr key={item.id}>
                <td>{item.nomeArquivo}</td><td>{item.contentType}</td><td>{item.tamanhoBytes}</td><td>{formatDateTime(item.createdAt)}</td>
                <td className="col-actions"><div className="table-actions"><button type="button" className="danger" onClick={() => void removeAnexo(item.id)}>Remover</button></div></td>
              </tr>
            ))}
            {anexosRows.length === 0 ? <tr><td colSpan={5}>Nenhum anexo cadastrado.</td></tr> : null}
          </tbody>
        </table>
      </section>
    </section>
  );

  const renderObservacoesTab = () => (
    <section className="entity-card entity-form-stack">
      <header><h3>Observações</h3></header>
      <div className="entity-grid cols-3">
        <label style={{ gridColumn: 'span 2' }}><span>Nova observação</span><input value={textoObservacao} onChange={(event) => setTextoObservacao(event.target.value)} /></label>
        <button type="button" className="btn-main" onClick={() => void addObservacao()}>Adicionar</button>
      </div>
      <section className="entity-table-wrap">
        <table>
          <thead><tr><th>Texto</th><th>Autor</th><th>Data</th><th className="col-actions">Ações</th></tr></thead>
          <tbody>
            {observacoesRows.map((item) => (
              <tr key={item.id}>
                <td>{item.texto}</td><td>{item.autorEmail || '-'}</td><td>{formatDateTime(item.createdAt)}</td>
                <td className="col-actions"><div className="table-actions"><button type="button" className="danger" onClick={() => void removeObservacao(item.id)}>Remover</button></div></td>
              </tr>
            ))}
            {observacoesRows.length === 0 ? <tr><td colSpan={4}>Nenhuma observação cadastrada.</td></tr> : null}
          </tbody>
        </table>
      </section>
    </section>
  );

  const renderHistoricoTab = () => (
    <section className="entity-card entity-form-stack">
      <header><h3>Histórico</h3></header>
      <div className="entity-table-wrap">
        <table>
          <thead><tr><th>Ação</th><th>Entidade</th><th>Usuário</th><th>Data</th></tr></thead>
          <tbody>
            {historicoPaged.items.map((item) => (
              <tr key={item.id}>
                <td>{item.acao}</td><td>{item.entidade}</td><td>{item.userEmail || '-'}</td><td>{formatDateTime(item.createdAt)}</td>
              </tr>
            ))}
            {historicoPaged.items.length === 0 ? <tr><td colSpan={4}>Sem eventos para esta empresa.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderCurrentTab = () => {
    switch (activeTab) {
      case 'cadastro':
        return renderCadastroTab();
      case 'parametrizacao':
        return renderParametrizacaoTab();
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
      subtitle={isEdit ? 'Cadastro completo em tela cheia, com parametrização por modalidade.' : 'Novo cadastro de empresa.'}
      actions={<button className="btn-muted" onClick={() => navigate('/cadastro/empresas')}>Voltar para listagem</button>}
    >
      <div className="entity-meta-bar">
        <span><strong>Status:</strong> {form.ativo ? 'Ativo' : 'Inativo'}</span>
        <span><strong>Documento:</strong> {form.documento || '-'}</span>
      </div>

      <div className="entity-tabs" role="tablist" aria-label="Abas de cadastro da empresa">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            className={`entity-tab-btn ${activeTab === tab.key ? 'is-active' : ''}`}
            disabled={!canAccessSubTabs && tab.key !== 'cadastro'}
            onClick={() => changeTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? <div className="entity-loading">Carregando cadastro...</div> : renderCurrentTab()}
    </PageFrame>
  );
};
