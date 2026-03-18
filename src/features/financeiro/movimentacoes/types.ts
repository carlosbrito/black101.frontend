export type MovimentacaoTipo = 'Debito' | 'Credito' | 'Transferencia';

export type MovimentacaoBaixaStatus = 'Aberto' | 'Baixado';

export type MovimentacaoDialogType =
  | 'none'
  | 'filter'
  | 'selection'
  | 'debito'
  | 'credito'
  | 'transferencia'
  | 'import'
  | 'import-review'
  | 'history'
  | 'batch-delete'
  | 'batch-settlement'
  | 'batch-reopen';

export type MovimentacoesSortField = 'dataMovimento' | 'tipo' | 'descricao' | 'conta' | 'planoDeConta' | 'fornecededor' | 'cedente' | 'valor' | 'baixa' | 'dateCreated';

export type MovimentacoesOrderBy = 'asc' | 'desc';

export type MovimentacoesFilters = {
  start: string;
  end: string;
  sort: MovimentacoesSortField;
  orderBy: MovimentacoesOrderBy;
  page: number;
  pageSize: number;
  tipo: string | null;
  status: string | null;
  contaId: string | null;
  planoDeConta: string | null;
  cedente: string | null;
  keyword: string | null;
};

export type MovimentacoesQueryState = MovimentacoesFilters;

export type MovimentacaoApiItem = {
  id: string;
  numeroDocumento?: string | null;
  tipoMovimento?: number;
  pagamentoEfetuado?: boolean;
  valorDespesa?: number;
  valorRecebimento?: number;
  valorPago?: number;
  totalizador?: number;
  descricao?: string | null;
  fornecededor?: string | null;
  conta?: {
    id?: string | null;
    descricao?: string | null;
    banco?: { codigo?: number | null } | null;
    agencia?: string | null;
    numeroConta?: string | null;
  } | null;
  contaDestino?: {
    id?: string | null;
    descricao?: string | null;
    banco?: { codigo?: number | null } | null;
    agencia?: string | null;
    numeroConta?: string | null;
  } | null;
  planoDeConta?: { id?: string | null; descricao?: string | null } | null;
  cedente?: { id?: string | null; pessoa?: { nome?: string | null } | null } | null;
  dataMovimento?: string;
  dataPagamento?: string | null;
  dataVencimento?: string | null;
  numeroReferencia?: string | null;
  geradoAutomatico?: boolean;
  dateCreated?: string;
};

export type MovimentacoesListResponse = {
  items: MovimentacaoApiItem[];
  page: number;
  pageSize: number;
  totalItems: number;
};

export type MovimentacaoAccountBalanceCard = {
  id: string;
  title: string;
  subtitle: string;
  amount: number;
};

export type MovimentacaoListRow = {
  id: string;
  tipoCode: number;
  tipoLabel: string;
  tipoColor: string;
  baixaLabel: string;
  baixaColor: string;
  descricao: string;
  fornecedorOrigem: string;
  cedenteNome: string;
  contaLabel: string;
  destinoOrigemLabel: string;
  planoDeContaLabel: string;
  originalValue: number;
  hasExtraLine: boolean;
  extraValue: number | null;
  dataMovimento: string;
  dateCreated: string;
  source: MovimentacaoApiItem;
};

export type MovimentacoesPermissions = {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canDeleteBatch: boolean;
  canSettleBatch: boolean;
  canReopenBatch: boolean;
  canGenerateAccountingReport: boolean;
  canExport: boolean;
  canImport: boolean;
  canViewHistory: boolean;
  canEditAutomaticDebit: boolean;
};

export type MovimentacaoOption = {
  value: string;
  label: string;
};

export type MovimentacaoHistoryItem = {
  id: string;
  acao: string;
  time: string;
  user: string;
};

export type MovimentacaoFormState = {
  id?: string;
  tipo: 'Debito' | 'Credito' | 'Transferencia';
  contaId: string;
  contaDestinoId: string;
  planoDeContaId: string;
  cedenteId: string;
  descricao: string;
  fornecededor: string;
  valor: string;
  valorPago: string;
  numeroReferencia: string;
  dataMovimento: string;
  dataPagamento: string;
  dataVencimento: string;
  pagamentoEfetuado: boolean;
};

export type MovimentacoesBatchSelectionItem = {
  id: string;
  tipoCode: number;
  tipoLabel: string;
  baixaLabel: string;
};

export type MovimentacaoImportPreviewItem = {
  id: string;
  data: string;
  historico: string;
  docto: string;
  credito: number;
  debito: number;
  planoContaId: string;
  transferenciaContaId: string;
  baixa: boolean;
};
