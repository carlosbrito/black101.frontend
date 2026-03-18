import type { TwoFactorAuthType } from '../../../app/auth/AuthContext';

const typeNames: Record<TwoFactorAuthType, string> = {
  1: 'Black101 Authenticator',
  2: 'Google Authenticator',
};

export const LoginTwoFactorQrPanel = ({
  qrCode,
  selectedType,
  expired,
  countdownLabel,
  loading,
  onReload,
}: {
  qrCode: string;
  selectedType: TwoFactorAuthType;
  expired: boolean;
  countdownLabel: string;
  loading: boolean;
  onReload: () => void;
}) => (
  <div className="twofa-box">
    <span className="twofa-label">Configuração do 2FA</span>
    <p>Escaneie o QR Code com o aplicativo <strong>{typeNames[selectedType]}</strong> e informe o código gerado.</p>
    {qrCode ? <img className="twofa-qrcode" src={qrCode} alt="QR Code 2FA" /> : <div className="twofa-qrcode twofa-qrcode--empty">QR Code indisponível</div>}
    <div className="twofa-status-row">
      <small>{expired ? 'QR Code expirado.' : `QR Code válido por ${countdownLabel}.`}</small>
      <button type="button" className="btn-muted" onClick={onReload} disabled={loading}>
        {loading ? 'Gerando...' : expired ? 'Gerar novo QR Code' : 'Atualizar QR Code'}
      </button>
    </div>
  </div>
);
