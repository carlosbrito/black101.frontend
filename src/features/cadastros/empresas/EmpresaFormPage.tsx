import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
import {
  LegacyAssociationType,
  createLegacyObservation,
  listLegacyAttachments,
  listLegacyHistory,
  listLegacyObservations,
  removeLegacyAttachment,
  removeLegacyObservation,
  uploadLegacyAttachment,
} from '../legacySubtabApi';
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
  segmentoEmpresa: string;
  ativo: boolean;
};

type PessoaDto = {
  id?: string;
  nome?: string | null;
  cnpjCpf?: string | null;
  email?: string | null;
  telefone?: string | null;
  cidade?: string | null;
  uf?: string | null;
  ativo?: boolean;
};

type FIDCLoadedDto = Record<string, unknown> & {
  id?: string | null;
  pessoaId?: string | null;
  pessoa?: PessoaDto | null;
  nome?: string | null;
  documento?: string | null;
  cnpjCpf?: string | null;
  email?: string | null;
  telefone?: string | null;
  cidade?: string | null;
  uf?: string | null;
  ativo?: boolean;
  segmentoEmpresa?: string | number | null;
  segmento?: string | number | null;
  fidcParametrizacoes?: unknown;
  parametrizacoes?: unknown;
  parametrizacao?: unknown;
  items?: unknown;
  records?: unknown;
};

type ModalidadeDto = { id: string; nome: string; codigo: string; ativo: boolean };
type ParamForm = Record<string, string | boolean>;
type MetricInputKind = 'currency' | 'percentage' | 'decimal' | 'integer' | 'text';
type ParametrizacaoItem = Record<string, unknown> & {
  id?: string;
  modalidadeId?: string | null;
  modalidadeNome?: string | null;
  nomeModalidade?: string | null;
};

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'cadastro', label: 'Cadastro' },
  { key: 'parametrizacao', label: 'Parametrização' },
  { key: 'anexos', label: 'Anexos' },
  { key: 'observacoes', label: 'Observações' },
  { key: 'historico', label: 'Histórico' },
];

const segmentoEmpresaOptions = [
  { value: '0', label: 'FIDC' },
  { value: '1', label: 'Securitizadora' },
  { value: '2', label: 'Factoring' },
  { value: '3', label: 'Outros' },
];

const numericDecimalKeys = ['limite', 'tranche', 'float', 'fator', 'feeTerceiros', 'multaBaixa', 'multaBaixaCheque', 'multaRecompra', 'encargoBaixa', 'encargoBaixaCheque', 'encargoRecompra', 'prorrogacao', 'tarifaProrrogacao', 'tarifaRecompra', 'antecipacao', 'tarifaAntecipacao', 'taxaMinima', 'taxaMaxima', 'limiteMinimoSacado', 'limiteMaximoSacado'] as const;
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

const allBooleanFlags = [...receivedTypeFlags.map((x) => x.key), ...receiveMediumFlags.map((x) => x.key)] as const;

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

const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';

const buildDefaultParamForm = (): ParamForm => {
  const form: ParamForm = { modalidadeId: '' };
  numericDecimalKeys.forEach((key) => { form[key] = ''; });
  numericIntKeys.forEach((key) => { form[key] = ''; });
  stringNullableKeys.forEach((key) => { form[key] = ''; });
  allBooleanFlags.forEach((key) => { form[key] = false; });
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
  const normalized = value.replace(/R\$\s?/g, '').replace('%', '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
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
const toText = (value: unknown) => (value === null || value === undefined ? '' : String(value));
const isPresentId = (value: unknown) => typeof value === 'string' && value.trim() !== '' && value !== EMPTY_GUID;
const asRecord = (value: unknown): Record<string, unknown> => (value && typeof value === 'object' ? (value as Record<string, unknown>) : {});

const extractParametrizacoes = (data: unknown): ParametrizacaoItem[] => {
  if (Array.isArray(data)) return data as ParametrizacaoItem[];
  const record = asRecord(data);
  const candidates = [record.fidcParametrizacoes, record.parametrizacoes, record.parametrizacao, record.items, record.records, record.Items, record.Records];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate as ParametrizacaoItem[];
    if (candidate && typeof candidate === 'object') {
      const paged = readPagedResponse<ParametrizacaoItem>(candidate);
      if (paged.items.length > 0) return paged.items;
    }
  }
  return [];
};

const buildPessoaPayload = (form: FormState) => ({
  nome: form.nome.trim(),
  cnpjCpf: sanitizeDocument(form.documento),
  email: form.email.trim() || null,
  telefone: form.telefone.trim() || null,
  cidade: form.cidade.trim() || null,
  uf: form.uf.trim() || null,
  ativo: form.ativo,
});

const buildFidcCreatePayload = (pessoaId: string, form: FormState) => ({
  pessoaId,
  segmentoEmpresa: Number(form.segmentoEmpresa),
  ativo: form.ativo,
});

export const EmpresaFormPage = () => {
  const params = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const cadastroId = params.id;
  const isEdit = !!cadastroId;

  const [loading, setLoading] = useState<boolean>(isEdit);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('cadastro');
  const [form, setForm] = useState<FormState>({ nome: '', documento: '', email: '', telefone: '', cidade: '', uf: '', segmentoEmpresa: '', ativo: true });
  const [personId, setPersonId] = useState<string | null>(null);
  const [anexosRows, setAnexosRows] = useState<CadastroArquivoDto[]>([]);
  const [anexoFile, setAnexoFile] = useState<File | null>(null);
  const [observacoesRows, setObservacoesRows] = useState<CadastroObservacaoDto[]>([]);
  const [textoObservacao, setTextoObservacao] = useState('');
  const [historicoPaged, setHistoricoPaged] = useState({ items: [] as HistoricoItemDto[], page: 1, pageSize: 20, totalItems: 0, totalPages: 1 });
  const [modalidades, setModalidades] = useState<ModalidadeDto[]>([]);
  const [parametrizacoes, setParametrizacoes] = useState<ParametrizacaoItem[]>([]);
  const [parametrizacaoId, setParametrizacaoId] = useState<string | null>(null);
  const [parametrizacaoForm, setParametrizacaoForm] = useState<ParamForm>(buildDefaultParamForm);
  const [savingParametrizacao, setSavingParametrizacao] = useState(false);

  const canAccessSubTabs = isEdit && Boolean(personId);

  const loadReferenceData = async () => {
    const modalidadesRes = await http.get('/cadastros/modalidades', { params: { page: 1, pageSize: 200 } });
    const modalidadesPaged = readPagedResponse<ModalidadeDto>(modalidadesRes.data);
    setModalidades(modalidadesPaged.items.filter((item) => item.ativo));
  };

  const applyPessoaOnForm = (item: FIDCLoadedDto) => {
    const pessoa = asRecord(item.pessoa);
    const resolvedPessoaId = toText(pessoa.id ?? item.pessoaId);
    setPersonId(isPresentId(resolvedPessoaId) ? resolvedPessoaId : null);
    setForm({
      nome: toText(pessoa.nome ?? item.nome),
      documento: applyCpfCnpjMask(toText(pessoa.cnpjCpf ?? item.cnpjCpf ?? item.documento)),
      email: toText(pessoa.email ?? item.email),
      telefone: applyPhoneMask(toText(pessoa.telefone ?? item.telefone)),
      cidade: toText(pessoa.cidade ?? item.cidade),
      uf: toText(pessoa.uf ?? item.uf),
      segmentoEmpresa: toText(item.segmentoEmpresa ?? item.segmento),
      ativo: Boolean(pessoa.ativo ?? item.ativo ?? true),
    });
    setParametrizacoes(extractParametrizacoes(item));
    setParametrizacaoId(null);
    setParametrizacaoForm(buildDefaultParamForm());
    return isPresentId(resolvedPessoaId) ? resolvedPessoaId : null;
  };

  const loadBundle = async (id: string, associationId?: string | null) => {
    const fidcRes = await http.get(`/api/fidc/get/unique/${id}`);
    const resolvedAssociationId = associationId ?? applyPessoaOnForm(fidcRes.data as FIDCLoadedDto) ?? null;
    const anexosPromise = resolvedAssociationId ? listLegacyAttachments(resolvedAssociationId, LegacyAssociationType.FIDC) : Promise.resolve([] as CadastroArquivoDto[]);
    const observacoesPromise = resolvedAssociationId ? listLegacyObservations(resolvedAssociationId, LegacyAssociationType.FIDC) : Promise.resolve([] as CadastroObservacaoDto[]);
    const historicoPromise = resolvedAssociationId ? listLegacyHistory(resolvedAssociationId, LegacyAssociationType.FIDC, 1, 20) : Promise.resolve({ items: [] as HistoricoItemDto[], page: 1, pageSize: 20, totalItems: 0, totalPages: 1 });
    const [anexosRes, observacoesRes, historicoRes] = await Promise.all([anexosPromise, observacoesPromise, historicoPromise, loadReferenceData()]);
    setAnexosRows(anexosRes);
    setObservacoesRows(observacoesRes);
    setHistoricoPaged(historicoRes);
  };

  const loadHistorico = async (associationId: string, page: number) => {
    const historicoRes = await listLegacyHistory(associationId, LegacyAssociationType.FIDC, page, historicoPaged.pageSize);
    setHistoricoPaged(historicoRes);
  };

  useEffect(() => {
    const bootstrap = async () => {
      if (!cadastroId) {
        const documento = sanitizeDocument(searchParams.get('documento') ?? '');
        if (documento) {
          try {
            const pessoaResponse = await http.get<PessoaDto>(`/api/pessoa/get/cnpjcpf/${documento}`, {
              params: { enrichData: false, fazerConsultaPadrao: false, isToGetQSA: false },
            });
            const pessoa = pessoaResponse.data;
            if (isPresentId(pessoa?.id)) {
              setPersonId(pessoa.id ?? null);
              setForm({
                nome: pessoa?.nome ?? '',
                documento: applyCpfCnpjMask(pessoa?.cnpjCpf ?? documento),
                email: pessoa?.email ?? '',
                telefone: applyPhoneMask(pessoa?.telefone ?? ''),
                cidade: pessoa?.cidade ?? '',
                uf: pessoa?.uf ?? '',
                segmentoEmpresa: '',
                ativo: pessoa?.ativo ?? true,
              });
            } else {
              setForm((current) => ({ ...current, documento: applyCpfCnpjMask(documento) }));
            }
          } catch (error) {
            toast.error(getErrorMessage(error));
          }
        }
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        await loadBundle(cadastroId);
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cadastroId, searchParams]);

  useEffect(() => {
    if (!personId || activeTab !== 'historico') return;
    void loadHistorico(personId, historicoPaged.page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personId, activeTab]);

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
    if (!form.segmentoEmpresa) {
      toast.error('Selecione o segmento da empresa.');
      return false;
    }
    return true;
  };

  const upsertPessoa = async () => {
    const document = sanitizeDocument(form.documento);
    const pessoaByDocumentResponse = await http.get<PessoaDto>(`/api/pessoa/get/cnpjcpf/${document}`, {
      params: { enrichData: false, fazerConsultaPadrao: false, isToGetQSA: false },
    });
    const found = pessoaByDocumentResponse.data;
    const foundId = isPresentId(found?.id) ? found?.id ?? null : null;
    const payload = buildPessoaPayload(form);

    if (foundId) {
      await http.put('/api/pessoa/update', { id: foundId, ...payload });
      return foundId;
    }

    const createResponse = await http.post('/api/pessoa/register', payload);
    const created = createResponse.data as Record<string, unknown>;
    const createdId = toText(created.id ?? created.Id ?? '');
    if (!createdId) {
      throw new Error('Não foi possível criar a pessoa.');
    }

    return createdId;
  };

  const buildParametrizacaoPayload = () => {
    const payload: Record<string, unknown> = { modalidadeId: parametrizacaoForm.modalidadeId };
    allBooleanFlags.forEach((key) => { payload[key] = Boolean(parametrizacaoForm[key]); });
    numericDecimalKeys.forEach((key) => {
      const parsed = parseDecimal(String(parametrizacaoForm[key] ?? ''));
      payload[key] = parsed === null ? null : percentageMetricSet.has(key) ? clampPercentage(parsed) : parsed;
    });
    numericIntKeys.forEach((key) => { payload[key] = parseInteger(String(parametrizacaoForm[key] ?? '')); });
    stringNullableKeys.forEach((key) => {
      const value = String(parametrizacaoForm[key] ?? '').trim();
      payload[key] = value || null;
    });
    return payload;
  };

  const replaceParametrizacaoList = (nextItem: ParametrizacaoItem) => {
    const currentId = parametrizacaoId ? String(parametrizacaoId) : '';
    const currentModalidadeId = String(parametrizacaoForm.modalidadeId ?? '');
    const nextList = parametrizacoes.filter((item) => {
      const itemId = String(item.id ?? '');
      const itemModalidadeId = String(item.modalidadeId ?? '');
      return !((currentId && itemId === currentId) || (!currentId && currentModalidadeId && itemModalidadeId === currentModalidadeId));
    });
    nextList.push(nextItem);
    return nextList;
  };

  const applyParametrizacao = (item: ParametrizacaoItem) => {
    const next = buildDefaultParamForm();
    next.modalidadeId = String(item.modalidadeId ?? '');
    allBooleanFlags.forEach((key) => { next[key] = Boolean(item[key]); });
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
      next[key] = item[key] === null || item[key] === undefined ? '' : String(item[key]);
    });
    setParametrizacaoId(String(item.id ?? ''));
    setParametrizacaoForm(next);
  };

  const changeModalidade = (modalidadeId: string) => {
    const existing = parametrizacoes.find((item) => String(item.modalidadeId ?? '') === modalidadeId);
    if (existing) {
      applyParametrizacao(existing);
      return;
    }

    setParametrizacaoId(null);
    const next = buildDefaultParamForm();
    next.modalidadeId = modalidadeId;
    setParametrizacaoForm(next);
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
    if (!cadastroId || !personId) return;
    if (!String(parametrizacaoForm.modalidadeId || '')) {
      toast.error('Selecione uma modalidade.');
      return;
    }

    setSavingParametrizacao(true);
    try {
      const payload = buildParametrizacaoPayload();
      const existing = parametrizacoes.find((item) => {
        const itemId = String(item.id ?? '');
        const itemModalidadeId = String(item.modalidadeId ?? '');
        return (parametrizacaoId && itemId === String(parametrizacaoId)) || itemModalidadeId === String(parametrizacaoForm.modalidadeId);
      });
      const nextItem = { ...(existing ?? {}), ...payload } as ParametrizacaoItem;
      const nextList = replaceParametrizacaoList(nextItem);
      await http.put('/api/fidc/parametrizacao', { id: cadastroId, fidcParametrizacoes: nextList });
      setParametrizacoes(nextList);
      setParametrizacaoId(String(nextItem.id ?? existing?.id ?? ''));
      toast.success('Parametrização atualizada.');
      await loadBundle(cadastroId, personId);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSavingParametrizacao(false);
    }
  };

  const removeParametrizacao = async (item: ParametrizacaoItem) => {
    if (!cadastroId || !personId || !window.confirm(`Remover parametrização de '${item.modalidadeNome ?? item.nomeModalidade ?? item.modalidadeId ?? 'modalidade'}'?`)) {
      return;
    }

    try {
      const nextList = parametrizacoes.filter((current) => {
        const currentId = String(current.id ?? '');
        const currentModalidadeId = String(current.modalidadeId ?? '');
        return !(currentId && currentId === String(item.id ?? '')) && currentModalidadeId !== String(item.modalidadeId ?? '');
      });

      await http.put('/api/fidc/parametrizacao', { id: cadastroId, fidcParametrizacoes: nextList });
      setParametrizacoes(nextList);
      if (String(parametrizacaoId) === String(item.id ?? '')) {
        setParametrizacaoId(null);
        setParametrizacaoForm(buildDefaultParamForm());
      }
      toast.success('Parametrização removida.');
      await loadBundle(cadastroId, personId);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const onSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!ensureValidForm()) return;

    setSaving(true);
    try {
      const resolvedPessoaId = await upsertPessoa();
      setPersonId(resolvedPessoaId);

      if (cadastroId) {
        await loadBundle(cadastroId, resolvedPessoaId);
        toast.success('Empresa atualizada.');
        return;
      }

      const response = await http.post('/api/fidc/register', buildFidcCreatePayload(resolvedPessoaId, form));
      const created = response.data as Record<string, unknown>;
      const createdId = toText(created.id ?? created.Id ?? '');
      if (!createdId) {
        throw new Error('Não foi possível criar a empresa.');
      }

      toast.success('Empresa criada.');
      navigate(`/cadastro/empresas/${createdId}`, { replace: true });
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

  const addAnexo = async () => {
    if (!cadastroId || !personId || !anexoFile) {
      toast.error('Selecione um arquivo.');
      return;
    }

    try {
      await uploadLegacyAttachment(personId, LegacyAssociationType.FIDC, anexoFile);
      setAnexoFile(null);
      await loadBundle(cadastroId, personId);
      toast.success('Anexo incluído.');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const removeAnexo = async (anexoId: string) => {
    if (!cadastroId || !personId || !window.confirm('Remover anexo?')) return;
    try {
      await removeLegacyAttachment(anexoId);
      await loadBundle(cadastroId, personId);
      toast.success('Anexo removido.');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const addObservacao = async () => {
    if (!cadastroId || !personId || !textoObservacao.trim()) return;
    try {
      await createLegacyObservation({
        associationId: personId,
        associacao: LegacyAssociationType.FIDC,
        titulo: 'Observação',
        observacao: textoObservacao.trim(),
      });
      setTextoObservacao('');
      await loadBundle(cadastroId, personId);
      toast.success('Observação adicionada.');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const removeObservacao = async (observacaoId: string) => {
    if (!cadastroId || !personId || !window.confirm('Remover observação?')) return;
    try {
      await removeLegacyObservation(observacaoId);
      await loadBundle(cadastroId, personId);
      toast.success('Observação removida.');
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
          <label>
            <span>Segmento</span>
            <select value={form.segmentoEmpresa} onChange={(event) => setForm((c) => ({ ...c, segmentoEmpresa: event.target.value }))} required>
              <option value="">Selecione...</option>
              {segmentoEmpresaOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
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
        <div className="checkbox-list-grid">
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
        <div className="checkbox-list-grid">
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
          <thead><tr><th>Modalidade</th><th>Limite</th><th>Taxa Min/Max</th><th className="col-actions">Ações</th></tr></thead>
          <tbody>
            {parametrizacoes.map((item) => (
              <tr key={String(item.id ?? item.modalidadeId ?? item.modalidadeNome ?? item.nomeModalidade ?? Math.random())}>
                <td>{String(item.modalidadeNome ?? item.nomeModalidade ?? item.modalidadeId ?? '-')}</td>
                <td>{toText(item.limite ?? '-')}</td>
                <td>{toText(item.taxaMinima ?? '-')} / {toText(item.taxaMaxima ?? '-')}</td>
                <td className="col-actions">
                  <div className="table-actions">
                    <button type="button" className="ghost" onClick={() => applyParametrizacao(item)}>Editar</button>
                    <button type="button" className="danger" onClick={() => void removeParametrizacao(item)}>Remover</button>
                  </div>
                </td>
              </tr>
            ))}
            {parametrizacoes.length === 0 ? <tr><td colSpan={4}>Nenhuma parametrização cadastrada.</td></tr> : null}
          </tbody>
        </table>
      </section>
    </section>
  );

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
