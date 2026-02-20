# Matriz de Paridade Legado -> React

## Escopo
- Legado: `BlackArrow.PortalFidc.FrontEnd` (Angular)
- Novo frontend: `black101.frontend` (React)
- Backend alvo: `BlackArrow.PortalFidc.Api`

## Estado atual consolidado
- Rotas protegidas mapeadas no React: `src/app/router/AppRouter.tsx`
- Integração de autenticação:
  - fluxo moderno (`/auth/*`)
  - fallback legado/backend C# (`/authentication/*` + bearer token)
- Contexto de empresa:
  - fluxo moderno (`/contexto/empresas/selecao`)
  - fallback legado (`/fidc/contexto/set`)

## Mapeamento por domínio

| Domínio | Legado (Angular) | React | Status |
|---|---|---|---|
| Login/autenticação | `/login` + 2FA + gettoken/context | `src/features/login/LoginPage.tsx` + `src/app/auth/AuthContext.tsx` | Parcial (2FA pendente) |
| Cadastros | Módulo `register` | `src/features/cadastros/**` | Em andamento |
| Operações | Módulo `operation` | `src/features/operacoes/**` | Em andamento |
| Financeiro | Módulo `financial` | `src/features/financeiro/**` | Em andamento |
| Administrativo | Usuários/Grupos/Auditoria/Templates | `src/features/admin/**` | Em andamento |
| Securitizadora | Debêntures/Contabilidade | `src/features/securitizadora/**` | Em andamento |

## Rotas React implementadas (fonte de verdade)
- Arquivo: `src/app/router/AppRouter.tsx`
- Total de declarações `path="/..."`: 90
- Inclui listagem/formulário para os principais módulos de cadastro, operações, admin e securitizadora.

## Ajustes de integração backend já aplicados
- `src/shared/api/http.ts`
  - suporte a `VITE_AUTH_BASE_PATH`, `VITE_LEGACY_AUTH_BASE_PATH`, `VITE_CSRF_ENDPOINT`
  - token bearer legado em memória (sem persistir em `localStorage`/`sessionStorage`)
- `src/app/auth/AuthContext.tsx`
  - fallback automático de autenticação moderna para legado
  - hidratação de sessão por `/user/get/context` quando `/auth/me` não existe
  - fallback de troca de contexto de empresa

## Gaps conhecidos
- Fluxo de 2FA do legado ainda não foi migrado para React.
- Ainda há cobertura E2E focada em API mock para muitos fluxos; backend real foi adicionado como smoke test inicial.
