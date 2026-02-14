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

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirect = (location.state as { from?: string } | null)?.from ?? '/';

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      await login(email, password, rememberMe);
      toast.success('Login realizado.');
      navigate(redirect, { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha no login.');
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
      </section>
    </main>
  );
};
