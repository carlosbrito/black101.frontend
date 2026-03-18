import { useEffect, useId, useRef, useState } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          theme?: 'light' | 'dark';
          callback?: (token: string) => void;
          'error-callback'?: (error?: string) => void;
          'expired-callback'?: () => void;
        },
      ) => string;
      remove?: (widgetId: string) => void;
      reset?: (widgetId?: string) => void;
    };
  }
}

const TURNSTILE_SCRIPT_ID = 'cloudflare-turnstile-script';

const ensureTurnstileScript = () =>
  new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(TURNSTILE_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      if (window.turnstile) {
        resolve();
        return;
      }

      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Falha ao carregar o Turnstile.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = TURNSTILE_SCRIPT_ID;
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Falha ao carregar o Turnstile.'));
    document.head.appendChild(script);
  });

export const LoginCaptchaField = ({
  token,
  error,
  disabled,
  onResolved,
  onError,
  onExpired,
}: {
  token: string | null;
  error: string | null;
  disabled: boolean;
  onResolved: (token: string) => void;
  onError: (error: string) => void;
  onExpired: () => void;
}) => {
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim();
  const fallbackId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(Boolean(siteKey));

  useEffect(() => {
    if (!siteKey || !containerRef.current) {
      return;
    }

    let cancelled = false;

    void ensureTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) {
          return;
        }

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: 'light',
          callback: onResolved,
          'error-callback': (captchaError) => onError(captchaError ?? 'Falha na validação do captcha.'),
          'expired-callback': onExpired,
        });
      })
      .catch((loadError) => onError(loadError instanceof Error ? loadError.message : 'Falha ao carregar o captcha.'))
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile?.remove) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
  }, [onError, onExpired, onResolved, siteKey]);

  if (!siteKey) {
    return (
      <div className="login-captcha-fallback" data-testid={`login-captcha-fallback-${fallbackId}`}>
        <div>
          <strong>Captcha de desenvolvimento</strong>
          <p>Configure `VITE_TURNSTILE_SITE_KEY` para usar o Turnstile real.</p>
        </div>
        <button
          type="button"
          className="btn-muted"
          onClick={() => onResolved('dev-turnstile-token')}
          disabled={disabled}
        >
          {token ? 'Captcha validado' : 'Validar acesso'}
        </button>
        {error ? <small>{error}</small> : null}
      </div>
    );
  }

  return (
    <div className="login-captcha">
      <div ref={containerRef} />
      {loading ? <small>Carregando verificação...</small> : null}
      {token ? <small>Captcha validado.</small> : null}
      {error ? <small>{error}</small> : null}
    </div>
  );
};
