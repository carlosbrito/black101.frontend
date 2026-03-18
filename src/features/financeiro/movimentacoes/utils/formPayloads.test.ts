import { describe, expect, it } from 'vitest';
import { buildBatchSettlementPayload, buildMovimentacaoFormData } from './formPayloads';

describe('buildMovimentacaoFormData', () => {
  it('monta payload de debito com campos principais esperados pelo backend legado', () => {
    const formData = buildMovimentacaoFormData('Debito', {
      valor: 1200.5,
      valorPago: 1100,
      planoDeContaId: 'plano-1',
      contaId: 'conta-1',
      cedenteId: 'cedente-1',
      pagamentoEfetuado: true,
      numeroReferencia: 'REF-1',
      dataPagamento: '2026-03-18',
      dataVencimento: '2026-03-20',
      dataMovimento: '2026-03-18',
      descricao: 'Fornecedor XPTO',
      fornecededor: 'fornecedor xpto',
    });

    expect(formData.get('Valor')).toBe('1200.5');
    expect(formData.get('ValorPago')).toBe('1100');
    expect(formData.get('PlanoDeContaId')).toBe('plano-1');
    expect(formData.get('ContaId')).toBe('conta-1');
    expect(formData.get('CedenteId')).toBe('cedente-1');
    expect(formData.get('PagamentoEfetuado')).toBe('true');
    expect(formData.get('NumeroReferencia')).toBe('REF-1');
    expect(formData.get('DataPagamento')).toBe('2026-03-18');
    expect(formData.get('DataVencimento')).toBe('2026-03-20');
    expect(formData.get('DataMovimento')).toBe('2026-03-18');
    expect(formData.get('TipoMovimento')).toBe('0');
    expect(formData.get('Fornecededor')).toBe('FORNECEDOR XPTO');
  });

  it('monta payload de transferencia com nomes de campo em minusculo e dataPagamento igual a dataMovimento', () => {
    const formData = buildMovimentacaoFormData('Transferencia', {
      contaId: 'origem-1',
      contaDestinoId: 'destino-2',
      dataMovimento: '2026-03-18',
      valor: 900,
      descricao: 'Transferencia interna',
    });

    expect(formData.get('contaId')).toBe('origem-1');
    expect(formData.get('contaDestinoId')).toBe('destino-2');
    expect(formData.get('dataMovimento')).toBe('2026-03-18');
    expect(formData.get('dataPagamento')).toBe('2026-03-18');
    expect(formData.get('valor')).toBe('900');
    expect(formData.get('descricao')).toBe('Transferencia interna');
    expect(formData.get('tipoMovimento')).toBe('2');
  });
});

describe('buildBatchSettlementPayload', () => {
  it('monta payload de baixa em lote com ids e encargos opcionais', () => {
    expect(
      buildBatchSettlementPayload({
        ids: ['1', '2'],
        desconto: 10,
        juros: 5,
        multa: 2,
        dataPagamento: '2026-03-18',
      }),
    ).toEqual({
      ids: ['1', '2'],
      desconto: 10,
      juros: 5,
      multa: 2,
      dataPagamento: '2026-03-18',
    });
  });
});
