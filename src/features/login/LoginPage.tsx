import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth, type LegacyEmailTwoFactorType, type TwoFactorAuthType } from '../../app/auth/AuthContext';
import { LoginCredentialsForm } from './components/LoginCredentialsForm';
import { LoginTwoFactorCodeForm } from './components/LoginTwoFactorCodeForm';
import { LoginTwoFactorFlow } from './components/LoginTwoFactorFlow';
import { LoginTwoFactorMethodPicker } from './components/LoginTwoFactorMethodPicker';
import { LoginTwoFactorQrPanel } from './components/LoginTwoFactorQrPanel';
import {
  normalizeLegacyLoginResult,
  resolveInitialTwoFactorMode,
  type LoginFlowStep,
} from './utils/loginFlow';
import './login.css';

type AvailableTwoFactorMethod = TwoFactorAuthType | LegacyEmailTwoFactorType;

const DEFAULT_EMAIL = 'admin@black101.local';
const DEFAULT_PASSWORD = 'Master@5859';
const EMAIL_METHOD: LegacyEmailTwoFactorType = 3;

const trustHighlights = [
  {
    title: 'Autenticação blindada',
    description: '2FA por QR + código por e-mail com regeneração imediata do autenticador.',
  },
  {
    title: 'Monitoramento contínuo',
    description: 'Timers visuais e alertas com `aria-live` que mantêm você informado.',
  },
  {
    title: 'Design premium',
    description: 'Gradiente profundo + glassmorphism suave reforçam a confiança no acesso.',
  },
];

const getMethodTitle = (type: AvailableTwoFactorMethod) => {
  if (type === 1) return 'Black101 Authenticator';
  if (type === 2) return 'Google Authenticator';
  return 'código por e-mail';
};

const formatCountdown = (seconds: number) => {
  const safeSeconds = Math.max(seconds, 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const LoginPage = () => {
  const [email, setEmail] = useState(DEFAULT_EMAIL);
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<LoginFlowStep>('credentials');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorQrCode, setTwoFactorQrCode] = useState('');
  const [twoFactorSetupRequired, setTwoFactorSetupRequired] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<AvailableTwoFactorMethod>(EMAIL_METHOD);
  const [availableMethods, setAvailableMethods] = useState<AvailableTwoFactorMethod[]>([1, 2, EMAIL_METHOD]);
  const [resetKey, setResetKey] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [qrExpiresInSeconds, setQrExpiresInSeconds] = useState(60);
  const [qrExpired, setQrExpired] = useState(false);

  const {
    login,
    loginWithMicrosoft,
    hasMicrosoftSso,
    completeLegacyTwoFactor,
    generateLegacyTwoFactorQrCode,
    resendLegacyTwoFactorCode,
    sendLegacyEmailTwoFactorCode,
    getLegacyTwoFactorConfiguration,
  } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const redirect = (location.state as { from?: string } | null)?.from ?? '/';
  const emailMethodEnabled = availableMethods.includes(EMAIL_METHOD);

  useEffect(() => {
    if (!['two_factor_qr', 'two_factor_setup_qr'].includes(step) || !twoFactorQrCode) {
      return;
    }

    setQrExpired(false);
    setQrExpiresInSeconds(60);
    const interval = window.setInterval(() => {
      setQrExpiresInSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          setQrExpired(true);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [step, twoFactorQrCode]);

  useEffect(() => {
    if (resendSeconds <= 0) {
      return;
    }

    const interval = window.setInterval(() => {
      setResendSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [resendSeconds]);

  const twoFactorInfoText = useMemo(() => {
    const methodTitle = getMethodTitle(selectedMethod);
    if (selectedMethod === EMAIL_METHOD) {
      return `Enviamos um código de 6 dígitos para ${email}.`;
    }

    return `Abra o ${methodTitle} e informe o código de 6 dígitos gerado para concluir o login.`;
  }, [email, selectedMethod]);

  const moveToTwoFactorFlow = (input: {
    requiresTwoFactorSetup: boolean;
    qrCode: string;
    methods?: AvailableTwoFactorMethod[];
    selectedMethod?: AvailableTwoFactorMethod;
    resetKey?: boolean;
  }) => {
    setTwoFactorSetupRequired(input.requiresTwoFactorSetup);
    setTwoFactorQrCode(input.qrCode);
    setAvailableMethods(input.methods && input.methods.length ? input.methods : [1, 2, EMAIL_METHOD]);
    setSelectedMethod(input.selectedMethod ?? (input.requiresTwoFactorSetup ? 1 : EMAIL_METHOD));
    setResetKey(Boolean(input.resetKey));
    setTwoFactorCode('');
    setQrExpired(false);
    setStep(resolveInitialTwoFactorMode({
      requiresTwoFactorSetup: input.requiresTwoFactorSetup,
      qrCode: input.qrCode,
    }));
  };

  const continueAfterAuthenticatedLegacyLogin = async () => {
    try {
      const configuredMethods = await getLegacyTwoFactorConfiguration();
      if (!configuredMethods.length) {
        toast.success('Login realizado.');
        navigate(redirect, { replace: true });
        return;
      }

      await sendLegacyEmailTwoFactorCode(email);
      setAvailableMethods([...configuredMethods, EMAIL_METHOD]);
      setSelectedMethod(EMAIL_METHOD);
      setResetKey(false);
      setTwoFactorQrCode('');
      setTwoFactorSetupRequired(false);
      setTwoFactorCode('');
      setResendSeconds(60);
      setStep('two_factor_code');
      toast('Informe o código enviado por e-mail ou escolha outro método.');
    } catch {
      toast.success('Login realizado.');
      navigate(redirect, { replace: true });
    }
  };

  const handleLoginResult = async (result: {
    status: 'authenticated';
  } | {
    status: 'two_factor_required';
    challenge: {
      email: string;
      qrCode: string;
      requiresTwoFactorSetup: boolean;
    };
  }) => {
    if (result.status === 'two_factor_required') {
      if (result.challenge.email) {
        setEmail(result.challenge.email);
      }
      const normalized = normalizeLegacyLoginResult({
        requiresTwoFactorCode: true,
        requiresTwoFactorSetup: result.challenge.requiresTwoFactorSetup,
        qrCode: result.challenge.qrCode,
      });

      if (normalized.kind === 'two_factor_required') {
        moveToTwoFactorFlow({
          requiresTwoFactorSetup: normalized.requiresTwoFactorSetup,
          qrCode: normalized.qrCode,
          selectedMethod: normalized.requiresTwoFactorSetup ? 1 : normalized.qrCode ? 1 : EMAIL_METHOD,
          methods: [1, 2, EMAIL_METHOD],
        });
      }

      toast('Informe o código de autenticação de dois fatores.');
      return;
    }

    await continueAfterAuthenticatedLegacyLogin();
  };

  const onSubmitCredentials = async (event: FormEvent) => {
    event.preventDefault();
    if (!captchaToken) {
      setCaptchaError('Conclua a validação do captcha antes de continuar.');
      return;
    }

    setLoading(true);
    try {
      const result = await login(email, password, rememberMe, captchaToken);
      await handleLoginResult(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha no login.');
    } finally {
      setLoading(false);
    }
  };

  const onSubmitMicrosoft = async () => {
    setLoading(true);
    try {
      const result = await loginWithMicrosoft();
      await handleLoginResult(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha no login com Microsoft.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQrCode = async (type: TwoFactorAuthType) => {
    setLoading(true);
    try {
      const qrCode = await generateLegacyTwoFactorQrCode(email, type);
      if (!qrCode) {
        toast.error('Não foi possível gerar o QR Code.');
        return;
      }

      setSelectedMethod(type);
      setResetKey(false);
      setTwoFactorQrCode(qrCode);
      setQrExpired(false);
      setQrExpiresInSeconds(60);
      setStep('two_factor_qr');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao gerar o QR Code.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMethod = async (type: AvailableTwoFactorMethod) => {
    if (type === EMAIL_METHOD) {
      setLoading(true);
      try {
        await sendLegacyEmailTwoFactorCode(email);
        setSelectedMethod(EMAIL_METHOD);
        setResetKey(false);
        setTwoFactorQrCode('');
        setResendSeconds(60);
        setStep('two_factor_code');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Falha ao enviar o código por e-mail.');
      } finally {
        setLoading(false);
      }
      return;
    }

    await handleGenerateQrCode(type);
  };

  const handleResetAuthenticatorByEmail = async () => {
    setLoading(true);
    try {
      const sent = await resendLegacyTwoFactorCode(email);
      if (!sent) {
        toast.error('Não foi possível reenviar o código.');
        return;
      }

      setSelectedMethod(EMAIL_METHOD);
      setResetKey(true);
      setTwoFactorQrCode('');
      setResendSeconds(60);
      setStep('two_factor_code');
      toast.success('Código reenviado para o e-mail.');
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
      await completeLegacyTwoFactor({ email, code, resetKey, tipoAutenticacao2FA: selectedMethod });
      toast.success('Login realizado.');
      navigate(redirect, { replace: true });
    } catch (error) {
      setTwoFactorCode('');
      toast.error(error instanceof Error ? error.message : 'Falha na validação do código.');
    } finally {
      setLoading(false);
    }
  };

  const backToCredentials = () => {
    setStep('credentials');
    setTwoFactorCode('');
    setTwoFactorQrCode('');
    setTwoFactorSetupRequired(false);
    setSelectedMethod(EMAIL_METHOD);
    setResetKey(false);
    setAvailableMethods([1, 2, EMAIL_METHOD]);
    setQrExpired(false);
  };

  const backWithinTwoFactor = () => {
    if (twoFactorSetupRequired) {
      setStep('two_factor_setup_qr');
      return;
    }

    setStep('two_factor_method_selection');
  };

  return (
    <main className="login-shell">
      <div className="login-grid login-hero">
        <section className="login-card">
          <div className="login-card__header">
            <div className="login-card__logo-row">
              <img src="/black101-logo.png" alt="Black101" className="login-card__logo" />
              <div>
                <h1>Acesse sua conta</h1>
                <p>Autenticação moderna e legado com 2FA, captcha e Microsoft Entra.</p>
              </div>
            </div>
          </div>

          <div className="login-card__alerts">
            {captchaError ? (
              <div className="login-card__alert" role="alert">
                {captchaError}
              </div>
            ) : null}
          </div>

          {step === 'credentials' ? (
            <LoginCredentialsForm
              email={email}
              password={password}
              rememberMe={rememberMe}
              loading={loading}
              hasMicrosoftSso={hasMicrosoftSso}
              captchaToken={captchaToken}
              captchaError={captchaError}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              onRememberMeChange={setRememberMe}
              onCaptchaResolved={(token) => {
                setCaptchaToken(token);
                setCaptchaError(null);
              }}
              onCaptchaError={(error) => {
                setCaptchaToken(null);
                setCaptchaError(error);
              }}
              onCaptchaExpired={() => {
                setCaptchaToken(null);
                setCaptchaError('A verificação expirou. Valide novamente.');
              }}
              onSubmit={onSubmitCredentials}
              onMicrosoftLogin={() => void onSubmitMicrosoft()}
            />
          ) : (
            <LoginTwoFactorFlow
              title="Autenticação em dois fatores"
              subtitle="Conclua a etapa adicional de segurança para acessar o portal."
            >
              {step === 'two_factor_setup_qr' ? (
                <LoginTwoFactorMethodPicker
                  methods={[1, 2]}
                  loading={loading}
                  title="Escolha o autenticador para configurar o 2FA."
                  onSelect={(type) => void handleSelectMethod(type)}
                />
              ) : null}

              {['two_factor_qr', 'two_factor_setup_qr'].includes(step) && twoFactorQrCode ? (
                <LoginTwoFactorQrPanel
                  qrCode={twoFactorQrCode}
                  selectedType={selectedMethod === EMAIL_METHOD ? 1 : selectedMethod}
                  expired={qrExpired}
                  countdownLabel={formatCountdown(qrExpiresInSeconds)}
                  loading={loading}
                  onReload={() => void handleGenerateQrCode(selectedMethod === EMAIL_METHOD ? 1 : selectedMethod)}
                />
              ) : null}

              {(step === 'two_factor_method_selection' || step === 'two_factor_qr') ? (
                <LoginTwoFactorMethodPicker
                  methods={availableMethods}
                  loading={loading}
                  title={
                    twoFactorSetupRequired
                      ? 'Você também pode alternar o método antes de validar.'
                      : 'Escolha como deseja validar o código.'
                  }
                  onSelect={(type) => {
                    if (type === EMAIL_METHOD) {
                      void handleSelectMethod(type);
                      return;
                    }

                    void handleGenerateQrCode(type);
                  }}
                />
              ) : null}

              {step === 'two_factor_code' || step === 'two_factor_qr' ? (
                <LoginTwoFactorCodeForm
                  code={twoFactorCode}
                  loading={loading}
                  infoText={twoFactorInfoText}
                  resendLabel={
                    selectedMethod === EMAIL_METHOD
                      ? resendSeconds > 0
                        ? `Reenvio disponível em ${formatCountdown(resendSeconds)}`
                        : 'Você pode solicitar um novo código.'
                      : emailMethodEnabled
                        ? 'Se precisar, você pode migrar para o código por e-mail.'
                        : 'Abra o autenticador e informe o código gerado.'
                  }
                  canResendEmail={selectedMethod === EMAIL_METHOD ? resendSeconds === 0 : emailMethodEnabled}
                  onCodeChange={setTwoFactorCode}
                  onSubmit={onSubmitTwoFactor}
                  onBack={() => (step === 'two_factor_code' ? backWithinTwoFactor() : backWithinTwoFactor())}
                  onResendEmail={() => {
                    if (selectedMethod === EMAIL_METHOD) {
                      void handleSelectMethod(EMAIL_METHOD);
                      return;
                    }

                    void handleResetAuthenticatorByEmail();
                  }}
                />
              ) : null}

              <button type="button" className="btn-link btn-link--left" onClick={backToCredentials} disabled={loading}>
                Voltar para o login
              </button>
            </LoginTwoFactorFlow>
          )}
        </section>

        <aside className="login-aside" data-testid="login-aside">
          <div className="login-aside__brand">
            <h2>Portal FIDC</h2>
            <p>Acelere seu acesso com segurança inteligente e design premium.</p>
          </div>
          <div className="login-aside__trust-list">
            {trustHighlights.map((item) => (
              <article
                key={item.title}
                className="trust-card"
                data-testid="trust-card"
                tabIndex={0}
              >
                <h3 className="trust-card__title">{item.title}</h3>
                <p className="trust-card__desc">{item.description}</p>
              </article>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
};
