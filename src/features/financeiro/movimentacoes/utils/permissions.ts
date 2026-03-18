import type { MovimentacoesPermissions } from '../types';

export const resolveMovimentacoesPermissions = (claims: string[]): MovimentacoesPermissions => {
  const allowed = new Set(claims);

  return {
    canEdit: allowed.has('E_MFI'),
    canDelete: allowed.has('R_MFI'),
    canDeleteBatch: allowed.has('R_MFI_LOTE'),
    canSettleBatch: allowed.has('E_MFI_BLT'),
    canReopenBatch: allowed.has('E_MFI_BLT'),
    canGenerateAccountingReport: allowed.has('W_RCT'),
    canEditAutomaticDebit: allowed.has('E_MFI_BAI'),
  };
};
