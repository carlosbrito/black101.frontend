import { describe, expect, it } from 'vitest';
import { resolveMovimentacoesPermissions } from './permissions';

describe('resolveMovimentacoesPermissions', () => {
  it('mapeia as claims do legado para as acoes visiveis da feature', () => {
    const result = resolveMovimentacoesPermissions([
      'E_MFI',
      'R_MFI',
      'R_MFI_LOTE',
      'E_MFI_BLT',
      'W_RCT',
      'E_MFI_BAI',
    ]);

    expect(result.canEdit).toBe(true);
    expect(result.canDelete).toBe(true);
    expect(result.canDeleteBatch).toBe(true);
    expect(result.canSettleBatch).toBe(true);
    expect(result.canReopenBatch).toBe(true);
    expect(result.canGenerateAccountingReport).toBe(true);
    expect(result.canEditAutomaticDebit).toBe(true);
  });

  it('mantem desabilitadas as acoes nao autorizadas quando a claim nao existe', () => {
    const result = resolveMovimentacoesPermissions([]);

    expect(result.canEdit).toBe(false);
    expect(result.canDelete).toBe(false);
    expect(result.canDeleteBatch).toBe(false);
    expect(result.canSettleBatch).toBe(false);
    expect(result.canReopenBatch).toBe(false);
    expect(result.canGenerateAccountingReport).toBe(false);
    expect(result.canEditAutomaticDebit).toBe(false);
  });
});
