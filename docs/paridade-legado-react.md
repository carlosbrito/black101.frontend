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
| Login/autenticação | `/login` + 2FA + gettoken/context | `src/features/login/LoginPage.tsx` + `src/app/auth/AuthContext.tsx` | Parcial (fluxo principal migrado) |
| Cadastros | Módulo `register` | `src/features/cadastros/**` | Em andamento |
| Operações | Módulo `operation` | `src/features/operacoes/**` | Em andamento |
| Financeiro | Módulo `financial` | `src/features/financeiro/**` | Parcial (movimentações migrado) |
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
- `src/features/cadastros/administradoras/AdministradorasListPage.tsx`
- `src/features/cadastros/administradoras/AdministradoraFormPage.tsx`
  - listagem/remoção alinhadas para `/api/administradora/get/list|remove`
  - entrada por documento alinhada ao legado via `/api/pessoa/get/cnpjcpf/{documento}`
  - subtabs existentes alinhadas para `/api/administradora/get/unique|complemento|get/status|register/status|update/status|remove/status|get/tipos-recebiveis`
  - representantes/anexos/observações/histórico migrados para os contratos legados compartilhados (`representante/associacao`, `documento`, `observacao`, `historico`)
- `src/features/cadastros/cedentes/CedentesListPage.tsx`
- `src/features/cadastros/cedentes/CedenteFormPage.tsx`
  - listagem principal alinhada para `POST /api/cedente/get/list`
  - remoção alinhada para `/api/cedente/remove`
  - entrada por documento alinhada ao legado via `/api/pessoa/get/cnpjcpf/{documento}`
  - subtabs existentes alinhadas para `/api/cedente/get/uniqueCedente|get/list/contatosCedente|complemento|get/cedenteParametrizacao|get/cedenteContrato|despesa|workflow|deactivate`
  - contratos, atualizações, despesas, jurídico, pendências, anexos, observações e histórico ajustados para os endpoints legados da área gestora
- `src/features/cadastros/sacados/SacadosListPage.tsx`
- `src/features/cadastros/sacados/SacadoFormPage.tsx`
  - listagem principal alinhada para `POST /api/sacado/get/list`
  - remoção alinhada para `/api/sacado/remove`
  - entrada por documento alinhada ao legado via `/api/pessoa/get/cnpjcpf/{documento}`
  - subtabs existentes alinhadas para `/api/sacado/get/unique|get/list/contatosSacado|complemento|contatos|get/representante`
  - anexos/observações/histórico migrados para os contratos legados compartilhados (`documento`, `observacao`, `historico`)
- `src/features/cadastros/BasicosPages.tsx`
- `src/features/cadastros/CadastroCrudPage.tsx`
- `src/features/cadastros/basicos/entityApi.ts`
  - `Empresas` alinhado para o contrato legado de `fidc`
  - `Certificadoras` alinhado para `certificadora/get|register|update|remove`
  - `Grupo Econômico` alinhado para `grupoEconomico/get|register|update|remove`
  - `Índices Debênture` ajustado para fonte estática local, sem backend remoto
  - criação/edição com vínculo via `/api/pessoa/get/cnpjcpf|register|update`
- `src/features/cadastros/empresas/EmpresaFormPage.tsx`
  - abas atuais (`cadastro`, `parametrização`, `anexos`, `observações`, `histórico`) alinhadas ao legado de `fidc`
  - carga principal via `/api/fidc/get/unique/{id}` e persistência principal via `/api/pessoa/get/cnpjcpf|register|update` + `/api/fidc/register`
  - parametrização consolidada em `PUT /api/fidc/parametrizacao` com reenvio da lista completa, como no legado
  - anexos/observações/histórico conectados aos contratos genéricos legados por `personId`
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
- `src/features/cadastros/modalidades/ModalidadesListPage.tsx`
  - migração para consulta real via `/api/cedente/get/list` + `/api/cedente/get/modalidades`
  - CRUD dedicado removido (não há controller de `Modalidade` no backend atual)
- `src/features/login/LoginPage.tsx`
- `src/features/login/components/**`
- `src/app/auth/AuthContext.tsx`
  - login React revisado com captcha, fallback moderno/legado, troca de token legado, login via Microsoft Entra e fluxo completo de 2FA com setup, QR code, autenticação por app e código por e-mail
  - cobertura de componente em `src/features/login/LoginPage.test.tsx`
  - cobertura Playwright dedicada em `e2e/login.spec.ts`
  - pendências remanescentes concentradas em refinos visuais e validação final integrada contra ambiente real configurado com Turnstile/Entra
- `src/features/financeiro/MovimentacoesPage.tsx`
- `src/features/financeiro/movimentacoes/**`
  - módulo de movimentações financeiras migrado para React com lista, cards de saldo, filtros, criação/edição por tipo, exclusão individual, histórico, importação em duas etapas, exclusão/baixa/reabertura em lote, exportação e relatório
  - cobertura Playwright dedicada em `e2e/financeiro-movimentacoes.spec.ts`
  - pendências remanescentes concentradas em refinamento visual e eventuais ajustes finos de UX, sem gap funcional conhecido frente ao legado dentro do escopo migrado

## Gaps conhecidos
- Ainda há cobertura E2E focada em API mock para muitos fluxos; backend real foi adicionado como smoke test inicial.
