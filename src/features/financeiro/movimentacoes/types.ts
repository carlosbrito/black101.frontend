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
  tipoMovimento?: number;
  pagamentoEfetuado?: boolean;
  valorDespesa?: number;
  valorRecebimento?: number;
  valorPago?: number;
  totalizador?: number;
  descricao?: string | null;
  fornecededor?: string | null;
  cedente?: { pessoa?: { nome?: string | null } | null } | null;
  planoDeConta?: { descricao?: string | null } | null;
  conta?: {
    descricao?: string | null;
    banco?: { codigo?: number | null } | null;
    agencia?: string | null;
    numeroConta?: string | null;
  } | null;
  contaDestino?: {
    descricao?: string | null;
    banco?: { codigo?: number | null } | null;
    agencia?: string | null;
    numeroConta?: string | null;
  } | null;
  dataMovimento?: string;
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
};

export type MovimentacoesPermissions = {
  canEdit: boolean;
  canDelete: boolean;
  canDeleteBatch: boolean;
  canSettleBatch: boolean;
  canReopenBatch: boolean;
  canGenerateAccountingReport: boolean;
  canEditAutomaticDebit: boolean;
};
