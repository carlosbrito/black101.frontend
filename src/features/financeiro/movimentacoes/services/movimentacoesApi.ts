import { http } from '../../../../shared/api/http';
import type {
  MovimentacaoAccountBalanceCard,
  MovimentacaoApiItem,
  MovimentacaoHistoryItem,
  MovimentacaoOption,
  MovimentacoesFilters,
  MovimentacoesListResponse,
} from '../types';
import { buildMovimentacoesQueryParams } from '../mappers/movimentacoesMappers';

type MovimentacoesApiEnvelope = {
  items?: MovimentacaoApiItem[];
  page?: number;
  pageSize?: number;
  totalItems?: number;
};

type SaldoContaApiItem = {
  conta?: {
    id?: string;
    descricao?: string;
    banco?: { codigo?: number | null };
    agencia?: string;
    numeroConta?: string;
  };
  valorSaldo?: number;
  saldo?: number;
};

const formatConta = (item: SaldoContaApiItem) => {
  const conta = item.conta;
  if (!conta) {
    return 'Conta não identificada';
  }

  if (conta.descricao) {
    return conta.descricao;
  }

  const banco = String(conta.banco?.codigo ?? '').padStart(3, '0');
  return `${banco} - AG. ${conta.agencia ?? 'N/A'} - CC. ${conta.numeroConta ?? 'N/A'}`;
};

export const listMovimentacoes = async (filters: MovimentacoesFilters): Promise<MovimentacoesListResponse> => {
  const response = await http.get<MovimentacoesApiEnvelope>('/MovimentoFinanceiro/get/list', {
    params: buildMovimentacoesQueryParams(filters),
  });

  return {
    items: response.data.items ?? [],
    page: response.data.page ?? filters.page,
    pageSize: response.data.pageSize ?? filters.pageSize,
    totalItems: response.data.totalItems ?? 0,
  };
};

export const listMovimentacoesAccountBalances = async (filters: MovimentacoesFilters): Promise<MovimentacaoAccountBalanceCard[]> => {
  const response = await http.get<SaldoContaApiItem[]>('/MovimentoFinanceiro/get/saldoContas', {
    params: buildMovimentacoesQueryParams(filters),
  });

  return (response.data ?? []).map((item, index) => ({
    id: item.conta?.id ?? `saldo-${index}`,
    title: item.conta?.descricao ?? 'Saldo da conta',
    subtitle: formatConta(item),
    amount: item.valorSaldo ?? item.saldo ?? 0,
  }));
};

const mapSimpleOptions = (items: Array<Record<string, unknown>>, resolver: (item: Record<string, unknown>) => MovimentacaoOption | null) =>
  items.map(resolver).filter((item): item is MovimentacaoOption => item !== null);

export const listContaOptions = async (): Promise<MovimentacaoOption[]> => {
  const response = await http.get<Array<Record<string, unknown>>>('/conta/get/contas');
  return mapSimpleOptions(response.data ?? [], (item) => {
    const id = String(item.id ?? '');
    const descricao = String(item.descricao ?? '');
    return id && descricao ? { value: id, label: descricao } : null;
  });
};

export const listPlanoContaOptions = async (): Promise<MovimentacaoOption[]> => {
  const response = await http.get<Array<Record<string, unknown>>>('/PlanoConta/get/planoContas');
  return mapSimpleOptions(response.data ?? [], (item) => {
    const id = String(item.id ?? '');
    const descricao = String(item.descricao ?? '');
    return id && descricao ? { value: id, label: descricao } : null;
  });
};

export const listCedenteOptions = async (): Promise<MovimentacaoOption[]> => {
  const response = await http.get<Array<Record<string, unknown>>>('/cedente/get/cedentes');
  return mapSimpleOptions(response.data ?? [], (item) => {
    const id = String(item.id ?? '');
    const nome = String((item.pessoa as { nome?: string } | undefined)?.nome ?? item.nome ?? '');
    return id && nome ? { value: id, label: nome } : null;
  });
};

export const getMovimentacaoById = async (id: string): Promise<MovimentacaoApiItem> => {
  const response = await http.get<MovimentacaoApiItem>(`/MovimentoFinanceiro/get/unique/${id}`);
  return response.data;
};

export const createMovimentacao = async (formData: FormData) => {
  await http.post('/MovimentoFinanceiro/register', formData);
};

export const updateMovimentacao = async (formData: FormData) => {
  await http.post('/MovimentoFinanceiro/update', formData);
};

export const deleteMovimentacao = async (id: string) => {
  await http.delete(`/MovimentoFinanceiro/remove/${id}`);
};

export const deleteMovimentacoesBatch = async (payload: { ids: string[]; observacao: string }) => {
  await http.post('/MovimentoFinanceiro/removerLote', payload);
};

export const settleMovimentacoesBatch = async (payload: {
  ids: string[];
  desconto: number;
  juros: number;
  multa: number;
  dataPagamento: string;
}) => {
  await http.post('/MovimentoFinanceiro/baixaLote', payload);
};

export const reopenMovimentacoesBatch = async (payload: { ids: string[] }) => {
  await http.post('/MovimentoFinanceiro/abrirBaixaLote', payload);
};

export const getMovimentacaoHistory = async (id: string): Promise<MovimentacaoHistoryItem[]> => {
  const response = await http.get<{ items?: Array<Record<string, unknown>> }>('/historico/get/list', {
    params: {
      id,
      ASSOCIACAO: 'MOVIMENTO_FINANCEIRO',
      Sort: 'DateCreated',
      Orderby: 'desc',
    },
  });

  return (response.data.items ?? []).map((item, index) => ({
    id: String(item.id ?? `history-${index}`),
    acao: String(item.acao ?? ''),
    time: String(item.dateCreated ?? ''),
    user: String(item.userEmail ?? ''),
  }));
};

export const exportMovimentacoesExcel = async (filters: MovimentacoesFilters) => {
  await http.get('/MovimentoFinanceiro/get/list/export', {
    params: buildMovimentacoesQueryParams(filters),
  });
};

export const generateMovimentacoesAccountingReport = async (payload: { start: string; end: string }) => {
  await http.post('/movimentofinanceiro/GerarRelatorioContabilidade', payload);
};
