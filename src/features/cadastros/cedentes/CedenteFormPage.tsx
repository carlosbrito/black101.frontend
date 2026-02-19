import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../../app/auth/AuthContext';
import { CONTEXTO_EMPRESA_HEADER, getErrorMessage, http, requiresEmpresaChoice } from '../../../shared/api/http';
import { EmpresaPickerDialog } from '../../../shared/ui/EmpresaPickerDialog';
import { PageFrame } from '../../../shared/ui/PageFrame';
import type { PagedResponse } from '../../../shared/types/paging';
import {
  applyCepMask,
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
  type CadastroObservacaoDto,
  type HistoricoItemDto,
  type PessoaDto,
  type PessoaFormState,
  readPagedResponse,
} from '../cadastroCommon';
import '../cadastro.css';
import '../administradoras/entity-form.css';

type TabKey =
  | 'cedente'
  | 'complemento'
  | 'contatos'
  | 'representantes'
  | 'contas'
  | 'documentos'
  | 'parametrizacao'
  | 'contratos'
  | 'atualizacoes'
  | 'despesas'
  | 'juridico'
  | 'pendencias'
  | 'anexos'
  | 'observacoes'
  | 'historico';

type CedenteDto = {
  id: string;
  pessoaId: string;
  nome: string;
  cnpjCpf: string;
  email?: string | null;
  telefone?: string | null;
  cidade?: string | null;
  uf?: string | null;
  observacoesGerais?: string | null;
  ativo: boolean;
  status: string;
};

type ComplementoDto = {
  id?: string | null;
  cedenteId: string;
  nomeFantasia?: string | null;
  segmento?: string | null;
  classificacao?: string | null;
  autoAprovacao: boolean;
  desabilitarAcoesConsultorAposAtivo: boolean;
  observacoes?: string | null;
};

type ContatoDto = {
  id: string;
  cedenteId: string;
  tipoContato: number;
  nome: string;
  email: string;
  telefone1: string;
  telefone2?: string | null;
  observacoes?: string | null;
};

type CedenteRepresentanteDto = {
  id: string;
  cedenteId: string;
  representanteId: string;
  pessoaId: string;
  nomeRepresentante: string;
  documentoRepresentante: string;
  funcao?: string | null;
  ativo: boolean;
};

type RepresentanteOption = {
  id: string;
  nome: string;
  cnpjCpf: string;
  ativo: boolean;
};

type ContaDto = {
  id: string;
  cedenteId: string;
  bancoId?: string | null;
  bancoNome: string;
  agencia: string;
  numeroConta: string;
  tipoConta?: string | null;
  principal: boolean;
  ativo: boolean;
};

type BancoOption = {
  id: string;
  nome: string;
};

type DocumentoDto = {
  id: string;
  cedenteId: string;
  tipoDocumento: string;
  nomeArquivo: string;
  contentType: string;
  tamanhoBytes: number;
  validacaoIaStatus?: string | null;
  createdAt: string;
};

type ParametrizacaoDto = {
  id: string;
  cedenteId: string;
  modalidadeId: string;
  modalidadeNome: string;
  modalidadeCodigo: string;
  limite?: number | null;
  tranche?: number | null;
  float?: number | null;
  fator?: number | null;
  feeTerceiros?: number | null;
  multaBaixa?: number | null;
  multaBaixaCheque?: number | null;
  multaRecompra?: number | null;
  encargoBaixa?: number | null;
  encargoBaixaCheque?: number | null;
  encargoRecompra?: number | null;
  prorrogacao?: number | null;
  tarifaProrrogacao?: number | null;
  tarifaRecompra?: number | null;
  antecipacao?: number | null;
  tarifaAntecipacao?: number | null;
  prazoMinimo?: number | null;
  prazoMaximo?: number | null;
  taxaMinima?: number | null;
  taxaMaxima?: number | null;
  limiteMinimoSacado?: number | null;
  limiteMaximoSacado?: number | null;
  fidcParametrizacaoCalculoId?: string | null;
  contaCobrancaPadraoId?: string | null;
  meioRecebimentoPadrao?: string | null;
  tipoBanco?: number | null;
  classificacaoId?: string | null;
  isPedidoDeVenda: boolean;
  isBoletoNormal: boolean;
  isBoletoEspecial: boolean;
  isContaEscrow: boolean;
  isDeposito: boolean;
  isChequeCustodia: boolean;
  isCartaoCredito: boolean;
  isDuplicata: boolean;
  isNotaPromissoria: boolean;
  isNotaDeSeguro: boolean;
  isCobrancaSeriada: boolean;
  isRecibo: boolean;
  isNotaPromissoriaFisica: boolean;
  isNotaComercial: boolean;
  isLetrasCombio: boolean;
  isNotaDebito: boolean;
  isDuplicataServico: boolean;
  isPrecatorios: boolean;
  isDuplicataServicoFisico: boolean;
  isDuplicataTransporteDigital: boolean;
  isDuplicataTransporteFisica: boolean;
  isRenegociacaoDivida: boolean;
  isNotaComercial3: boolean;
  isCcbDigital: boolean;
  isCheque: boolean;
  isChequeManual: boolean;
  isCteDigital: boolean;
  isCedulaProdutoRural: boolean;
  isContratoNormal: boolean;
  isContrato: boolean;
  isConfissaoDivida: boolean;
  isAssuncaoDivida: boolean;
  isOperacaoCartaoCredito: boolean;
  isOperacaoCartaoCreditoLimine: boolean;
  isCcbPreDigital: boolean;
  isCcbPreBalcao: boolean;
  isCcbPreCetip: boolean;
  isOutros: boolean;
  isCcbFormalizacaoFonada: boolean;
  isNotaComercial2: boolean;
  isCreditosJudiciais: boolean;
  isCcb2: boolean;
  isCedulaProdutoRuralFinanceira: boolean;
  isCheque2: boolean;
  isOutro: boolean;
  habilitado: boolean;
};

type ModalidadeOption = { id: string; nome: string; codigo: string; ativo: boolean };
type ParamForm = Record<string, string | boolean>;
type MetricInputKind = 'currency' | 'percentage' | 'decimal' | 'integer' | 'text';

const contatoTipoOptions: Array<{ value: number; label: string }> = [
  { value: 0, label: 'Cobrança' },
  { value: 1, label: 'Fiscal' },
  { value: 2, label: 'Recebimento' },
  { value: 3, label: 'Contas a Pagar' },
  { value: 4, label: 'Tesouraria' },
  { value: 5, label: 'Financeiro' },
];

type ContratoDto = {
  id: string;
  cedenteId: string;
  tipoContrato: string;
  numeroContrato: string;
  dataInicio: string;
  dataFim?: string | null;
  status: string;
  valorLimite?: number | null;
  observacoes?: string | null;
};

type AtualizacaoDto = {
  id: string;
  cedenteId: string;
  titulo: string;
  descricao?: string | null;
  status: string;
  dataInicio: string;
  dataFim?: string | null;
  responsavel?: string | null;
};

type DespesaDto = {
  id: string;
  cedenteId: string;
  descricao: string;
  valor: number;
  periodicidade?: string | null;
  ativo: boolean;
};

type JuridicoDto = {
  id: string;
  cedenteId: string;
  tipoAcao: string;
  numeroProcesso: string;
  status: string;
  dataAtualizacao: string;
  observacoes?: string | null;
};

type PendenciaDto = {
  id: string;
  cedenteId: string;
  titulo: string;
  descricao?: string | null;
  status: string;
  prioridade?: string | null;
  prazo?: string | null;
  resolucao?: string | null;
};

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'cedente', label: 'Cedente' },
  { key: 'complemento', label: 'Complemento' },
  { key: 'contatos', label: 'Contatos' },
  { key: 'representantes', label: 'Representantes' },
  { key: 'contas', label: 'Contas' },
  { key: 'documentos', label: 'Documentos' },
  { key: 'parametrizacao', label: 'Parametrização' },
  { key: 'contratos', label: 'Contratos' },
  { key: 'atualizacoes', label: 'Atualizações' },
  { key: 'despesas', label: 'Despesas' },
  { key: 'juridico', label: 'Jurídico' },
  { key: 'pendencias', label: 'Pendências' },
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

const createInitialComplemento = (): ComplementoDto => ({
  cedenteId: '',
  nomeFantasia: '',
  segmento: '',
  classificacao: '',
  autoAprovacao: false,
  desabilitarAcoesConsultorAposAtivo: false,
  observacoes: '',
});

const parseNumber = (value: string): number | null => {
  const normalized = value.replace(',', '.').trim();
  if (!normalized) return null;
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : null;
};

const parseInteger = (value: string): number | null => {
  const normalized = value.trim();
  if (!normalized) return null;
  const numeric = Number(normalized);
  return Number.isInteger(numeric) ? numeric : null;
};

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

const normalizeStatusToken = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .replace(/\s+/g, '_')
    .toUpperCase();

const createEnderecoForm = () => ({
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
  principal: false,
  cobranca: false,
});

const createPessoaContatoForm = () => ({
  nome: '',
  email: '',
  telefone1: '',
  telefone2: '',
  tipoContato: 0,
});

const createQsaForm = () => ({
  nome: '',
  documento: '',
  qualificacao: '',
  percentual: '',
});

export const CedenteFormPage = () => {
  const { contextEmpresas, selectedEmpresaIds } = useAuth();
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const cedenteId = params.id;
  const isEdit = !!cedenteId;

  const [loading, setLoading] = useState<boolean>(isEdit);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerCallback, setPickerCallback] = useState<((empresaId: string) => Promise<void>) | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('cedente');

  const [pessoaId, setPessoaId] = useState<string | null>(null);
  const [cedenteAtivo, setCedenteAtivo] = useState(true);
  const [cedenteStatus, setCedenteStatus] = useState('Aberto');
  const [pessoaForm, setPessoaForm] = useState<PessoaFormState>(defaultPessoaFormState);

  const [complemento, setComplemento] = useState<ComplementoDto>(createInitialComplemento());
  const [contatos, setContatos] = useState<ContatoDto[]>([]);
  const [representantes, setRepresentantes] = useState<CedenteRepresentanteDto[]>([]);
  const [contas, setContas] = useState<ContaDto[]>([]);
  const [documentos, setDocumentos] = useState<DocumentoDto[]>([]);
  const [parametrizacoes, setParametrizacoes] = useState<ParametrizacaoDto[]>([]);
  const [contratos, setContratos] = useState<ContratoDto[]>([]);
  const [atualizacoes, setAtualizacoes] = useState<AtualizacaoDto[]>([]);
  const [despesas, setDespesas] = useState<DespesaDto[]>([]);
  const [juridicos, setJuridicos] = useState<JuridicoDto[]>([]);
  const [pendencias, setPendencias] = useState<PendenciaDto[]>([]);
  const [anexos, setAnexos] = useState<CadastroArquivoDto[]>([]);
  const [observacoes, setObservacoes] = useState<CadastroObservacaoDto[]>([]);
  const [historicoPaged, setHistoricoPaged] = useState<PagedResponse<HistoricoItemDto>>({
    items: [],
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 1,
  });

  const [representanteOptions, setRepresentanteOptions] = useState<RepresentanteOption[]>([]);
  const [bancoOptions, setBancoOptions] = useState<BancoOption[]>([]);
  const [modalidades, setModalidades] = useState<ModalidadeOption[]>([]);

  const [selectedRepresentanteId, setSelectedRepresentanteId] = useState('');
  const [funcaoRepresentante, setFuncaoRepresentante] = useState('');

  const [contatoForm, setContatoForm] = useState({
    tipoContato: 0,
    nome: '',
    email: '',
    telefone1: '',
    telefone2: '',
    observacoes: '',
  });

  const [contaForm, setContaForm] = useState({
    bancoId: '',
    bancoNome: '',
    agencia: '',
    numeroConta: '',
    tipoConta: '',
    principal: false,
    ativo: true,
  });

  const [tipoDocumento, setTipoDocumento] = useState('Contrato Social');
  const [documentoFile, setDocumentoFile] = useState<File | null>(null);

  const [parametrizacaoForm, setParametrizacaoForm] = useState<ParamForm>(buildDefaultParamForm);

  const [contratoForm, setContratoForm] = useState({
    tipoContrato: 'Cessao',
    numeroContrato: '',
    dataInicio: '',
    dataFim: '',
    status: 'Ativo',
    valorLimite: '',
    observacoes: '',
  });

  const [atualizacaoForm, setAtualizacaoForm] = useState({
    titulo: '',
    descricao: '',
    status: 'Aberto',
    dataInicio: '',
    dataFim: '',
    responsavel: '',
  });

  const [despesaForm, setDespesaForm] = useState({
    descricao: '',
    valor: '',
    periodicidade: '',
    ativo: true,
  });

  const [juridicoForm, setJuridicoForm] = useState({
    tipoAcao: '',
    numeroProcesso: '',
    status: 'Aberto',
    dataAtualizacao: '',
    observacoes: '',
  });

  const [pendenciaForm, setPendenciaForm] = useState({
    titulo: '',
    descricao: '',
    status: 'Aberto',
    prioridade: '',
    prazo: '',
    resolucao: '',
  });

  const [enderecoForm, setEnderecoForm] = useState(createEnderecoForm);
  const [pessoaContatoForm, setPessoaContatoForm] = useState(createPessoaContatoForm);
  const [qsaForm, setQsaForm] = useState(createQsaForm);

  const [anexoFile, setAnexoFile] = useState<File | null>(null);
  const [textoObservacao, setTextoObservacao] = useState('');

  const canAccessSubTabs = isEdit;
  const normalizedStatus = useMemo(() => normalizeStatusToken(cedenteStatus), [cedenteStatus]);
  const visibleTabs = useMemo(() => {
    return tabs.filter((tab) => {
      if (tab.key === 'atualizacoes') {
        return normalizedStatus === 'ATIVO' || normalizedStatus === 'APROVADO';
      }

      if (tab.key === 'pendencias') {
        return normalizedStatus === 'AGUARDANDO_APROVACAO';
      }

      return true;
    });
  }, [normalizedStatus]);

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
    const response = await http.get(`/cadastros/cedentes/${id}/historico`, {
      params: { page, pageSize: historicoPaged.pageSize },
    });

    setHistoricoPaged(readPagedResponse<HistoricoItemDto>(response.data));
  };

  const reloadSubTabs = async (id: string) => {
    const [
      complementoRes,
      contatosRes,
      representantesRes,
      contasRes,
      documentosRes,
      parametrizacaoRes,
      contratosRes,
      atualizacoesRes,
      despesasRes,
      juridicoRes,
      pendenciasRes,
      anexosRes,
      observacoesRes,
      historicoRes,
    ] = await Promise.all([
      http.get(`/cadastros/cedentes/${id}/complemento`),
      http.get(`/cadastros/cedentes/${id}/contatos`),
      http.get(`/cadastros/cedentes/${id}/representantes`),
      http.get(`/cadastros/cedentes/${id}/contas`),
      http.get(`/cadastros/cedentes/${id}/documentos`),
      http.get(`/cadastros/cedentes/${id}/parametrizacao`),
      http.get(`/cadastros/cedentes/${id}/contratos`),
      http.get(`/cadastros/cedentes/${id}/atualizacoes`),
      http.get(`/cadastros/cedentes/${id}/despesas`),
      http.get(`/cadastros/cedentes/${id}/juridico`),
      http.get(`/cadastros/cedentes/${id}/pendencias`),
      http.get(`/cadastros/cedentes/${id}/anexos`),
      http.get(`/cadastros/cedentes/${id}/observacoes`),
      http.get(`/cadastros/cedentes/${id}/historico`, { params: { page: 1, pageSize: 20 } }),
    ]);

    setComplemento((complementoRes.data as ComplementoDto) ?? createInitialComplemento());
    setContatos((contatosRes.data as ContatoDto[]) ?? []);
    setRepresentantes((representantesRes.data as CedenteRepresentanteDto[]) ?? []);
    setContas((contasRes.data as ContaDto[]) ?? []);
    setDocumentos((documentosRes.data as DocumentoDto[]) ?? []);
    setParametrizacoes((parametrizacaoRes.data as ParametrizacaoDto[]) ?? []);
    setContratos((contratosRes.data as ContratoDto[]) ?? []);
    setAtualizacoes((atualizacoesRes.data as AtualizacaoDto[]) ?? []);
    setDespesas((despesasRes.data as DespesaDto[]) ?? []);
    setJuridicos((juridicoRes.data as JuridicoDto[]) ?? []);
    setPendencias((pendenciasRes.data as PendenciaDto[]) ?? []);
    setAnexos((anexosRes.data as CadastroArquivoDto[]) ?? []);
    setObservacoes((observacoesRes.data as CadastroObservacaoDto[]) ?? []);
    setHistoricoPaged(readPagedResponse<HistoricoItemDto>(historicoRes.data));
  };

  const loadOptions = async () => {
    const [repRes, bancoRes, modalidadesRes] = await Promise.all([
      http.get('/cadastros/representantes', {
        params: { page: 1, pageSize: 300, sortBy: 'nome', sortDir: 'asc' },
      }),
      http.get('/cadastros/bancos', {
        params: { page: 1, pageSize: 300, sortBy: 'nome', sortDir: 'asc' },
      }),
      http.get('/cadastros/modalidades', {
        params: { page: 1, pageSize: 200, sortBy: 'nome', sortDir: 'asc' },
      }),
    ]);

    const repsPaged = readPagedResponse<RepresentanteOption>(repRes.data);
    const bancosPaged = readPagedResponse<{ id: string; nome: string }>(bancoRes.data);
    const modalidadesPaged = readPagedResponse<ModalidadeOption>(modalidadesRes.data);

    setRepresentanteOptions(repsPaged.items.filter((item) => item.ativo));
    setBancoOptions(bancosPaged.items.map((item) => ({ id: item.id, nome: item.nome })));
    setModalidades(modalidadesPaged.items.filter((item) => item.ativo));
  };

  useEffect(() => {
    void loadOptions().catch(() => {
      setRepresentanteOptions([]);
      setBancoOptions([]);
      setModalidades([]);
    });
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      if (!cedenteId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const cedenteRes = await http.get(`/cadastros/cedentes/${cedenteId}`);
        const cedente = cedenteRes.data as CedenteDto;

        setCedenteAtivo(cedente.ativo);
        setCedenteStatus(cedente.status || 'Aberto');

        const pessoaRes = await http.get(`/cadastros/pessoas/${cedente.pessoaId}`);
        syncPessoaForm(pessoaRes.data as PessoaDto);

        await reloadSubTabs(cedenteId);
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, [cedenteId]);

  useEffect(() => {
    if (!visibleTabs.some((item) => item.key === activeTab)) {
      setActiveTab('cedente');
    }
  }, [activeTab, visibleTabs]);

  const ensureValidPessoaForm = (): boolean => {
    const document = sanitizeDocument(pessoaForm.cnpjCpf);

    if (!pessoaForm.nome.trim()) {
      toast.error('Informe o nome do cedente.');
      return false;
    }

    if (!isValidCpfCnpj(document)) {
      toast.error('Informe um CPF/CNPJ válido.');
      return false;
    }

    if (pessoaForm.telefone.trim() && !isValidPhone(pessoaForm.telefone)) {
      toast.error('Informe um telefone válido com DDD.');
      return false;
    }

    const hasInvalidPersonContact = pessoaForm.contatos.some((contato) => {
      if (!contato.nome.trim() || !contato.email.trim()) return true;
      if (!isValidPhone(contato.telefone1)) return true;
      if (contato.telefone2 && contato.telefone2.trim() && !isValidPhone(contato.telefone2)) return true;
      return false;
    });

    if (hasInvalidPersonContact) {
      toast.error('Há contatos da Pessoa com dados inválidos.');
      return false;
    }

    const hasInvalidQsa = pessoaForm.qsas.some((qsa) => !qsa.nome.trim() || !isValidCpfCnpj(qsa.documento));
    if (hasInvalidQsa) {
      toast.error('Há registros de QSA com CPF/CNPJ inválido.');
      return false;
    }

    return true;
  };

  const ensureValidContatoPhones = (telefone1: string, telefone2?: string | null): boolean => {
    if (!isValidPhone(telefone1)) {
      toast.error('Telefone principal do contato inválido.');
      return false;
    }

    if (telefone2 && telefone2.trim() && !isValidPhone(telefone2)) {
      toast.error('Telefone secundário do contato inválido.');
      return false;
    }

    return true;
  };

  const addPessoaEndereco = () => {
    if (!enderecoForm.cep.trim() || !enderecoForm.logradouro.trim() || !enderecoForm.numero.trim() || !enderecoForm.bairro.trim() || !enderecoForm.cidade.trim() || !enderecoForm.uf.trim()) {
      toast.error('Preencha os campos obrigatórios do endereço.');
      return;
    }

    setPessoaForm((current) => {
      const nextEnderecos = [
        ...current.enderecos,
        {
          cep: enderecoForm.cep.trim(),
          logradouro: enderecoForm.logradouro.trim(),
          numero: enderecoForm.numero.trim(),
          complemento: enderecoForm.complemento.trim() || null,
          bairro: enderecoForm.bairro.trim(),
          cidade: enderecoForm.cidade.trim(),
          uf: enderecoForm.uf.trim().toUpperCase(),
          principal: enderecoForm.principal || current.enderecos.length === 0,
          cobranca: enderecoForm.cobranca || current.enderecos.length === 0,
        },
      ];

      const principalIndex = nextEnderecos.findIndex((x) => x.principal);
      const cobrancaIndex = nextEnderecos.findIndex((x) => x.cobranca);
      const normalized = nextEnderecos.map((item, index) => ({
        ...item,
        principal: principalIndex >= 0 ? index === principalIndex : index === 0,
        cobranca: cobrancaIndex >= 0 ? index === cobrancaIndex : index === 0,
      }));

      return {
        ...current,
        enderecos: normalized,
      };
    });

    setEnderecoForm(createEnderecoForm());
  };

  const removePessoaEndereco = (index: number) => {
    setPessoaForm((current) => {
      const next = current.enderecos.filter((_, itemIndex) => itemIndex !== index);
      if (next.length > 0 && !next.some((item) => item.principal)) {
        next[0] = { ...next[0], principal: true };
      }
      if (next.length > 0 && !next.some((item) => item.cobranca)) {
        next[0] = { ...next[0], cobranca: true };
      }

      return {
        ...current,
        enderecos: next,
      };
    });
  };

  const defineEnderecoPrincipal = (index: number) => {
    setPessoaForm((current) => ({
      ...current,
      enderecos: current.enderecos.map((item, itemIndex) => ({
        ...item,
        principal: itemIndex === index,
      })),
    }));
  };

  const defineEnderecoCobranca = (index: number) => {
    setPessoaForm((current) => ({
      ...current,
      enderecos: current.enderecos.map((item, itemIndex) => ({
        ...item,
        cobranca: itemIndex === index,
      })),
    }));
  };

  const addPessoaContato = () => {
    if (!pessoaContatoForm.nome.trim() || !pessoaContatoForm.email.trim()) {
      toast.error('Preencha nome e e-mail do contato adicional.');
      return;
    }

    if (!ensureValidContatoPhones(pessoaContatoForm.telefone1, pessoaContatoForm.telefone2)) {
      return;
    }

    setPessoaForm((current) => ({
      ...current,
      contatos: [
        ...current.contatos,
        {
          nome: pessoaContatoForm.nome.trim(),
          email: pessoaContatoForm.email.trim(),
          telefone1: pessoaContatoForm.telefone1.trim(),
          telefone2: pessoaContatoForm.telefone2.trim() || null,
          tipoContato: Number.isFinite(Number(pessoaContatoForm.tipoContato)) ? Number(pessoaContatoForm.tipoContato) : 0,
        },
      ],
    }));

    setPessoaContatoForm(createPessoaContatoForm());
  };

  const removePessoaContato = (index: number) => {
    setPessoaForm((current) => ({
      ...current,
      contatos: current.contatos.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const addPessoaQsa = () => {
    const documento = sanitizeDocument(qsaForm.documento);
    if (!qsaForm.nome.trim() || !isValidCpfCnpj(documento)) {
      toast.error('Informe nome e CPF/CNPJ válido para o QSA.');
      return;
    }

    setPessoaForm((current) => ({
      ...current,
      qsas: [
        ...current.qsas,
        {
          nome: qsaForm.nome.trim(),
          documento: documento,
          qualificacao: qsaForm.qualificacao.trim() || null,
          percentual: parseNumber(qsaForm.percentual),
        },
      ],
    }));

    setQsaForm(createQsaForm());
  };

  const removePessoaQsa = (index: number) => {
    setPessoaForm((current) => ({
      ...current,
      qsas: current.qsas.filter((_, itemIndex) => itemIndex !== index),
    }));
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

  const onSaveCedente = async (event: FormEvent) => {
    event.preventDefault();

    if (!ensureValidPessoaForm()) {
      return;
    }

    setSaving(true);

    try {
      const resolvedPessoaId = await upsertPessoa();
      setPessoaId(resolvedPessoaId);

      if (cedenteId) {
        await http.put(`/cadastros/cedentes/${cedenteId}`, {
          pessoaId: resolvedPessoaId,
          ativo: cedenteAtivo,
          status: cedenteStatus.trim() || 'Aberto',
        });

        toast.success('Cedente atualizado.');
      } else {
        const createCedente = async (empresaId?: string) => {
          const createResponse = await http.post('/cadastros/cedentes', {
            pessoaId: resolvedPessoaId,
          }, {
            headers: empresaId ? { [CONTEXTO_EMPRESA_HEADER]: empresaId } : undefined,
          });

          const created = createResponse.data as { id: string };

          if (!cedenteAtivo || (cedenteStatus.trim() && cedenteStatus.trim() !== 'Aberto')) {
            await http.put(`/cadastros/cedentes/${created.id}`, {
              pessoaId: resolvedPessoaId,
              ativo: cedenteAtivo,
              status: cedenteStatus.trim() || 'Aberto',
            });
          }

          toast.success('Cedente criado.');
          navigate(`/cadastro/cedentes/${created.id}`, { replace: true });
        };

        try {
          await createCedente();
        } catch (error) {
          if (!requiresEmpresaChoice(error) || selectedEmpresaIds.length <= 1) {
            throw error;
          }

          setPickerOpen(true);
          setPickerCallback(() => async (empresaId: string) => {
            await createCedente(empresaId);
          });
        }
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const withCedenteReload = async (fn: () => Promise<void>) => {
    if (!cedenteId) {
      toast.error('Salve o cedente para liberar esta funcionalidade.');
      return;
    }

    try {
      await fn();
      await reloadSubTabs(cedenteId);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const applyWorkflowStatus = async (status: string, ativo: boolean) => {
    if (!cedenteId || !pessoaId) {
      toast.error('Salve o cedente antes de executar ações de workflow.');
      return;
    }

    try {
      await http.put(`/cadastros/cedentes/${cedenteId}`, {
        pessoaId,
        ativo,
        status,
      });

      setCedenteStatus(status);
      setCedenteAtivo(ativo);
      toast.success(`Status atualizado para '${status}'.`);
      await reloadSubTabs(cedenteId);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const workflowActions = useMemo(() => {
    switch (normalizedStatus) {
      case 'ABERTO':
        return [{ label: 'Enviar para aprovação', status: 'Aguardando Aprovação', ativo: true }];
      case 'AGUARDANDO_APROVACAO':
        return [
          { label: 'Aprovar cedente', status: 'Ativo', ativo: true },
          { label: 'Reprovar cedente', status: 'Aberto', ativo: true },
        ];
      case 'ATIVO':
      case 'APROVADO':
        return [{ label: 'Inativar cedente', status: 'Inativo', ativo: false }];
      case 'INATIVO':
        return [{ label: 'Reativar cedente', status: 'Ativo', ativo: true }];
      default:
        return [];
    }
  }, [normalizedStatus]);

  const saveComplemento = async () => {
    await withCedenteReload(async () => {
      await http.put(`/cadastros/cedentes/${cedenteId}/complemento`, {
        nomeFantasia: complemento.nomeFantasia?.trim() || null,
        segmento: complemento.segmento?.trim() || null,
        classificacao: complemento.classificacao?.trim() || null,
        autoAprovacao: false,
        desabilitarAcoesConsultorAposAtivo: false,
        observacoes: complemento.observacoes?.trim() || null,
      });

      toast.success('Complemento salvo.');
    });
  };

  const addContato = async () => {
    if (!contatoForm.nome.trim() || !contatoForm.email.trim()) {
      toast.error('Preencha nome e e-mail do contato.');
      return;
    }

    if (!ensureValidContatoPhones(contatoForm.telefone1, contatoForm.telefone2)) {
      return;
    }

    await withCedenteReload(async () => {
      await http.post(`/cadastros/cedentes/${cedenteId}/contatos`, {
        tipoContato: Number(contatoForm.tipoContato ?? 0),
        nome: contatoForm.nome.trim(),
        email: contatoForm.email.trim(),
        telefone1: contatoForm.telefone1.trim(),
        telefone2: contatoForm.telefone2.trim() || null,
        observacoes: contatoForm.observacoes.trim() || null,
      });

      setContatoForm({
        tipoContato: 0,
        nome: '',
        email: '',
        telefone1: '',
        telefone2: '',
        observacoes: '',
      });

      toast.success('Contato adicionado.');
    });
  };

  const updateContato = async (item: ContatoDto) => {
    const nome = window.prompt('Nome do contato', item.nome);
    if (nome === null) return;
    const email = window.prompt('E-mail do contato', item.email);
    if (email === null) return;
    const telefone1 = window.prompt('Telefone principal', item.telefone1);
    if (telefone1 === null) return;
    const telefone2 = window.prompt('Telefone secundário', item.telefone2 ?? '');
    if (telefone2 === null) return;
    const observacoesItem = window.prompt('Observações', item.observacoes ?? '');
    if (observacoesItem === null) return;

    const telefone1Masked = applyPhoneMask(telefone1);
    const telefone2Masked = applyPhoneMask(telefone2);
    if (!ensureValidContatoPhones(telefone1Masked, telefone2Masked)) {
      return;
    }

    await withCedenteReload(async () => {
      await http.put(`/cadastros/cedentes/${cedenteId}/contatos/${item.id}`, {
        tipoContato: item.tipoContato,
        nome: nome.trim(),
        email: email.trim(),
        telefone1: telefone1Masked,
        telefone2: telefone2Masked.trim() || null,
        observacoes: observacoesItem.trim() || null,
      });

      toast.success('Contato atualizado.');
    });
  };

  const removeContato = async (item: ContatoDto) => {
    if (!window.confirm(`Excluir contato '${item.nome}'?`)) {
      return;
    }

    await withCedenteReload(async () => {
      await http.delete(`/cadastros/cedentes/${cedenteId}/contatos/${item.id}`);
      toast.success('Contato removido.');
    });
  };

  const addRepresentante = async () => {
    if (!selectedRepresentanteId) {
      toast.error('Selecione um representante.');
      return;
    }

    await withCedenteReload(async () => {
      await http.post(`/cadastros/cedentes/${cedenteId}/representantes`, {
        representanteId: selectedRepresentanteId,
        funcao: funcaoRepresentante.trim() || null,
      });

      setSelectedRepresentanteId('');
      setFuncaoRepresentante('');
      toast.success('Representante vinculado.');
    });
  };

  const updateRepresentante = async (item: CedenteRepresentanteDto) => {
    const funcao = window.prompt('Função do representante', item.funcao ?? '');
    if (funcao === null) return;

    await withCedenteReload(async () => {
      await http.put(`/cadastros/cedentes/${cedenteId}/representantes/${item.id}`, {
        funcao: funcao.trim() || null,
        ativo: item.ativo,
      });

      toast.success('Vínculo atualizado.');
    });
  };

  const toggleRepresentante = async (item: CedenteRepresentanteDto) => {
    await withCedenteReload(async () => {
      await http.put(`/cadastros/cedentes/${cedenteId}/representantes/${item.id}`, {
        funcao: item.funcao ?? null,
        ativo: !item.ativo,
      });

      toast.success('Status do vínculo atualizado.');
    });
  };

  const removeRepresentante = async (item: CedenteRepresentanteDto) => {
    if (!window.confirm(`Remover vínculo com '${item.nomeRepresentante}'?`)) {
      return;
    }

    await withCedenteReload(async () => {
      await http.delete(`/cadastros/cedentes/${cedenteId}/representantes/${item.id}`);
      toast.success('Vínculo removido.');
    });
  };

  const addConta = async () => {
    if (!contaForm.bancoNome.trim() || !contaForm.agencia.trim() || !contaForm.numeroConta.trim()) {
      toast.error('Preencha banco, agência e número da conta.');
      return;
    }

    await withCedenteReload(async () => {
      await http.post(`/cadastros/cedentes/${cedenteId}/contas`, {
        bancoId: contaForm.bancoId || null,
        bancoNome: contaForm.bancoNome.trim(),
        agencia: contaForm.agencia.trim(),
        numeroConta: contaForm.numeroConta.trim(),
        tipoConta: contaForm.tipoConta.trim() || null,
        principal: contaForm.principal,
        ativo: contaForm.ativo,
      });

      setContaForm({
        bancoId: '',
        bancoNome: '',
        agencia: '',
        numeroConta: '',
        tipoConta: '',
        principal: false,
        ativo: true,
      });

      toast.success('Conta adicionada.');
    });
  };

  const updateConta = async (item: ContaDto) => {
    const bancoNome = window.prompt('Banco', item.bancoNome);
    if (bancoNome === null) return;
    const agencia = window.prompt('Agência', item.agencia);
    if (agencia === null) return;
    const numeroConta = window.prompt('Número da conta', item.numeroConta);
    if (numeroConta === null) return;
    const tipoConta = window.prompt('Tipo da conta', item.tipoConta ?? '');
    if (tipoConta === null) return;

    await withCedenteReload(async () => {
      await http.put(`/cadastros/cedentes/${cedenteId}/contas/${item.id}`, {
        bancoId: item.bancoId ?? null,
        bancoNome: bancoNome.trim(),
        agencia: agencia.trim(),
        numeroConta: numeroConta.trim(),
        tipoConta: tipoConta.trim() || null,
        principal: item.principal,
        ativo: item.ativo,
      });

      toast.success('Conta atualizada.');
    });
  };

  const removeConta = async (item: ContaDto) => {
    if (!window.confirm('Excluir conta?')) {
      return;
    }

    await withCedenteReload(async () => {
      await http.delete(`/cadastros/cedentes/${cedenteId}/contas/${item.id}`);
      toast.success('Conta removida.');
    });
  };

  const uploadDocumento = async () => {
    if (!documentoFile) {
      toast.error('Selecione um arquivo para documento.');
      return;
    }

    await withCedenteReload(async () => {
      const formData = new FormData();
      formData.append('tipoDocumento', tipoDocumento.trim() || 'Documento');
      formData.append('file', documentoFile);

      await http.post(`/cadastros/cedentes/${cedenteId}/documentos`, formData);
      setDocumentoFile(null);
      toast.success('Documento enviado.');
    });
  };

  const downloadDocumento = async (item: DocumentoDto) => {
    if (!cedenteId) return;

    try {
      const response = await http.get(`/cadastros/cedentes/${cedenteId}/documentos/${item.id}/download`, {
        responseType: 'blob',
      });

      const fileName = parseFileName(response.headers['content-disposition'] ?? null, item.nomeArquivo);
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const removeDocumento = async (item: DocumentoDto) => {
    if (!window.confirm(`Excluir documento '${item.nomeArquivo}'?`)) {
      return;
    }

    await withCedenteReload(async () => {
      await http.delete(`/cadastros/cedentes/${cedenteId}/documentos/${item.id}`);
      toast.success('Documento removido.');
    });
  };

  const applyParametrizacao = (item: ParametrizacaoDto) => {
    const next = buildDefaultParamForm();
    next.modalidadeId = item.modalidadeId;
    numericDecimalKeys.forEach((key) => {
      const value = item[key as keyof ParametrizacaoDto] as number | null | undefined;
      if (currencyMetricSet.has(key)) next[key] = formatCurrencyFromNumber(value);
      else if (percentageMetricSet.has(key)) next[key] = formatPercentageFromNumber(value);
      else if (decimalMetricSet.has(key)) next[key] = formatDecimalFromNumber(value);
      else next[key] = value === null || value === undefined ? '' : String(value);
    });
    numericIntKeys.forEach((key) => {
      const value = item[key as keyof ParametrizacaoDto] as number | null | undefined;
      next[key] = value === null || value === undefined ? '' : String(value);
    });
    stringNullableKeys.forEach((key) => {
      const value = item[key as keyof ParametrizacaoDto] as string | null | undefined;
      next[key] = value ?? '';
    });
    allBooleanFlags.forEach((key) => {
      next[key] = Boolean(item[key as keyof ParametrizacaoDto] as boolean | undefined);
    });
    next.habilitado = Boolean(item.habilitado);
    setParametrizacaoForm(next);
  };

  const changeModalidade = (modalidadeId: string) => {
    const existing = parametrizacoes.find((item) => item.modalidadeId === modalidadeId);
    if (existing) {
      applyParametrizacao(existing);
      return;
    }
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
    const modalidadeId = String(parametrizacaoForm.modalidadeId || '').trim();
    if (!modalidadeId) {
      toast.error('Selecione uma modalidade.');
      return;
    }

    const payload: Record<string, unknown> = { modalidadeId, habilitado: Boolean(parametrizacaoForm.habilitado) };
    numericDecimalKeys.forEach((key) => { payload[key] = parseDecimal(String(parametrizacaoForm[key] ?? '')); });
    numericIntKeys.forEach((key) => { payload[key] = parseInteger(String(parametrizacaoForm[key] ?? '')); });
    stringNullableKeys.forEach((key) => {
      const value = String(parametrizacaoForm[key] ?? '').trim();
      payload[key] = value ? value : null;
    });
    allBooleanFlags.forEach((key) => { payload[key] = Boolean(parametrizacaoForm[key]); });

    const existing = parametrizacoes.find((item) => item.modalidadeId === modalidadeId);
    await withCedenteReload(async () => {
      if (existing) {
        await http.put(`/cadastros/cedentes/${cedenteId}/parametrizacao/${existing.id}`, payload);
      } else {
        await http.post(`/cadastros/cedentes/${cedenteId}/parametrizacao`, payload);
      }
      toast.success('Parametrização salva.');
      if (!existing) {
        setParametrizacaoForm(buildDefaultParamForm());
      }
    });
  };

  const removeParametrizacao = async (item: ParametrizacaoDto) => {
    if (!window.confirm('Excluir parametrização?')) {
      return;
    }

    await withCedenteReload(async () => {
      await http.delete(`/cadastros/cedentes/${cedenteId}/parametrizacao/${item.id}`);
      toast.success('Parametrização removida.');
    });
  };

  const addContrato = async () => {
    if (!contratoForm.tipoContrato.trim() || !contratoForm.numeroContrato.trim()) {
      toast.error('Informe tipo e número do contrato.');
      return;
    }

    await withCedenteReload(async () => {
      await http.post(`/cadastros/cedentes/${cedenteId}/contratos`, {
        tipoContrato: contratoForm.tipoContrato.trim(),
        numeroContrato: contratoForm.numeroContrato.trim(),
        dataInicio: contratoForm.dataInicio || new Date().toISOString(),
        dataFim: contratoForm.dataFim || null,
        status: contratoForm.status.trim() || 'Ativo',
        valorLimite: parseNumber(contratoForm.valorLimite),
        observacoes: contratoForm.observacoes.trim() || null,
      });

      setContratoForm({
        tipoContrato: 'Cessao',
        numeroContrato: '',
        dataInicio: '',
        dataFim: '',
        status: 'Ativo',
        valorLimite: '',
        observacoes: '',
      });

      toast.success('Contrato adicionado.');
    });
  };

  const updateContrato = async (item: ContratoDto) => {
    const tipoContrato = window.prompt('Tipo de contrato', item.tipoContrato);
    if (tipoContrato === null) return;
    const numeroContrato = window.prompt('Número do contrato', item.numeroContrato);
    if (numeroContrato === null) return;
    const status = window.prompt('Status do contrato', item.status);
    if (status === null) return;
    const valorLimite = window.prompt('Valor limite', item.valorLimite?.toString() ?? '');
    if (valorLimite === null) return;
    const observacoesItem = window.prompt('Observações', item.observacoes ?? '');
    if (observacoesItem === null) return;

    await withCedenteReload(async () => {
      await http.put(`/cadastros/cedentes/${cedenteId}/contratos/${item.id}`, {
        tipoContrato: tipoContrato.trim(),
        numeroContrato: numeroContrato.trim(),
        dataInicio: item.dataInicio,
        dataFim: item.dataFim,
        status: status.trim(),
        valorLimite: parseNumber(valorLimite),
        observacoes: observacoesItem.trim() || null,
      });

      toast.success('Contrato atualizado.');
    });
  };

  const removeContrato = async (item: ContratoDto) => {
    if (!window.confirm('Excluir contrato?')) {
      return;
    }

    await withCedenteReload(async () => {
      await http.delete(`/cadastros/cedentes/${cedenteId}/contratos/${item.id}`);
      toast.success('Contrato removido.');
    });
  };

  const addAtualizacao = async () => {
    if (!atualizacaoForm.titulo.trim()) {
      toast.error('Informe o título da atualização.');
      return;
    }

    await withCedenteReload(async () => {
      await http.post(`/cadastros/cedentes/${cedenteId}/atualizacoes`, {
        titulo: atualizacaoForm.titulo.trim(),
        descricao: atualizacaoForm.descricao.trim() || null,
        status: atualizacaoForm.status.trim() || 'Aberto',
        dataInicio: atualizacaoForm.dataInicio || new Date().toISOString(),
        dataFim: atualizacaoForm.dataFim || null,
        responsavel: atualizacaoForm.responsavel.trim() || null,
      });

      setAtualizacaoForm({
        titulo: '',
        descricao: '',
        status: 'Aberto',
        dataInicio: '',
        dataFim: '',
        responsavel: '',
      });

      toast.success('Atualização adicionada.');
    });
  };

  const updateAtualizacao = async (item: AtualizacaoDto) => {
    const titulo = window.prompt('Título da atualização', item.titulo);
    if (titulo === null) return;
    const status = window.prompt('Status', item.status);
    if (status === null) return;
    const responsavel = window.prompt('Responsável', item.responsavel ?? '');
    if (responsavel === null) return;
    const descricao = window.prompt('Descrição', item.descricao ?? '');
    if (descricao === null) return;

    await withCedenteReload(async () => {
      await http.put(`/cadastros/cedentes/${cedenteId}/atualizacoes/${item.id}`, {
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        status: status.trim(),
        dataInicio: item.dataInicio,
        dataFim: item.dataFim,
        responsavel: responsavel.trim() || null,
      });

      toast.success('Atualização atualizada.');
    });
  };

  const removeAtualizacao = async (item: AtualizacaoDto) => {
    if (!window.confirm('Excluir atualização?')) {
      return;
    }

    await withCedenteReload(async () => {
      await http.delete(`/cadastros/cedentes/${cedenteId}/atualizacoes/${item.id}`);
      toast.success('Atualização removida.');
    });
  };

  const addDespesa = async () => {
    if (!despesaForm.descricao.trim() || parseNumber(despesaForm.valor) === null) {
      toast.error('Informe descrição e valor da despesa.');
      return;
    }

    await withCedenteReload(async () => {
      await http.post(`/cadastros/cedentes/${cedenteId}/despesas`, {
        descricao: despesaForm.descricao.trim(),
        valor: parseNumber(despesaForm.valor),
        periodicidade: despesaForm.periodicidade.trim() || null,
        ativo: despesaForm.ativo,
      });

      setDespesaForm({
        descricao: '',
        valor: '',
        periodicidade: '',
        ativo: true,
      });

      toast.success('Despesa adicionada.');
    });
  };

  const updateDespesa = async (item: DespesaDto) => {
    const descricao = window.prompt('Descrição da despesa', item.descricao);
    if (descricao === null) return;
    const valor = window.prompt('Valor', item.valor.toString());
    if (valor === null) return;
    const periodicidade = window.prompt('Periodicidade', item.periodicidade ?? '');
    if (periodicidade === null) return;

    await withCedenteReload(async () => {
      const parsedValor = parseNumber(valor);
      if (parsedValor === null) {
        throw new Error('Valor de despesa inválido.');
      }

      await http.put(`/cadastros/cedentes/${cedenteId}/despesas/${item.id}`, {
        descricao: descricao.trim(),
        valor: parsedValor,
        periodicidade: periodicidade.trim() || null,
        ativo: item.ativo,
      });

      toast.success('Despesa atualizada.');
    });
  };

  const removeDespesa = async (item: DespesaDto) => {
    if (!window.confirm('Excluir despesa?')) {
      return;
    }

    await withCedenteReload(async () => {
      await http.delete(`/cadastros/cedentes/${cedenteId}/despesas/${item.id}`);
      toast.success('Despesa removida.');
    });
  };

  const addJuridico = async () => {
    if (!juridicoForm.tipoAcao.trim() || !juridicoForm.numeroProcesso.trim()) {
      toast.error('Preencha tipo de ação e número do processo.');
      return;
    }

    await withCedenteReload(async () => {
      await http.post(`/cadastros/cedentes/${cedenteId}/juridico`, {
        tipoAcao: juridicoForm.tipoAcao.trim(),
        numeroProcesso: juridicoForm.numeroProcesso.trim(),
        status: juridicoForm.status.trim() || 'Aberto',
        dataAtualizacao: juridicoForm.dataAtualizacao || new Date().toISOString(),
        observacoes: juridicoForm.observacoes.trim() || null,
      });

      setJuridicoForm({
        tipoAcao: '',
        numeroProcesso: '',
        status: 'Aberto',
        dataAtualizacao: '',
        observacoes: '',
      });

      toast.success('Registro jurídico adicionado.');
    });
  };

  const updateJuridico = async (item: JuridicoDto) => {
    const tipoAcao = window.prompt('Tipo de ação', item.tipoAcao);
    if (tipoAcao === null) return;
    const numeroProcesso = window.prompt('Número do processo', item.numeroProcesso);
    if (numeroProcesso === null) return;
    const status = window.prompt('Status', item.status);
    if (status === null) return;
    const observacoesItem = window.prompt('Observações', item.observacoes ?? '');
    if (observacoesItem === null) return;

    await withCedenteReload(async () => {
      await http.put(`/cadastros/cedentes/${cedenteId}/juridico/${item.id}`, {
        tipoAcao: tipoAcao.trim(),
        numeroProcesso: numeroProcesso.trim(),
        status: status.trim(),
        dataAtualizacao: item.dataAtualizacao,
        observacoes: observacoesItem.trim() || null,
      });

      toast.success('Registro jurídico atualizado.');
    });
  };

  const removeJuridico = async (item: JuridicoDto) => {
    if (!window.confirm('Excluir registro jurídico?')) {
      return;
    }

    await withCedenteReload(async () => {
      await http.delete(`/cadastros/cedentes/${cedenteId}/juridico/${item.id}`);
      toast.success('Registro jurídico removido.');
    });
  };

  const addPendencia = async () => {
    if (!pendenciaForm.titulo.trim()) {
      toast.error('Informe o título da pendência.');
      return;
    }

    await withCedenteReload(async () => {
      await http.post(`/cadastros/cedentes/${cedenteId}/pendencias`, {
        titulo: pendenciaForm.titulo.trim(),
        descricao: pendenciaForm.descricao.trim() || null,
        status: pendenciaForm.status.trim() || 'Aberto',
        prioridade: pendenciaForm.prioridade.trim() || null,
        prazo: pendenciaForm.prazo || null,
        resolucao: pendenciaForm.resolucao.trim() || null,
      });

      setPendenciaForm({
        titulo: '',
        descricao: '',
        status: 'Aberto',
        prioridade: '',
        prazo: '',
        resolucao: '',
      });

      toast.success('Pendência adicionada.');
    });
  };

  const updatePendencia = async (item: PendenciaDto) => {
    const titulo = window.prompt('Título da pendência', item.titulo);
    if (titulo === null) return;
    const status = window.prompt('Status da pendência', item.status);
    if (status === null) return;
    const prioridade = window.prompt('Prioridade', item.prioridade ?? '');
    if (prioridade === null) return;
    const descricao = window.prompt('Descrição', item.descricao ?? '');
    if (descricao === null) return;
    const resolucao = window.prompt('Resolução', item.resolucao ?? '');
    if (resolucao === null) return;

    await withCedenteReload(async () => {
      await http.put(`/cadastros/cedentes/${cedenteId}/pendencias/${item.id}`, {
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        status: status.trim(),
        prioridade: prioridade.trim() || null,
        prazo: item.prazo,
        resolucao: resolucao.trim() || null,
      });

      toast.success('Pendência atualizada.');
    });
  };

  const removePendencia = async (item: PendenciaDto) => {
    if (!window.confirm('Excluir pendência?')) {
      return;
    }

    await withCedenteReload(async () => {
      await http.delete(`/cadastros/cedentes/${cedenteId}/pendencias/${item.id}`);
      toast.success('Pendência removida.');
    });
  };

  const uploadAnexo = async () => {
    if (!anexoFile) {
      toast.error('Selecione um arquivo para anexo.');
      return;
    }

    await withCedenteReload(async () => {
      const formData = new FormData();
      formData.append('file', anexoFile);
      await http.post(`/cadastros/cedentes/${cedenteId}/anexos`, formData);
      setAnexoFile(null);
      toast.success('Anexo enviado.');
    });
  };

  const downloadAnexo = async (item: CadastroArquivoDto) => {
    if (!cedenteId) return;

    try {
      const response = await http.get(`/cadastros/cedentes/${cedenteId}/anexos/${item.id}/download`, {
        responseType: 'blob',
      });

      const fileName = parseFileName(response.headers['content-disposition'] ?? null, item.nomeArquivo);
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const removeAnexo = async (item: CadastroArquivoDto) => {
    if (!window.confirm(`Excluir anexo '${item.nomeArquivo}'?`)) {
      return;
    }

    await withCedenteReload(async () => {
      await http.delete(`/cadastros/cedentes/${cedenteId}/anexos/${item.id}`);
      toast.success('Anexo removido.');
    });
  };

  const addObservacao = async () => {
    if (!textoObservacao.trim()) {
      toast.error('Informe a observação.');
      return;
    }

    await withCedenteReload(async () => {
      await http.post(`/cadastros/cedentes/${cedenteId}/observacoes`, {
        texto: textoObservacao.trim(),
      });

      setTextoObservacao('');
      toast.success('Observação adicionada.');
    });
  };

  const removeObservacao = async (item: CadastroObservacaoDto) => {
    if (!window.confirm('Excluir observação?')) {
      return;
    }

    await withCedenteReload(async () => {
      await http.delete(`/cadastros/cedentes/${cedenteId}/observacoes/${item.id}`);
      toast.success('Observação removida.');
    });
  };

  const currentTitle = useMemo(
    () => (isEdit ? `Cedente: ${pessoaForm.nome || 'Editar'}` : 'Novo Cedente'),
    [isEdit, pessoaForm.nome],
  );

  const changeTab = (key: TabKey) => {
    if (!canAccessSubTabs && key !== 'cedente') {
      toast('Salve o cedente para liberar as abas complementares.');
      return;
    }

    setActiveTab(key);
  };

  const renderCedenteTab = () => (
    <form className="entity-form-stack" onSubmit={onSaveCedente}>
      <section className="entity-card">
        <header>
          <h3>Dados da Pessoa</h3>
          <p>Cadastro unificado por CPF/CNPJ na tabela de Pessoas.</p>
        </header>

        <div className="entity-grid cols-3">
          <label>
            <span>Nome</span>
            <input value={pessoaForm.nome} onChange={(event) => setPessoaForm((current) => ({ ...current, nome: event.target.value }))} required />
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
            <input type="checkbox" checked={cedenteAtivo} onChange={(event) => setCedenteAtivo(event.target.checked)} />
            <span>Cedente ativo</span>
          </label>
          <label>
            <span>Status</span>
            <input value={cedenteStatus} onChange={(event) => setCedenteStatus(event.target.value)} />
          </label>
          <label>
            <span>E-mail</span>
            <input type="email" value={pessoaForm.email} onChange={(event) => setPessoaForm((current) => ({ ...current, email: event.target.value }))} />
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
            <input value={pessoaForm.cidade} onChange={(event) => setPessoaForm((current) => ({ ...current, cidade: event.target.value }))} />
          </label>
          <label>
            <span>UF</span>
            <input maxLength={2} value={pessoaForm.uf} onChange={(event) => setPessoaForm((current) => ({ ...current, uf: event.target.value.toUpperCase() }))} />
          </label>
          <label className="span-all">
            <span>Observações gerais</span>
            <textarea rows={5} value={pessoaForm.observacoesGerais} onChange={(event) => setPessoaForm((current) => ({ ...current, observacoesGerais: event.target.value }))} />
          </label>
        </div>
      </section>

      {cedenteId ? (
        <section className="entity-card">
          <header>
            <h3>Fluxo de Aprovação</h3>
            <p>Ações de workflow alinhadas ao legado, com transição de status do cedente.</p>
          </header>
          <div className="entity-actions">
            {workflowActions.length === 0 ? <span>Nenhuma ação disponível para o status atual.</span> : null}
            {workflowActions.map((action) => (
              <button
                key={`${action.label}-${action.status}`}
                type="button"
                className="btn-main"
                onClick={() => void applyWorkflowStatus(action.status, action.ativo)}
              >
                {action.label}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="entity-card entity-form-stack">
        <header>
          <h3>Endereços</h3>
        </header>
        <div className="entity-grid cols-3">
          <label><span>CEP</span><input value={enderecoForm.cep} onChange={(event) => setEnderecoForm((c) => ({ ...c, cep: applyCepMask(event.target.value) }))} /></label>
          <label><span>Logradouro</span><input value={enderecoForm.logradouro} onChange={(event) => setEnderecoForm((c) => ({ ...c, logradouro: event.target.value }))} /></label>
          <label><span>Número</span><input value={enderecoForm.numero} onChange={(event) => setEnderecoForm((c) => ({ ...c, numero: event.target.value }))} /></label>
          <label><span>Complemento</span><input value={enderecoForm.complemento} onChange={(event) => setEnderecoForm((c) => ({ ...c, complemento: event.target.value }))} /></label>
          <label><span>Bairro</span><input value={enderecoForm.bairro} onChange={(event) => setEnderecoForm((c) => ({ ...c, bairro: event.target.value }))} /></label>
          <label><span>Cidade</span><input value={enderecoForm.cidade} onChange={(event) => setEnderecoForm((c) => ({ ...c, cidade: event.target.value }))} /></label>
          <label><span>UF</span><input maxLength={2} value={enderecoForm.uf} onChange={(event) => setEnderecoForm((c) => ({ ...c, uf: event.target.value.toUpperCase() }))} /></label>
          <label className="checkbox-inline"><input type="checkbox" checked={enderecoForm.principal} onChange={(event) => setEnderecoForm((c) => ({ ...c, principal: event.target.checked }))} /><span>Principal</span></label>
          <label className="checkbox-inline"><input type="checkbox" checked={Boolean(enderecoForm.cobranca)} onChange={(event) => setEnderecoForm((c) => ({ ...c, cobranca: event.target.checked }))} /><span>Cobrança</span></label>
          <div className="entity-inline-actions"><button type="button" className="btn-main" onClick={addPessoaEndereco}>Adicionar endereço</button></div>
        </div>
        <div className="entity-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Endereço</th>
                <th>Cidade</th>
                <th>UF</th>
                <th>Principal</th>
                <th>Cobrança</th>
                <th className="col-actions">Ações</th>
              </tr>
            </thead>
            <tbody>
              {pessoaForm.enderecos.length === 0 ? (
                <tr><td colSpan={6}>Nenhum endereço informado.</td></tr>
              ) : (
                pessoaForm.enderecos.map((item, index) => (
                  <tr key={`${item.cep}-${item.logradouro}-${index}`}>
                    <td>{`${item.logradouro}, ${item.numero}${item.complemento ? ` - ${item.complemento}` : ''} (${item.cep})`}</td>
                    <td>{item.cidade}</td>
                    <td>{item.uf}</td>
                    <td>{item.principal ? 'Sim' : 'Não'}</td>
                    <td>{item.cobranca ? 'Sim' : 'Não'}</td>
                    <td className="col-actions">
                      <div className="table-actions">
                        {!item.principal ? <button type="button" onClick={() => defineEnderecoPrincipal(index)}>Definir principal</button> : null}
                        {!item.cobranca ? <button type="button" onClick={() => defineEnderecoCobranca(index)}>Definir cobrança</button> : null}
                        <button type="button" className="danger" onClick={() => removePessoaEndereco(index)}>Excluir</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="entity-card entity-form-stack">
        <header><h3>Contato Adicional</h3></header>
        <div className="entity-grid cols-3">
          <label><span>Nome</span><input value={pessoaContatoForm.nome} onChange={(event) => setPessoaContatoForm((c) => ({ ...c, nome: event.target.value }))} /></label>
          <label><span>E-mail</span><input type="email" value={pessoaContatoForm.email} onChange={(event) => setPessoaContatoForm((c) => ({ ...c, email: event.target.value }))} /></label>
          <label>
            <span>Tipo</span>
            <select value={String(pessoaContatoForm.tipoContato)} onChange={(event) => setPessoaContatoForm((c) => ({ ...c, tipoContato: Number(event.target.value) }))}>
              {contatoTipoOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label><span>Telefone 1</span><input value={pessoaContatoForm.telefone1} onChange={(event) => setPessoaContatoForm((c) => ({ ...c, telefone1: applyPhoneMask(event.target.value) }))} /></label>
          <label><span>Telefone 2</span><input value={pessoaContatoForm.telefone2} onChange={(event) => setPessoaContatoForm((c) => ({ ...c, telefone2: applyPhoneMask(event.target.value) }))} /></label>
          <div className="entity-inline-actions"><button type="button" className="btn-main" onClick={addPessoaContato}>Adicionar contato</button></div>
        </div>
        <div className="entity-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Tipo</th>
                <th>E-mail</th>
                <th>Telefone</th>
                <th className="col-actions">Ações</th>
              </tr>
            </thead>
            <tbody>
              {pessoaForm.contatos.length === 0 ? (
                <tr><td colSpan={5}>Nenhum contato adicional informado.</td></tr>
              ) : (
                pessoaForm.contatos.map((item, index) => (
                  <tr key={`${item.email}-${item.nome}-${index}`}>
                    <td>{item.nome}</td>
                    <td>{contatoTipoOptions.find((x) => x.value === Number(item.tipoContato ?? 0))?.label ?? 'Cobrança'}</td>
                    <td>{item.email}</td>
                    <td>{item.telefone1}</td>
                    <td className="col-actions">
                      <div className="table-actions">
                        <button type="button" className="danger" onClick={() => removePessoaContato(index)}>Excluir</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="entity-card entity-form-stack">
        <header><h3>Quadro Societário (QSA)</h3></header>
        <div className="entity-grid cols-3">
          <label><span>Nome</span><input value={qsaForm.nome} onChange={(event) => setQsaForm((c) => ({ ...c, nome: event.target.value }))} /></label>
          <label><span>CPF/CNPJ</span><input value={qsaForm.documento} onChange={(event) => setQsaForm((c) => ({ ...c, documento: applyCpfCnpjMask(event.target.value) }))} /></label>
          <label><span>Qualificação</span><input value={qsaForm.qualificacao} onChange={(event) => setQsaForm((c) => ({ ...c, qualificacao: event.target.value }))} /></label>
          <label><span>Percentual</span><input value={qsaForm.percentual} onChange={(event) => setQsaForm((c) => ({ ...c, percentual: event.target.value }))} /></label>
          <div className="entity-inline-actions"><button type="button" className="btn-main" onClick={addPessoaQsa}>Adicionar QSA</button></div>
        </div>
        <div className="entity-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Documento</th>
                <th>Qualificação</th>
                <th>Percentual</th>
                <th className="col-actions">Ações</th>
              </tr>
            </thead>
            <tbody>
              {pessoaForm.qsas.length === 0 ? (
                <tr><td colSpan={5}>Nenhum registro de QSA informado.</td></tr>
              ) : (
                pessoaForm.qsas.map((item, index) => (
                  <tr key={`${item.documento}-${item.nome}-${index}`}>
                    <td>{item.nome}</td>
                    <td>{formatCpfCnpj(item.documento)}</td>
                    <td>{item.qualificacao || '-'}</td>
                    <td>{item.percentual ?? '-'}</td>
                    <td className="col-actions">
                      <div className="table-actions">
                        <button type="button" className="danger" onClick={() => removePessoaQsa(index)}>Excluir</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="entity-actions">
        <button type="button" className="btn-muted" onClick={() => navigate('/cadastro/cedentes')}>
          Voltar
        </button>
        <button type="submit" className="btn-main" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  );

  const renderComplementoTab = () => (
    <section className="entity-card entity-form-stack">
      <header><h3>Complemento</h3></header>
      <div className="entity-grid cols-3">
        <label>
          <span>Nome fantasia</span>
          <input value={complemento.nomeFantasia ?? ''} onChange={(event) => setComplemento((current) => ({ ...current, nomeFantasia: event.target.value }))} />
        </label>
        <label>
          <span>Segmento</span>
          <input value={complemento.segmento ?? ''} onChange={(event) => setComplemento((current) => ({ ...current, segmento: event.target.value }))} />
        </label>
        <label>
          <span>Classificação</span>
          <input value={complemento.classificacao ?? ''} onChange={(event) => setComplemento((current) => ({ ...current, classificacao: event.target.value }))} />
        </label>
        <label className="span-all">
          <span>Observações</span>
          <textarea rows={4} value={complemento.observacoes ?? ''} onChange={(event) => setComplemento((current) => ({ ...current, observacoes: event.target.value }))} />
        </label>
      </div>
      <div className="entity-actions">
        <button className="btn-main" onClick={() => void saveComplemento()}>Salvar complemento</button>
      </div>
    </section>
  );

  const renderContatosTab = () => (
    <section className="entity-form-stack">
      <section className="entity-card">
        <header><h3>Novo contato</h3></header>
        <div className="entity-grid cols-3">
          <label>
            <span>Tipo</span>
            <select value={String(contatoForm.tipoContato)} onChange={(event) => setContatoForm((current) => ({ ...current, tipoContato: Number(event.target.value) }))}>
              {contatoTipoOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label>
            <span>Nome</span>
            <input value={contatoForm.nome} onChange={(event) => setContatoForm((current) => ({ ...current, nome: event.target.value }))} />
          </label>
          <label>
            <span>E-mail</span>
            <input type="email" value={contatoForm.email} onChange={(event) => setContatoForm((current) => ({ ...current, email: event.target.value }))} />
          </label>
          <label>
            <span>Telefone 1</span>
            <input value={contatoForm.telefone1} onChange={(event) => setContatoForm((current) => ({ ...current, telefone1: applyPhoneMask(event.target.value) }))} />
          </label>
          <label>
            <span>Telefone 2</span>
            <input value={contatoForm.telefone2} onChange={(event) => setContatoForm((current) => ({ ...current, telefone2: applyPhoneMask(event.target.value) }))} />
          </label>
          <label className="span-all">
            <span>Observações</span>
            <textarea rows={3} value={contatoForm.observacoes} onChange={(event) => setContatoForm((current) => ({ ...current, observacoes: event.target.value }))} />
          </label>
          <div className="entity-inline-actions">
            <button className="btn-main" onClick={() => void addContato()}>Adicionar contato</button>
          </div>
        </div>
      </section>
      <section className="entity-card">
        <div className="entity-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Tipo</th>
                <th>E-mail</th>
                <th>Telefone</th>
                <th className="col-actions">Ações</th>
              </tr>
            </thead>
            <tbody>
              {contatos.map((item) => (
                <tr key={item.id}>
                  <td>{item.nome}</td>
                  <td>{contatoTipoOptions.find((x) => x.value === Number(item.tipoContato ?? 0))?.label ?? 'Cobrança'}</td>
                  <td>{item.email}</td>
                  <td>{item.telefone1}</td>
                  <td className="col-actions">
                    <div className="table-actions">
                      <button onClick={() => void updateContato(item)}>Editar</button>
                      <button className="danger" onClick={() => void removeContato(item)}>Excluir</button>
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

  const renderRepresentantesTab = () => (
    <section className="entity-form-stack">
      <section className="entity-card">
        <header>
          <h3>Vincular representante</h3>
          <p>Precisa criar um novo? <Link to="/cadastro/representantes/novo">Abrir cadastro de representantes</Link></p>
        </header>
        <div className="entity-grid cols-3">
          <label>
            <span>Representante</span>
            <select value={selectedRepresentanteId} onChange={(event) => setSelectedRepresentanteId(event.target.value)}>
              <option value="">Selecione...</option>
              {representanteOptions.map((item) => (
                <option key={item.id} value={item.id}>{item.nome} ({formatCpfCnpj(item.cnpjCpf)})</option>
              ))}
            </select>
          </label>
          <label>
            <span>Função</span>
            <input value={funcaoRepresentante} onChange={(event) => setFuncaoRepresentante(event.target.value)} />
          </label>
          <div className="entity-inline-actions">
            <button className="btn-main" onClick={() => void addRepresentante()}>Vincular</button>
          </div>
        </div>
      </section>
      <section className="entity-card">
        <div className="entity-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Documento</th>
                <th>Função</th>
                <th>Status</th>
                <th className="col-actions">Ações</th>
              </tr>
            </thead>
            <tbody>
              {representantes.map((item) => (
                <tr key={item.id}>
                  <td>{item.nomeRepresentante}</td>
                  <td>{formatCpfCnpj(item.documentoRepresentante)}</td>
                  <td>{item.funcao || '-'}</td>
                  <td>{item.ativo ? 'Ativo' : 'Inativo'}</td>
                  <td className="col-actions">
                    <div className="table-actions">
                      <button onClick={() => void updateRepresentante(item)}>Editar</button>
                      <button onClick={() => void toggleRepresentante(item)}>{item.ativo ? 'Inativar' : 'Ativar'}</button>
                      <button className="danger" onClick={() => void removeRepresentante(item)}>Excluir</button>
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

  const renderContasTab = () => (
    <section className="entity-form-stack">
      <section className="entity-card">
        <header><h3>Nova conta</h3></header>
        <div className="entity-grid cols-3">
          <label>
            <span>Banco</span>
            <select
              value={contaForm.bancoId}
              onChange={(event) => {
                const selected = bancoOptions.find((item) => item.id === event.target.value);
                setContaForm((current) => ({
                  ...current,
                  bancoId: event.target.value,
                  bancoNome: selected?.nome ?? current.bancoNome,
                }));
              }}
            >
              <option value="">Selecione...</option>
              {bancoOptions.map((item) => (
                <option key={item.id} value={item.id}>{item.nome}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Nome banco</span>
            <input value={contaForm.bancoNome} onChange={(event) => setContaForm((current) => ({ ...current, bancoNome: event.target.value }))} />
          </label>
          <label>
            <span>Agência</span>
            <input value={contaForm.agencia} onChange={(event) => setContaForm((current) => ({ ...current, agencia: event.target.value }))} />
          </label>
          <label>
            <span>Número conta</span>
            <input value={contaForm.numeroConta} onChange={(event) => setContaForm((current) => ({ ...current, numeroConta: event.target.value }))} />
          </label>
          <label>
            <span>Tipo</span>
            <input value={contaForm.tipoConta} onChange={(event) => setContaForm((current) => ({ ...current, tipoConta: event.target.value }))} />
          </label>
          <label className="checkbox-inline">
            <input type="checkbox" checked={contaForm.principal} onChange={(event) => setContaForm((current) => ({ ...current, principal: event.target.checked }))} />
            <span>Principal</span>
          </label>
          <label className="checkbox-inline">
            <input type="checkbox" checked={contaForm.ativo} onChange={(event) => setContaForm((current) => ({ ...current, ativo: event.target.checked }))} />
            <span>Ativa</span>
          </label>
          <div className="entity-inline-actions">
            <button className="btn-main" onClick={() => void addConta()}>Adicionar conta</button>
          </div>
        </div>
      </section>
      <section className="entity-card">
        <div className="entity-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Banco</th>
                <th>Agência</th>
                <th>Conta</th>
                <th>Tipo</th>
                <th>Status</th>
                <th className="col-actions">Ações</th>
              </tr>
            </thead>
            <tbody>
              {contas.map((item) => (
                <tr key={item.id}>
                  <td>{item.bancoNome}</td>
                  <td>{item.agencia}</td>
                  <td>{item.numeroConta}</td>
                  <td>{item.tipoConta || '-'}</td>
                  <td>{item.ativo ? 'Ativa' : 'Inativa'}</td>
                  <td className="col-actions">
                    <div className="table-actions">
                      <button onClick={() => void updateConta(item)}>Editar</button>
                      <button className="danger" onClick={() => void removeConta(item)}>Excluir</button>
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

  const renderDocumentosTab = () => (
    <section className="entity-form-stack">
      <section className="entity-card">
        <header><h3>Novo documento</h3></header>
        <div className="entity-grid cols-3">
          <label>
            <span>Tipo documento</span>
            <input value={tipoDocumento} onChange={(event) => setTipoDocumento(event.target.value)} />
          </label>
          <label className="span-all">
            <span>Arquivo</span>
            <input type="file" onChange={(event) => setDocumentoFile(event.target.files?.[0] ?? null)} />
          </label>
          <div className="entity-inline-actions">
            <button className="btn-main" onClick={() => void uploadDocumento()}>Enviar documento</button>
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
                <th>Status IA</th>
                <th>Data</th>
                <th className="col-actions">Ações</th>
              </tr>
            </thead>
            <tbody>
              {documentos.map((item) => (
                <tr key={item.id}>
                  <td>{item.tipoDocumento}</td>
                  <td>{item.nomeArquivo}</td>
                  <td>{item.validacaoIaStatus || '-'}</td>
                  <td>{formatDateTime(item.createdAt)}</td>
                  <td className="col-actions">
                    <div className="table-actions">
                      <button onClick={() => void downloadDocumento(item)}>Download</button>
                      <button className="danger" onClick={() => void removeDocumento(item)}>Excluir</button>
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

  const renderSimpleCrudRows = <T extends { id: string }>(
    rows: T[],
    headers: string[],
    mapRow: (item: T) => ReactNode[],
    onDelete: (item: T) => void,
    onEdit?: (item: T) => void,
    secondaryActionLabel = 'Editar',
  ) => (
    <div className="entity-table-wrap">
      <table>
        <thead>
          <tr>
            {headers.map((header) => <th key={header}>{header}</th>)}
            <th className="col-actions">Ações</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length + 1}>Nenhum registro encontrado.</td>
            </tr>
          ) : (
            rows.map((item) => (
              <tr key={item.id}>
                {mapRow(item)}
                <td className="col-actions">
                  <div className="table-actions">
                    {onEdit ? <button onClick={() => onEdit(item)}>{secondaryActionLabel}</button> : null}
                    <button className="danger" onClick={() => onDelete(item)}>Excluir</button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const renderParametrizacaoTab = () => (
    <section className="entity-form-stack">
      <section className="entity-card">
        <header>
          <h3>Parametrização</h3>
          <p>Configuração completa por modalidade, igual ao cadastro de empresa.</p>
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
      </section>
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
          <label className="checkbox-inline">
            <input type="checkbox" checked={Boolean(parametrizacaoForm.habilitado)} onChange={(event) => setParametrizacaoForm((c) => ({ ...c, habilitado: event.target.checked }))} />
            <span>Habilitado</span>
          </label>
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
        <button className="btn-main" onClick={() => void saveParametrizacao()}>Salvar parametrização</button>
      </div>
      <section className="entity-card">
        {renderSimpleCrudRows(
          parametrizacoes,
          ['Modalidade', 'Limite', 'Taxa Min/Max', 'Habilitado'],
          (item) => [<td key="m">{item.modalidadeNome}</td>, <td key="l">{item.limite ?? '-'}</td>, <td key="x">{item.taxaMinima ?? '-'} / {item.taxaMaxima ?? '-'}</td>, <td key="h">{item.habilitado ? 'Sim' : 'Não'}</td>],
          (item) => void removeParametrizacao(item),
          (item) => applyParametrizacao(item),
        )}
      </section>
    </section>
  );

  const renderContratosTab = () => (
    <section className="entity-form-stack">
      <section className="entity-card">
        <header><h3>Novo contrato</h3></header>
        <div className="entity-grid cols-3">
          <label><span>Tipo</span><input value={contratoForm.tipoContrato} onChange={(event) => setContratoForm((c) => ({ ...c, tipoContrato: event.target.value }))} /></label>
          <label><span>Número</span><input value={contratoForm.numeroContrato} onChange={(event) => setContratoForm((c) => ({ ...c, numeroContrato: event.target.value }))} /></label>
          <label><span>Status</span><input value={contratoForm.status} onChange={(event) => setContratoForm((c) => ({ ...c, status: event.target.value }))} /></label>
          <label><span>Data início</span><input type="datetime-local" value={contratoForm.dataInicio} onChange={(event) => setContratoForm((c) => ({ ...c, dataInicio: event.target.value }))} /></label>
          <label><span>Data fim</span><input type="datetime-local" value={contratoForm.dataFim} onChange={(event) => setContratoForm((c) => ({ ...c, dataFim: event.target.value }))} /></label>
          <label><span>Valor limite</span><input value={contratoForm.valorLimite} onChange={(event) => setContratoForm((c) => ({ ...c, valorLimite: event.target.value }))} /></label>
          <label className="span-all"><span>Observações</span><textarea rows={3} value={contratoForm.observacoes} onChange={(event) => setContratoForm((c) => ({ ...c, observacoes: event.target.value }))} /></label>
          <div className="entity-inline-actions"><button className="btn-main" onClick={() => void addContrato()}>Adicionar</button></div>
        </div>
      </section>
      <section className="entity-card">
        {renderSimpleCrudRows(
          contratos,
          ['Tipo', 'Número', 'Status', 'Início'],
          (item) => [<td key="t">{item.tipoContrato}</td>, <td key="n">{item.numeroContrato}</td>, <td key="s">{item.status}</td>, <td key="d">{formatDateTime(item.dataInicio)}</td>],
          (item) => void removeContrato(item),
          (item) => void updateContrato(item),
        )}
      </section>
    </section>
  );

  const renderAtualizacoesTab = () => (
    <section className="entity-form-stack">
      <section className="entity-card">
        <header><h3>Nova atualização</h3></header>
        <div className="entity-grid cols-3">
          <label><span>Título</span><input value={atualizacaoForm.titulo} onChange={(event) => setAtualizacaoForm((c) => ({ ...c, titulo: event.target.value }))} /></label>
          <label><span>Status</span><input value={atualizacaoForm.status} onChange={(event) => setAtualizacaoForm((c) => ({ ...c, status: event.target.value }))} /></label>
          <label><span>Responsável</span><input value={atualizacaoForm.responsavel} onChange={(event) => setAtualizacaoForm((c) => ({ ...c, responsavel: event.target.value }))} /></label>
          <label><span>Data início</span><input type="datetime-local" value={atualizacaoForm.dataInicio} onChange={(event) => setAtualizacaoForm((c) => ({ ...c, dataInicio: event.target.value }))} /></label>
          <label><span>Data fim</span><input type="datetime-local" value={atualizacaoForm.dataFim} onChange={(event) => setAtualizacaoForm((c) => ({ ...c, dataFim: event.target.value }))} /></label>
          <label className="span-all"><span>Descrição</span><textarea rows={3} value={atualizacaoForm.descricao} onChange={(event) => setAtualizacaoForm((c) => ({ ...c, descricao: event.target.value }))} /></label>
          <div className="entity-inline-actions"><button className="btn-main" onClick={() => void addAtualizacao()}>Adicionar</button></div>
        </div>
      </section>
      <section className="entity-card">
        {renderSimpleCrudRows(
          atualizacoes,
          ['Título', 'Status', 'Responsável', 'Início'],
          (item) => [<td key="t">{item.titulo}</td>, <td key="s">{item.status}</td>, <td key="r">{item.responsavel || '-'}</td>, <td key="d">{formatDateTime(item.dataInicio)}</td>],
          (item) => void removeAtualizacao(item),
          (item) => void updateAtualizacao(item),
        )}
      </section>
    </section>
  );

  const renderDespesasTab = () => (
    <section className="entity-form-stack">
      <section className="entity-card">
        <header><h3>Nova despesa</h3></header>
        <div className="entity-grid cols-3">
          <label><span>Descrição</span><input value={despesaForm.descricao} onChange={(event) => setDespesaForm((c) => ({ ...c, descricao: event.target.value }))} /></label>
          <label><span>Valor</span><input value={despesaForm.valor} onChange={(event) => setDespesaForm((c) => ({ ...c, valor: event.target.value }))} /></label>
          <label><span>Periodicidade</span><input value={despesaForm.periodicidade} onChange={(event) => setDespesaForm((c) => ({ ...c, periodicidade: event.target.value }))} /></label>
          <label className="checkbox-inline"><input type="checkbox" checked={despesaForm.ativo} onChange={(event) => setDespesaForm((c) => ({ ...c, ativo: event.target.checked }))} /><span>Ativa</span></label>
          <div className="entity-inline-actions"><button className="btn-main" onClick={() => void addDespesa()}>Adicionar</button></div>
        </div>
      </section>
      <section className="entity-card">
        {renderSimpleCrudRows(
          despesas,
          ['Descrição', 'Valor', 'Periodicidade', 'Status'],
          (item) => [<td key="d">{item.descricao}</td>, <td key="v">{item.valor}</td>, <td key="p">{item.periodicidade || '-'}</td>, <td key="s">{item.ativo ? 'Ativa' : 'Inativa'}</td>],
          (item) => void removeDespesa(item),
          (item) => void updateDespesa(item),
        )}
      </section>
    </section>
  );

  const renderJuridicoTab = () => (
    <section className="entity-form-stack">
      <section className="entity-card">
        <header><h3>Novo registro jurídico</h3></header>
        <div className="entity-grid cols-3">
          <label><span>Tipo ação</span><input value={juridicoForm.tipoAcao} onChange={(event) => setJuridicoForm((c) => ({ ...c, tipoAcao: event.target.value }))} /></label>
          <label><span>Número processo</span><input value={juridicoForm.numeroProcesso} onChange={(event) => setJuridicoForm((c) => ({ ...c, numeroProcesso: event.target.value }))} /></label>
          <label><span>Status</span><input value={juridicoForm.status} onChange={(event) => setJuridicoForm((c) => ({ ...c, status: event.target.value }))} /></label>
          <label><span>Data atualização</span><input type="datetime-local" value={juridicoForm.dataAtualizacao} onChange={(event) => setJuridicoForm((c) => ({ ...c, dataAtualizacao: event.target.value }))} /></label>
          <label className="span-all"><span>Observações</span><textarea rows={3} value={juridicoForm.observacoes} onChange={(event) => setJuridicoForm((c) => ({ ...c, observacoes: event.target.value }))} /></label>
          <div className="entity-inline-actions"><button className="btn-main" onClick={() => void addJuridico()}>Adicionar</button></div>
        </div>
      </section>
      <section className="entity-card">
        {renderSimpleCrudRows(
          juridicos,
          ['Tipo', 'Processo', 'Status', 'Atualização'],
          (item) => [<td key="t">{item.tipoAcao}</td>, <td key="n">{item.numeroProcesso}</td>, <td key="s">{item.status}</td>, <td key="d">{formatDateTime(item.dataAtualizacao)}</td>],
          (item) => void removeJuridico(item),
          (item) => void updateJuridico(item),
        )}
      </section>
    </section>
  );

  const renderPendenciasTab = () => (
    <section className="entity-form-stack">
      <section className="entity-card">
        <header><h3>Nova pendência</h3></header>
        <div className="entity-grid cols-3">
          <label><span>Título</span><input value={pendenciaForm.titulo} onChange={(event) => setPendenciaForm((c) => ({ ...c, titulo: event.target.value }))} /></label>
          <label><span>Status</span><input value={pendenciaForm.status} onChange={(event) => setPendenciaForm((c) => ({ ...c, status: event.target.value }))} /></label>
          <label><span>Prioridade</span><input value={pendenciaForm.prioridade} onChange={(event) => setPendenciaForm((c) => ({ ...c, prioridade: event.target.value }))} /></label>
          <label><span>Prazo</span><input type="datetime-local" value={pendenciaForm.prazo} onChange={(event) => setPendenciaForm((c) => ({ ...c, prazo: event.target.value }))} /></label>
          <label className="span-all"><span>Descrição</span><textarea rows={3} value={pendenciaForm.descricao} onChange={(event) => setPendenciaForm((c) => ({ ...c, descricao: event.target.value }))} /></label>
          <label className="span-all"><span>Resolução</span><textarea rows={3} value={pendenciaForm.resolucao} onChange={(event) => setPendenciaForm((c) => ({ ...c, resolucao: event.target.value }))} /></label>
          <div className="entity-inline-actions"><button className="btn-main" onClick={() => void addPendencia()}>Adicionar</button></div>
        </div>
      </section>
      <section className="entity-card">
        {renderSimpleCrudRows(
          pendencias,
          ['Título', 'Status', 'Prioridade', 'Prazo'],
          (item) => [<td key="t">{item.titulo}</td>, <td key="s">{item.status}</td>, <td key="p">{item.prioridade || '-'}</td>, <td key="d">{item.prazo ? formatDateTime(item.prazo) : '-'}</td>],
          (item) => void removePendencia(item),
          (item) => void updatePendencia(item),
        )}
      </section>
    </section>
  );

  const renderAnexosTab = () => (
    <section className="entity-form-stack">
      <section className="entity-card">
        <header><h3>Novo anexo</h3></header>
        <div className="entity-grid cols-3">
          <label className="span-all"><span>Arquivo</span><input type="file" onChange={(event) => setAnexoFile(event.target.files?.[0] ?? null)} /></label>
          <div className="entity-inline-actions"><button className="btn-main" onClick={() => void uploadAnexo()}>Enviar anexo</button></div>
        </div>
      </section>
      <section className="entity-card">
        {renderSimpleCrudRows(
          anexos,
          ['Arquivo', 'Tamanho', 'Data'],
          (item) => [<td key="n">{item.nomeArquivo}</td>, <td key="t">{(item.tamanhoBytes / 1024).toFixed(1)} KB</td>, <td key="d">{formatDateTime(item.createdAt)}</td>],
          (item) => void removeAnexo(item),
          (item) => void downloadAnexo(item),
          'Download',
        )}
      </section>
    </section>
  );

  const renderObservacoesTab = () => (
    <section className="entity-form-stack">
      <section className="entity-card">
        <header><h3>Nova observação</h3></header>
        <div className="entity-grid cols-2">
          <label className="span-all"><span>Texto</span><textarea rows={4} value={textoObservacao} onChange={(event) => setTextoObservacao(event.target.value)} /></label>
          <div className="entity-inline-actions"><button className="btn-main" onClick={() => void addObservacao()}>Adicionar observação</button></div>
        </div>
      </section>
      <section className="entity-card">
        {renderSimpleCrudRows(
          observacoes,
          ['Texto', 'Autor', 'Data'],
          (item) => [<td key="t">{item.texto}</td>, <td key="a">{item.autorEmail || '-'}</td>, <td key="d">{formatDateTime(item.createdAt)}</td>],
          (item) => void removeObservacao(item),
        )}
      </section>
    </section>
  );

  const renderHistoricoTab = () => (
    <section className="entity-card entity-form-stack">
      <header><h3>Histórico de auditoria</h3></header>
      <div className="entity-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Ação</th>
              <th>Entidade</th>
              <th>Usuário</th>
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
      {cedenteId ? (
        <div className="pager">
          <span>{historicoPaged.totalItems} evento(s)</span>
          <div>
            <button disabled={historicoPaged.page <= 1} onClick={() => void loadHistorico(cedenteId, historicoPaged.page - 1)}>Anterior</button>
            <span>{historicoPaged.page} de {historicoPaged.totalPages}</span>
            <button disabled={historicoPaged.page >= historicoPaged.totalPages} onClick={() => void loadHistorico(cedenteId, historicoPaged.page + 1)}>Próxima</button>
          </div>
        </div>
      ) : null}
    </section>
  );

  const renderCurrentTab = () => {
    switch (activeTab) {
      case 'cedente':
        return renderCedenteTab();
      case 'complemento':
        return renderComplementoTab();
      case 'contatos':
        return renderContatosTab();
      case 'representantes':
        return renderRepresentantesTab();
      case 'contas':
        return renderContasTab();
      case 'documentos':
        return renderDocumentosTab();
      case 'parametrizacao':
        return renderParametrizacaoTab();
      case 'contratos':
        return renderContratosTab();
      case 'atualizacoes':
        return renderAtualizacoesTab();
      case 'despesas':
        return renderDespesasTab();
      case 'juridico':
        return renderJuridicoTab();
      case 'pendencias':
        return renderPendenciasTab();
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
      subtitle={isEdit ? 'Cadastro completo em tela cheia, com abas espelhando o legado.' : 'Novo cadastro de cedente com vínculo de pessoa.'}
      actions={<button className="btn-muted" onClick={() => navigate('/cadastro/cedentes')}>Voltar para listagem</button>}
    >
      <div className="entity-meta-bar">
        <span><strong>Pessoa:</strong> {pessoaId ?? 'Não vinculada'}</span>
        <span><strong>Documento:</strong> {formatCpfCnpj(pessoaForm.cnpjCpf)}</span>
        <span><strong>Status:</strong> {cedenteStatus}</span>
      </div>

      <div className="entity-tabs" role="tablist" aria-label="Abas de cadastro do cedente">
        {visibleTabs.map((tab) => {
          const disabled = !canAccessSubTabs && tab.key !== 'cedente';

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
      <EmpresaPickerDialog
        open={pickerOpen}
        options={contextEmpresas.filter((item) => selectedEmpresaIds.includes(item.id)).map((item) => ({ id: item.id, nome: item.nome }))}
        onClose={() => {
          setPickerOpen(false);
          setPickerCallback(null);
        }}
        onConfirm={(empresaId) => {
          const callback = pickerCallback;
          setPickerOpen(false);
          setPickerCallback(null);
          if (!callback) {
            return;
          }

          void callback(empresaId).catch((error) => {
            toast.error(getErrorMessage(error));
          });
        }}
      />
    </PageFrame>
  );
};
