type MovimentacaoFormType = 'Debito' | 'Credito' | 'Transferencia';

type MovimentacaoFormInput = {
  valor?: number;
  valorPago?: number;
  planoDeContaId?: string;
  contaId?: string;
  contaDestinoId?: string;
  cedenteId?: string;
  pagamentoEfetuado?: boolean;
  numeroReferencia?: string;
  dataPagamento?: string;
  dataVencimento?: string;
  dataMovimento: string;
  descricao?: string;
  fornecededor?: string;
};

type BatchSettlementInput = {
  ids: string[];
  desconto: number;
  juros: number;
  multa: number;
  dataPagamento: string;
};

const movementTypeToLegacyCode: Record<MovimentacaoFormType, string> = {
  Debito: '0',
  Credito: '1',
  Transferencia: '2',
};

export const buildMovimentacaoFormData = (type: MovimentacaoFormType, input: MovimentacaoFormInput) => {
  const formData = new FormData();

  if (type === 'Transferencia') {
    formData.set('contaId', input.contaId ?? '');
    formData.set('contaDestinoId', input.contaDestinoId ?? '');
    formData.set('dataMovimento', input.dataMovimento);
    formData.set('dataPagamento', input.dataMovimento);
    formData.set('valor', String(input.valor ?? 0));
    formData.set('descricao', input.descricao ?? '');
    formData.set('tipoMovimento', movementTypeToLegacyCode[type]);
    return formData;
  }

  formData.set('Valor', String(input.valor ?? 0));
  formData.set('ValorPago', String(input.valorPago ?? 0));
  formData.set('PlanoDeContaId', input.planoDeContaId ?? '');
  formData.set('ContaId', input.contaId ?? '');
  formData.set('CedenteId', input.cedenteId ?? '');
  formData.set('PagamentoEfetuado', String(Boolean(input.pagamentoEfetuado)));
  formData.set('NumeroReferencia', input.numeroReferencia ?? '');
  formData.set('DataPagamento', input.dataPagamento ?? '');
  formData.set('DataVencimento', input.dataVencimento ?? '');
  formData.set('DataMovimento', input.dataMovimento);
  formData.set('Descricao', input.descricao ?? '');
  formData.set('TipoMovimento', movementTypeToLegacyCode[type]);

  if (type === 'Debito' && input.fornecededor) {
    formData.set('Fornecededor', input.fornecededor.toUpperCase());
  }

  return formData;
};

export const buildBatchSettlementPayload = (input: BatchSettlementInput) => ({
  ids: input.ids,
  desconto: input.desconto,
  juros: input.juros,
  multa: input.multa,
  dataPagamento: input.dataPagamento,
});
