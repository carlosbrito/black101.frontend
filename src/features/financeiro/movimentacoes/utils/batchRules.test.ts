import { describe, expect, it } from 'vitest';
import { validateBatchReopenSelection, validateBatchSettlementSelection } from './batchRules';

const baseItem = {
  id: '1',
  tipoCode: 0,
  tipoLabel: 'Débito',
  baixaLabel: 'Aberto',
};

describe('validateBatchSettlementSelection', () => {
  it('aceita itens do mesmo tipo e em aberto para baixa em lote', () => {
    expect(validateBatchSettlementSelection([baseItem, { ...baseItem, id: '2' }])).toEqual({ valid: true });
  });

  it('bloqueia itens de tipos diferentes', () => {
    expect(validateBatchSettlementSelection([baseItem, { ...baseItem, id: '2', tipoCode: 1, tipoLabel: 'Crédito' }])).toEqual({
      valid: false,
      message: 'Selecione registros que sejam do mesmo tipo.',
    });
  });
});

describe('validateBatchReopenSelection', () => {
  it('bloqueia itens que nao estao baixados', () => {
    expect(validateBatchReopenSelection([baseItem])).toEqual({
      valid: false,
      message: 'Ao menos um item selecionado não está baixado.',
    });
  });

  it('bloqueia reabertura para transferencias', () => {
    expect(validateBatchReopenSelection([{ ...baseItem, baixaLabel: 'Baixado', tipoCode: 2, tipoLabel: 'Transferência' }])).toEqual({
      valid: false,
      message: 'Não é possível reabrir transferências.',
    });
  });
});
