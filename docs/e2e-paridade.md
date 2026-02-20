# Evidências E2E de Paridade

## Suites disponíveis

1. `e2e/app.spec.ts`
- Objetivo: regressão funcional rápida com API mockada.
- Cobre login, navegação e CRUD principais.
- Agora compatível com:
  - `/auth/*`
  - `/api/authentication/*`
  - `/api/user/get/context`
  - `/api/user/*`
  - `/api/grupo/*`
  - `/api/pessoa/*`
  - `/api/agente/*`
  - `/api/testemunha/*`
  - `/api/representante/*`
  - `/api/bancarizador/*`
  - `/api/banco/*`
  - `/api/despesa/*`

2. `e2e/backend-real.spec.ts`
- Objetivo: smoke test contra backend real (sem mocks).
- Cobre login e acesso a rota protegida.
- Executa somente quando variáveis obrigatórias são informadas.

## Execução recomendada

```bash
npm run e2e
```

```bash
PLAYWRIGHT_REAL_BACKEND=1 \
E2E_LOGIN_EMAIL=usuario@dominio.com \
E2E_LOGIN_PASSWORD=senha \
npm run e2e -- e2e/backend-real.spec.ts
```

## Critérios de validação usados
- Formulário de login renderizado e funcional.
- Sessão autenticada redireciona para rota protegida.
- Renderização de shell principal (breadcrumb/menu/home) após login.
- Compatibilidade de autenticação moderna e legado.

## Observações
- O teste real depende de credenciais válidas e backend acessível.
- Para ampliar paridade real, o próximo passo é incluir fluxos CRUD críticos com dados de teste isolados.
