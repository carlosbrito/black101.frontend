import type { MovimentacaoApiItem, MovimentacaoListRow, MovimentacoesFilters } from '../types';

const getContaLabel = (conta: MovimentacaoApiItem['conta'] | MovimentacaoApiItem['contaDestino']) => {
  if (!conta) {
    return 'N/A';
  }

  if (conta.descricao && conta.descricao.trim().length > 0) {
    return conta.descricao;
  }

  const banco = String(conta.banco?.codigo ?? '').padStart(3, '0');
  const agencia = conta.agencia ?? 'N/A';
  const numeroConta = conta.numeroConta ?? 'N/A';
  return `${banco} - AG. ${agencia} - CC. ${numeroConta}`;
};

const getTipoLabel = (tipoMovimento?: number) => {
  switch (tipoMovimento) {
    case 0:
      return 'Débito';
    case 1:
      return 'Crédito';
    case 2:
      return 'Transferência';
    default:
      return 'N/A';
  }
};

const getTipoColor = (tipoMovimento?: number) => {
  switch (tipoMovimento) {
    case 0:
    case 1:
      return 'rgba(0, 117, 183, 0.7)';
    case 2:
      return '#8e24aa';
    default:
      return '#d1d3d4';
  }
};

export const mapMovimentacaoListItem = (item: MovimentacaoApiItem): MovimentacaoListRow => {
  const tipoLabel = getTipoLabel(item.tipoMovimento);
  const baixaLabel = item.pagamentoEfetuado ? 'Baixado' : 'Aberto';
  const contaLabel = getContaLabel(item.conta);
  const contaDestinoLabel = getContaLabel(item.contaDestino);

  let originalValue = item.valorPago ?? 0;
  let normalizedContaLabel = contaLabel;
  let destinoOrigemLabel = contaDestinoLabel;

  if (item.tipoMovimento === 0) {
    originalValue = item.valorDespesa || item.valorPago || 0;
  }

  if (item.tipoMovimento === 1) {
    originalValue = item.valorRecebimento || item.valorPago || 0;
  }

  if (item.tipoMovimento === 2) {
    if (item.valorDespesa) {
      originalValue = item.valorDespesa;
    } else if (item.valorRecebimento) {
      originalValue = item.valorRecebimento;
    } else {
      normalizedContaLabel = contaDestinoLabel;
      destinoOrigemLabel = contaLabel;
      originalValue = item.valorPago || 0;
    }
  }

  return {
    id: item.id,
    tipoLabel,
    tipoColor: getTipoColor(item.tipoMovimento),
    baixaLabel,
    baixaColor: baixaLabel === 'Baixado' ? '#008000' : '#20A8D8',
    descricao: item.descricao && item.descricao.trim().length > 0 ? item.descricao : 'N/A',
    fornecedorOrigem: item.fornecededor && item.fornecededor.trim().length > 0 ? item.fornecededor : 'N/A',
    cedenteNome: item.cedente?.pessoa?.nome ?? 'N/A',
    contaLabel: normalizedContaLabel,
    destinoOrigemLabel,
    planoDeContaLabel: item.planoDeConta?.descricao ?? 'N/A',
    originalValue,
    hasExtraLine: (item.totalizador ?? 0) !== 0,
    extraValue: (item.totalizador ?? 0) !== 0 ? item.totalizador ?? 0 : null,
    dataMovimento: item.dataMovimento ?? '',
    dateCreated: item.dateCreated ?? '',
  };
};

export const buildMovimentacoesQueryParams = (filters: MovimentacoesFilters) => {
  const params = new URLSearchParams({
    start: filters.start,
    end: filters.end,
    Sort: filters.sort,
    Orderby: filters.orderBy,
    page: String(filters.page),
    pageSize: String(filters.pageSize),
  });

  const appendIfFilled = (key: string, value: string | null) => {
    const trimmed = value?.trim();
    if (trimmed) {
      params.set(key, trimmed);
    }
  };

  appendIfFilled('tipo', filters.tipo);
  appendIfFilled('status', filters.status);
  appendIfFilled('contaId', filters.contaId);
  appendIfFilled('planoDeConta', filters.planoDeConta);
  appendIfFilled('cedente', filters.cedente);
  appendIfFilled('keyword', filters.keyword);

  return params;
};
