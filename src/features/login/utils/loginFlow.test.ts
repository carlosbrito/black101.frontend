import { describe, expect, it } from 'vitest';
import {
  buildTwoFactorValidationPayload,
  normalizeLegacyLoginResult,
  resolveInitialTwoFactorMode,
} from './loginFlow';

describe('loginFlow', () => {
  it('normaliza login autenticado quando token esta disponivel', () => {
    const result = normalizeLegacyLoginResult({ token: 'jwt-token' });

    expect(result).toEqual({
      kind: 'authenticated',
      token: 'jwt-token',
    });
  });

  it('normaliza login com setup de 2fa', () => {
    const result = normalizeLegacyLoginResult({
      requiresTwoFactorSetup: true,
      qrCode: 'data:image/png;base64,abc',
    });

    expect(result.kind).toBe('two_factor_required');
    expect(result.requiresTwoFactorSetup).toBe(true);
    expect(result.qrCode).toBe('data:image/png;base64,abc');
  });

  it('normaliza login com qr direto', () => {
    const result = normalizeLegacyLoginResult({
      requiresTwoFactorCode: true,
      qrCode: 'data:image/png;base64,xyz',
    });

    expect(result.kind).toBe('two_factor_required');
    expect(result.requiresTwoFactorSetup).toBe(false);
    expect(result.qrCode).toBe('data:image/png;base64,xyz');
  });

  it('normaliza login com selecao de metodo quando nao ha qr', () => {
    const result = normalizeLegacyLoginResult({
      requiresTwoFactorCode: true,
      qrCode: '',
    });

    expect(result.kind).toBe('two_factor_required');
    expect(result.requiresTwoFactorSetup).toBe(false);
    expect(result.qrCode).toBe('');
  });

  it('resolve modo inicial do 2fa a partir da resposta do backend', () => {
    expect(resolveInitialTwoFactorMode({ requiresTwoFactorSetup: true, qrCode: '' })).toBe('two_factor_setup_qr');
    expect(resolveInitialTwoFactorMode({ requiresTwoFactorSetup: false, qrCode: 'data:image/png;base64,abc' })).toBe('two_factor_qr');
    expect(resolveInitialTwoFactorMode({ requiresTwoFactorSetup: false, qrCode: '' })).toBe('two_factor_method_selection');
  });

  it('monta payload de validacao do 2fa', () => {
    expect(
      buildTwoFactorValidationPayload({
        email: 'user@black101.local',
        code: '123456',
        resetKey: true,
        tipoAutenticacao2FA: 3,
      }),
    ).toEqual({
      userEmail: 'user@black101.local',
      code: '123456',
      resetKey: true,
      tipoAutenticacao2FA: 3,
    });
  });
});
