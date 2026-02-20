import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './app/auth/AuthContext';
import { AppRouter } from './app/router/AppRouter';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 2800,
            style: {
              border: '1px solid rgba(137, 177, 212, 0.6)',
              background: 'linear-gradient(180deg, #ffffff, #f4faff)',
              color: 'var(--ink)',
              borderRadius: '12px',
              boxShadow: '0 16px 32px rgba(11, 40, 68, 0.16)',
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
