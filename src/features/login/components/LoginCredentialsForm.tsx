import type { FormEvent } from 'react';
import { LoginCaptchaField } from './LoginCaptchaField';

export const LoginCredentialsForm = ({
  email,
  password,
  rememberMe,
  loading,
  hasMicrosoftSso,
  captchaToken,
  captchaError,
  onEmailChange,
  onPasswordChange,
  onRememberMeChange,
  onCaptchaResolved,
  onCaptchaError,
  onCaptchaExpired,
  onSubmit,
  onMicrosoftLogin,
}: {
  email: string;
  password: string;
  rememberMe: boolean;
  loading: boolean;
  hasMicrosoftSso: boolean;
  captchaToken: string | null;
  captchaError: string | null;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onRememberMeChange: (checked: boolean) => void;
  onCaptchaResolved: (token: string) => void;
  onCaptchaError: (error: string) => void;
  onCaptchaExpired: () => void;
  onSubmit: (event: FormEvent) => void;
  onMicrosoftLogin: () => void;
}) => (
  <form onSubmit={onSubmit}>
    <label>
      <span>E-mail</span>
      <input type="email" value={email} onChange={(event) => onEmailChange(event.target.value)} required />
    </label>

    <label>
      <span>Senha</span>
      <input type="password" value={password} onChange={(event) => onPasswordChange(event.target.value)} required />
    </label>

    <LoginCaptchaField
      token={captchaToken}
      error={captchaError}
      disabled={loading}
      onResolved={onCaptchaResolved}
      onError={onCaptchaError}
      onExpired={onCaptchaExpired}
    />

    <label className="remember-row">
      <input type="checkbox" checked={rememberMe} onChange={(event) => onRememberMeChange(event.target.checked)} />
      <span>Manter conectado</span>
    </label>

    <button type="submit" disabled={loading}>{loading ? 'Entrando...' : 'Login'}</button>

    {hasMicrosoftSso ? (
      <button type="button" className="btn-muted" onClick={onMicrosoftLogin} disabled={loading}>
        {loading ? 'Conectando...' : 'Entrar com Microsoft'}
      </button>
    ) : null}
  </form>
);
