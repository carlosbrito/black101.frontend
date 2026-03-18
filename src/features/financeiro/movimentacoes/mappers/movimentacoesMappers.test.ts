import { describe, expect, it } from 'vitest';
import { buildMovimentacoesQueryParams, mapMovimentacaoListItem } from './movimentacoesMappers';

describe('mapMovimentacaoListItem', () => {
  it('mapeia um debito com status, valor principal e fallbacks de exibicao', () => {
    const result = mapMovimentacaoListItem({
      id: '1',
      tipoMovimento: 0,
      pagamentoEfetuado: false,
      valorDespesa: 1250.45,
      valorRecebimento: 0,
      valorPago: 0,
      totalizador: 2200,
      descricao: '',
      fornecededor: '',
      cedente: null,
      planoDeConta: { descricao: 'Despesa Operacional' },
      conta: { descricao: '', banco: { codigo: 341 }, agencia: '1234', numeroConta: '9999-1' },
      contaDestino: null,
      dataMovimento: '2026-03-18T00:00:00',
      dateCreated: '2026-03-18T10:00:00',
    });

    expect(result.tipoLabel).toBe('Débito');
    expect(result.baixaLabel).toBe('Aberto');
    expect(result.originalValue).toBe(1250.45);
    expect(result.descricao).toBe('N/A');
    expect(result.fornecedorOrigem).toBe('N/A');
    expect(result.cedenteNome).toBe('N/A');
    expect(result.contaLabel).toBe('341 - AG. 1234 - CC. 9999-1');
    expect(result.planoDeContaLabel).toBe('Despesa Operacional');
    expect(result.hasExtraLine).toBe(true);
  });

  it('mapeia transferencia usando valorPago como fallback e invertendo conta de origem quando necessario', () => {
    const result = mapMovimentacaoListItem({
      id: '2',
      tipoMovimento: 2,
      pagamentoEfetuado: true,
      valorDespesa: 0,
      valorRecebimento: 0,
      valorPago: 900,
      totalizador: 0,
      descricao: 'Transferencia entre contas',
      fornecededor: 'Tesouraria',
      cedente: { pessoa: { nome: 'Cedente XPTO' } },
      planoDeConta: null,
      conta: { descricao: 'Conta Origem', banco: { codigo: 1 }, agencia: '0001', numeroConta: '12345-6' },
      contaDestino: { descricao: 'Conta Destino', banco: { codigo: 33 }, agencia: '0002', numeroConta: '65432-1' },
      dataMovimento: '2026-03-18T00:00:00',
      dateCreated: '2026-03-18T10:00:00',
    });

    expect(result.tipoLabel).toBe('Transferência');
    expect(result.baixaLabel).toBe('Baixado');
    expect(result.originalValue).toBe(900);
    expect(result.contaLabel).toBe('Conta Destino');
    expect(result.destinoOrigemLabel).toBe('Conta Origem');
    expect(result.cedenteNome).toBe('Cedente XPTO');
  });
});

describe('buildMovimentacoesQueryParams', () => {
  it('monta os parametros da listagem com trim e nomes esperados pelo backend legado', () => {
    const result = buildMovimentacoesQueryParams({
      start: '2026-03-18',
      end: '2026-03-18',
      sort: 'dataMovimento',
      orderBy: 'desc',
      page: 0,
      pageSize: 100,
      tipo: '1',
      status: 'Aberto',
      contaId: 'conta-1',
      planoDeConta: '  plano-x  ',
      cedente: '  cedente y  ',
      keyword: '  termo livre  ',
    });

    expect(result.get('start')).toBe('2026-03-18');
    expect(result.get('end')).toBe('2026-03-18');
    expect(result.get('Sort')).toBe('dataMovimento');
    expect(result.get('Orderby')).toBe('desc');
    expect(result.get('page')).toBe('0');
    expect(result.get('pageSize')).toBe('100');
    expect(result.get('tipo')).toBe('1');
    expect(result.get('status')).toBe('Aberto');
    expect(result.get('contaId')).toBe('conta-1');
    expect(result.get('planoDeConta')).toBe('plano-x');
    expect(result.get('cedente')).toBe('cedente y');
    expect(result.get('keyword')).toBe('termo livre');
  });
});
