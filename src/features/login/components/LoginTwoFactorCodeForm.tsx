import type { FormEvent } from 'react';

export const LoginTwoFactorCodeForm = ({
  code,
  loading,
  infoText,
  resendLabel,
  canResendEmail,
  onCodeChange,
  onSubmit,
  onBack,
  onResendEmail,
}: {
  code: string;
  loading: boolean;
  infoText: string;
  resendLabel: string;
  canResendEmail: boolean;
  onCodeChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onBack: () => void;
  onResendEmail: () => void;
}) => (
  <form onSubmit={onSubmit}>
    <p>{infoText}</p>
    <label>
      <span>Código de autenticação</span>
      <input
        type="text"
        inputMode="numeric"
        maxLength={6}
        value={code}
        onChange={(event) => onCodeChange(event.target.value.replace(/\D/g, ''))}
        required
      />
    </label>
    <div className="twofa-actions">
      <button type="button" className="btn-muted" onClick={onBack} disabled={loading}>Voltar</button>
      <button type="submit" disabled={loading}>{loading ? 'Validando...' : 'Validar código'}</button>
    </div>
    <div className="twofa-inline-actions">
      <button type="button" className="btn-link" onClick={onResendEmail} disabled={loading || !canResendEmail}>
        Reenviar código por e-mail
      </button>
      <small>{resendLabel}</small>
    </div>
  </form>
);
