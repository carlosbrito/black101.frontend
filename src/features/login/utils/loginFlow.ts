export type LegacyTwoFactorType = 1 | 2 | 3;

export type LegacyLoginModel = {
  token?: string;
  qrCode?: string;
  requiresTwoFactorCode?: boolean;
  requiresTwoFactorSetup?: boolean;
};

export type NormalizedLegacyLoginResult =
  | {
      kind: 'authenticated';
      token: string;
    }
  | {
      kind: 'two_factor_required';
      requiresTwoFactorSetup: boolean;
      qrCode: string;
    };

export type LoginFlowStep =
  | 'credentials'
  | 'two_factor_method_selection'
  | 'two_factor_setup_qr'
  | 'two_factor_qr'
  | 'two_factor_code';

export const normalizeLegacyLoginResult = (model: LegacyLoginModel): NormalizedLegacyLoginResult => {
  if (model.token && !model.requiresTwoFactorCode && !model.requiresTwoFactorSetup) {
    return {
      kind: 'authenticated',
      token: model.token,
    };
  }

  return {
    kind: 'two_factor_required',
    requiresTwoFactorSetup: Boolean(model.requiresTwoFactorSetup),
    qrCode: model.qrCode ?? '',
  };
};

export const resolveInitialTwoFactorMode = (input: {
  requiresTwoFactorSetup: boolean;
  qrCode: string;
}): LoginFlowStep => {
  if (input.requiresTwoFactorSetup) {
    return 'two_factor_setup_qr';
  }

  if (input.qrCode.trim().length > 0) {
    return 'two_factor_qr';
  }

  return 'two_factor_method_selection';
};

export const buildTwoFactorValidationPayload = (input: {
  email: string;
  code: string;
  resetKey: boolean;
  tipoAutenticacao2FA: LegacyTwoFactorType;
}) => ({
  userEmail: input.email,
  code: input.code,
  resetKey: input.resetKey,
  tipoAutenticacao2FA: input.tipoAutenticacao2FA,
});
