import { useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../app/auth/AuthContext';
import './login.css';

export const LoginPage = () => {
  const [email, setEmail] = useState('admin@black101.local');
  const [password, setPassword] = useState('Master@5859');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'credentials' | 'twofactor'>('credentials');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorQrCode, setTwoFactorQrCode] = useState('');
  const [twoFactorSetupRequired, setTwoFactorSetupRequired] = useState(false);
  const [twoFactorResetKey, setTwoFactorResetKey] = useState(false);
  const [twoFactorType, setTwoFactorType] = useState<1 | 2>(1);

  const { login, completeLegacyTwoFactor, generateLegacyTwoFactorQrCode, resendLegacyTwoFactorCode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirect = (location.state as { from?: string } | null)?.from ?? '/';

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const result = await login(email, password, rememberMe);
      if (result.status === 'two_factor_required') {
        setStep('twofactor');
        setTwoFactorQrCode(result.challenge.qrCode);
        setTwoFactorSetupRequired(result.challenge.requiresTwoFactorSetup);
        toast('Informe o código de autenticação de dois fatores.');
        return;
      }

      toast.success('Login realizado.');
      navigate(redirect, { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha no login.');
    } finally {
      setLoading(false);
    }
  };

  const onGenerateQrCode = async (type: 1 | 2) => {
    setLoading(true);
    try {
      const qrCode = await generateLegacyTwoFactorQrCode(email, type);
      if (!qrCode) {
        toast.error('Não foi possível gerar o QR Code.');
        return;
      }
      setTwoFactorType(type);
      setTwoFactorQrCode(qrCode);
      toast.success('QR Code gerado.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao gerar QR Code.');
    } finally {
      setLoading(false);
    }
  };

  const onResendCode = async () => {
    setLoading(true);
    try {
      const sent = await resendLegacyTwoFactorCode(email);
      setTwoFactorResetKey(true);
      if (sent) {
        toast.success('Código reenviado para o e-mail.');
      } else {
        toast.error('Não foi possível reenviar o código.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao reenviar o código.');
    } finally {
      setLoading(false);
    }
  };

  const onSubmitTwoFactor = async (event: FormEvent) => {
    event.preventDefault();
    const code = twoFactorCode.replace(/\D/g, '');
    if (code.length !== 6) {
      toast.error('Informe os 6 dígitos do código.');
      return;
    }

    setLoading(true);
    try {
      await completeLegacyTwoFactor({
        email,
        code,
        resetKey: twoFactorResetKey,
        tipoAutenticacao2FA: twoFactorType,
      });
      toast.success('Login realizado.');
      navigate(redirect, { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha na validação do código.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-shell">
      <section className="login-brand-panel" aria-hidden="true">
        <div className="login-brand-mark">
          <img className="login-brand-logo" src="/black101-logo.png" alt="Black101" />
        </div>
        <div className="login-brand-copy">
          <h2>Portal FIDC</h2>
          <p>Segurança, performance e UX fluida para o novo Black101.</p>
        </div>
      </section>

      <section className="login-card">
        <h1>Acesse sua conta</h1>
        <p>Autenticação por cookie httpOnly com proteção CSRF.</p>

        {step === 'credentials' ? (
          <form onSubmit={onSubmit}>
            <label>
              <span>E-mail</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>

            <label>
              <span>Senha</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>

            <label className="remember-row">
              <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
              <span>Manter conectado</span>
            </label>

            <button type="submit" disabled={loading}>{loading ? 'Entrando...' : 'Login'}</button>
          </form>
        ) : (
          <form onSubmit={onSubmitTwoFactor}>
            {twoFactorSetupRequired ? (
              <div className="twofa-box">
                <span className="twofa-label">Configuração inicial do 2FA</span>
                <div className="twofa-row">
                  <button type="button" className="btn-muted" onClick={() => void onGenerateQrCode(1)} disabled={loading}>
                    App Black101
                  </button>
                  <button type="button" className="btn-muted" onClick={() => void onGenerateQrCode(2)} disabled={loading}>
                    Google Authenticator
                  </button>
                </div>
                {twoFactorQrCode ? (
                  <img className="twofa-qrcode" src={twoFactorQrCode} alt="QR Code 2FA" />
                ) : null}
              </div>
            ) : null}

            <label>
              <span>Código 2FA</span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={twoFactorCode}
                onChange={(event) => setTwoFactorCode(event.target.value.replace(/\D/g, ''))}
                required
              />
            </label>

            <div className="twofa-row">
              <button type="button" className="btn-muted" onClick={() => void onResendCode()} disabled={loading}>
                Reenviar por e-mail
              </button>
              <button type="button" className="btn-muted" onClick={() => setStep('credentials')} disabled={loading}>
                Voltar
              </button>
            </div>

            <button type="submit" disabled={loading}>{loading ? 'Validando...' : 'Validar código'}</button>
          </form>
        )}
      </section>
    </main>
  );
};
