# Black101.FrontEnd

## Executar localmente

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## E2E (Playwright)

```bash
npm run e2e:install
npm run e2e
```

## Variável opcional

```bash
# .env.local
VITE_API_BASE_URL=https://localhost:7110
VITE_AUTH_BASE_PATH=/auth
VITE_LEGACY_AUTH_BASE_PATH=/api/authentication
VITE_CSRF_ENDPOINT=/auth/csrf
```

## Compatibilidade de autenticação

- Fluxo moderno: `VITE_AUTH_BASE_PATH` (padrão `/auth`)
- Fluxo legado/backend C#: `VITE_LEGACY_AUTH_BASE_PATH` (padrão `/api/authentication`)
- CSRF é opcional. Se não houver endpoint CSRF no backend, deixe `VITE_CSRF_ENDPOINT` vazio.

## E2E com backend real

```bash
# exemplo
PLAYWRIGHT_REAL_BACKEND=1 \
E2E_LOGIN_EMAIL=usuario@dominio.com \
E2E_LOGIN_PASSWORD=senha \
npm run e2e -- e2e/backend-real.spec.ts
```

- Sem essas variáveis, o teste real é automaticamente ignorado.

## Implementado
- Login com compatibilidade para fluxo cookie-based e fluxo legado com bearer em memória
- Mega menu horizontal responsivo com estrutura completa do legado
- CRUD paginado para:
  - Administradoras
  - Agentes
  - Bancos
- Base administrativa:
  - Usuários
  - Grupos/Perfis
  - Auditoria
- Páginas não implementadas mapeadas para `Em construção`
