import type { LegacyEmailTwoFactorType, TwoFactorAuthType } from '../../../app/auth/AuthContext';

type LoginTwoFactorMethod = TwoFactorAuthType | LegacyEmailTwoFactorType;

const methodLabels: Record<LoginTwoFactorMethod, { title: string; description: string }> = {
  1: {
    title: 'Black101 Authenticator',
    description: 'Use o aplicativo Black101 para gerar ou escanear o QR Code.',
  },
  2: {
    title: 'Google Authenticator',
    description: 'Use o Google Authenticator ou outro app compatível.',
  },
  3: {
    title: 'Código por e-mail',
    description: 'Receba um código temporário e valide o acesso sem o autenticador.',
  },
};

export const LoginTwoFactorMethodPicker = ({
  methods,
  loading,
  title,
  onSelect,
}: {
  methods: LoginTwoFactorMethod[];
  loading: boolean;
  title: string;
  onSelect: (type: LoginTwoFactorMethod) => void;
}) => (
  <div className="twofa-stack">
    <div className="twofa-box">
      <span className="twofa-label">{title}</span>
      <div className="twofa-method-list">
        {methods.map((type) => (
          <button
            key={type}
            type="button"
            className="twofa-method-card"
            onClick={() => onSelect(type)}
            disabled={loading}
          >
            <strong>{methodLabels[type].title}</strong>
            <span>{methodLabels[type].description}</span>
          </button>
        ))}
      </div>
    </div>
  </div>
);
