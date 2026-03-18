type BatchItem = {
  id: string;
  tipoCode: number;
  tipoLabel: string;
  baixaLabel: string;
};

type ValidationResult = { valid: true } | { valid: false; message: string };

const validateSameType = (items: BatchItem[]): ValidationResult => {
  if (items.length === 0) {
    return { valid: true };
  }

  const firstType = items[0].tipoCode;
  const sameType = items.every((item) => item.tipoCode === firstType);

  if (!sameType) {
    return { valid: false, message: 'Selecione registros que sejam do mesmo tipo.' };
  }

  return { valid: true };
};

export const validateBatchSettlementSelection = (items: BatchItem[]): ValidationResult => {
  const sameTypeValidation = validateSameType(items);
  if (!sameTypeValidation.valid) {
    return sameTypeValidation;
  }

  const allOpen = items.every((item) => item.baixaLabel === 'Aberto');
  if (!allOpen) {
    return { valid: false, message: 'Ao menos um item selecionado já foi baixado.' };
  }

  return { valid: true };
};

export const validateBatchReopenSelection = (items: BatchItem[]): ValidationResult => {
  const sameTypeValidation = validateSameType(items);
  if (!sameTypeValidation.valid) {
    return sameTypeValidation;
  }

  const allSettled = items.every((item) => item.baixaLabel === 'Baixado');
  if (!allSettled) {
    return { valid: false, message: 'Ao menos um item selecionado não está baixado.' };
  }

  const containsTransfer = items.some((item) => item.tipoCode === 2);
  if (containsTransfer) {
    return { valid: false, message: 'Não é possível reabrir transferências.' };
  }

  return { valid: true };
};
