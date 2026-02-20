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
| Login/autenticação | `/login` + 2FA + gettoken/context | `src/features/login/LoginPage.tsx` + `src/app/auth/AuthContext.tsx` | Parcial (2FA legado migrado) |
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
  - desempacotamento automático de envelope `{ model, success, code, errors }`
- `src/app/auth/AuthContext.tsx`
  - fallback automático de autenticação moderna para legado
  - hidratação de sessão por `/api/user/get/context` quando `/auth/me` não existe
  - fallback de troca de contexto de empresa
  - suporte a desafio 2FA legado (`/api/authentication/validateQrcode|generateQrCode|reset-totp`)
- `src/features/admin/AdminUsuariosPage.tsx`
  - alinhado para `/api/user/get/list` e `/api/user/register`
- `src/features/admin/AdminRolesPage.tsx`
  - alinhado para `/api/grupo/get/list` e `/api/grupo/register`
- `src/features/cadastros/bancos/BancosListPage.tsx`
- `src/features/cadastros/bancos/BancoFormPage.tsx`
  - alinhados para `/api/banco/get/list|get/unique|register|update|remove`
- `src/features/cadastros/despesas/DespesasListPage.tsx`
- `src/features/cadastros/despesas/DespesaFormPage.tsx`
  - alinhados para `/api/despesa/get/list|get/unique|register|update|remove|activate|deactivate`
- `src/features/cadastros/agentes/AgentesListPage.tsx`
- `src/features/cadastros/agentes/AgenteFormPage.tsx`
  - alinhados para `/api/agente/get/list|get/unique|register|update|remove`
  - criação/edição com vínculo via `/api/pessoa/get/cnpjcpf|register|update`
- `src/features/cadastros/bancarizadores/BancarizadoresPage.tsx`
- `src/features/cadastros/bancarizadores/BancarizadorFormPage.tsx`
  - alinhados para `/api/bancarizador/get/list|get/unique|register|update|remove|activate|deactivate|get/cnpjcpf/gestora`
- `src/features/cadastros/testemunhas/TestemunhasListPage.tsx`
- `src/features/cadastros/testemunhas/TestemunhaFormPage.tsx`
  - alinhados para `/api/testemunha/get/list|get/unique|register|update|remove`
  - criação/edição com vínculo via `/api/pessoa/get/cnpjcpf|register|update`
- `src/features/cadastros/representantes/RepresentantesListPage.tsx`
- `src/features/cadastros/representantes/RepresentanteFormPage.tsx`
  - alinhados para `/api/representante/get/list|get/unique|register|update|remove`
  - criação/edição com vínculo via `/api/pessoa/get/cnpjcpf|register|update`
- `src/features/cadastros/basicos/BasicoEntityListPage.tsx`
- `src/features/cadastros/basicos/BasicoEntityFormPage.tsx`
- `src/features/cadastros/basicos/entityApi.ts`
  - consultora/custodiante/gestora/fornecedor: alinhados para `/api/{entidade}/get/list|get/unique|register|update|remove`
  - emitente: alinhado para `/api/emitente/get/list (POST)|get/unique|register|remove`
  - investidor: alinhado para `/api/investidor/get/list|get/unique|register|remove`
  - prestador de serviço: alinhado para `/api/prestadorservico/get/list|get/unique|register (multipart/form-data)|remove`
  - criação/edição com vínculo via `/api/pessoa/get/cnpjcpf|register|update`

## Gaps conhecidos
- Fluxo de 2FA do legado ainda não foi migrado para React.
- Ainda há cobertura E2E focada em API mock para muitos fluxos; backend real foi adicionado como smoke test inicial.
- Não foi identificado controller dedicado de `Modalidade` no backend C# atual; rota permanece em investigação/mapeamento.
