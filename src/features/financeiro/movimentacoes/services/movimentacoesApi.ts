import { http } from '../../../../shared/api/http';
import type { MovimentacaoAccountBalanceCard, MovimentacaoApiItem, MovimentacoesFilters, MovimentacoesListResponse } from '../types';
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
