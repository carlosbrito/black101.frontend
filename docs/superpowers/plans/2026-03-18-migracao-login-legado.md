# Migração do Login Legado Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar completamente o módulo de login legado para o React, cobrindo login tradicional, captcha, Microsoft Entra e todo o fluxo de 2FA do legado.

**Architecture:** O `AuthContext` continuará sendo a fronteira de integração entre o frontend e os backends moderno/legado, enquanto a feature `login` será reorganizada em componentes menores e helpers tipados para modelar explicitamente os estados do fluxo. A UI manterá o visual do React atual, mas a orquestração de autenticação seguirá as regras e bifurcações do legado Angular.

**Tech Stack:** React 19, TypeScript strict, React Router, Axios, react-hot-toast, Vitest, Testing Library, Playwright.

---

### Task 1: Normalizar contratos e estados do login

**Files:**
- Create: `src/features/login/utils/loginFlow.ts`
- Create: `src/features/login/utils/loginFlow.test.ts`
- Modify: `src/app/auth/AuthContext.tsx`

- [ ] **Step 1: Escrever testes dos helpers do fluxo**

Cobrir:
- resultado autenticado;
- resultado que exige 2FA setup;
- resultado que exige 2FA com QR;
- resultado que exige seleção de método;
- montagem do payload de validação 2FA.

- [ ] **Step 2: Rodar o teste e confirmar falha**

Executar o teste isolado antes da implementação.

- [ ] **Step 3: Implementar `loginFlow.ts`**

Adicionar:
- tipos de estado do login;
- helper para interpretar resposta do login legado;
- helper para resolver modo inicial do 2FA;
- helper para montar request de validação.

- [ ] **Step 4: Ajustar `AuthContext.tsx`**

Melhorar a normalização do resultado de login sem quebrar o contrato atual do app.

- [ ] **Step 5: Rodar testes e lint segmentado**

- [ ] **Step 6: Commit**

```bash
git add src/features/login/utils/loginFlow.ts src/features/login/utils/loginFlow.test.ts src/app/auth/AuthContext.tsx
git commit -m "feat(login): normaliza fluxo legado de autenticacao"
```

### Task 2: Quebrar a feature de login em componentes explícitos

**Files:**
- Create: `src/features/login/components/LoginCredentialsForm.tsx`
- Create: `src/features/login/components/LoginTwoFactorFlow.tsx`
- Create: `src/features/login/components/LoginTwoFactorMethodPicker.tsx`
- Create: `src/features/login/components/LoginTwoFactorQrPanel.tsx`
- Create: `src/features/login/components/LoginTwoFactorCodeForm.tsx`
- Modify: `src/features/login/LoginPage.tsx`
- Modify: `src/features/login/login.css`

- [ ] **Step 1: Escrever teste de renderização e transição básica**

Cobrir:
- etapa de credenciais;
- transição para 2FA;
- volta para credenciais;
- exibição condicional do QR e seleção de método.

- [ ] **Step 2: Rodar o teste e confirmar falha**

- [ ] **Step 3: Extrair o formulário de credenciais**

Separar inputs, captcha, login tradicional e login via Entra.

- [ ] **Step 4: Extrair o shell de 2FA e subcomponentes**

Separar seleção de método, QR e formulário do código.

- [ ] **Step 5: Reorganizar `LoginPage.tsx`**

Centralizar somente o estado e os handlers do fluxo.

- [ ] **Step 6: Rodar testes e lint segmentado**

- [ ] **Step 7: Commit**

```bash
git add src/features/login/LoginPage.tsx src/features/login/components src/features/login/login.css
git commit -m "feat(login): reorganiza interface do fluxo de autenticacao"
```

### Task 3: Migrar captcha e completar login tradicional/Entra

**Files:**
- Modify: `src/features/login/LoginPage.tsx`
- Modify: `src/app/auth/AuthContext.tsx`
- Test: `src/features/login/LoginPage.test.tsx`

- [ ] **Step 1: Escrever testes do fluxo de credenciais**

Cobrir:
- bloqueio sem captcha válido;
- login com sucesso;
- falha de login;
- erro no Entra com recuperação da interface.

- [ ] **Step 2: Rodar o teste e confirmar falha**

- [ ] **Step 3: Implementar o estado do captcha**

Adicionar controle explícito do token, erro e reset.

- [ ] **Step 4: Completar o fluxo do Entra**

Garantir alinhamento do pós-auth com o restante do login.

- [ ] **Step 5: Rodar testes e lint segmentado**

- [ ] **Step 6: Commit**

```bash
git add src/features/login/LoginPage.tsx src/app/auth/AuthContext.tsx src/features/login/LoginPage.test.tsx
git commit -m "feat(login): completa credenciais captcha e entra"
```

### Task 4: Migrar integralmente o 2FA legado

**Files:**
- Modify: `src/features/login/LoginPage.tsx`
- Modify: `src/features/login/components/LoginTwoFactorFlow.tsx`
- Modify: `src/features/login/components/LoginTwoFactorMethodPicker.tsx`
- Modify: `src/features/login/components/LoginTwoFactorQrPanel.tsx`
- Modify: `src/features/login/components/LoginTwoFactorCodeForm.tsx`
- Modify: `src/app/auth/AuthContext.tsx`
- Test: `src/features/login/LoginPage.test.tsx`

- [ ] **Step 1: Escrever testes do 2FA**

Cobrir:
- setup com escolha de autenticador;
- geração de QR;
- QR direto vindo do login;
- reset por e-mail;
- validação com `resetKey`;
- código inválido.

- [ ] **Step 2: Rodar o teste e confirmar falha**

- [ ] **Step 3: Implementar seleção de método**

Adicionar as três opções do legado:
- Black101 Authenticator;
- Google Authenticator;
- reset por e-mail.

- [ ] **Step 4: Implementar QR com expiração e regeneração**

Adicionar timer, expiração visual e reload.

- [ ] **Step 5: Implementar validação final do código**

Garantir envio correto de:
- `userEmail`;
- `code`;
- `resetKey`;
- `tipoAutenticacao2FA`.

- [ ] **Step 6: Rodar testes e lint segmentado**

- [ ] **Step 7: Commit**

```bash
git add src/features/login/LoginPage.tsx src/features/login/components src/app/auth/AuthContext.tsx src/features/login/LoginPage.test.tsx
git commit -m "feat(login): migra fluxo completo de 2fa legado"
```

### Task 5: Cobertura E2E, revisão final e documentação

**Files:**
- Create: `e2e/login.spec.ts`
- Modify: `e2e/app.spec.ts`
- Modify: `docs/paridade-legado-react.md`

- [ ] **Step 1: Escrever cenário E2E dedicado**

Cobrir:
- login tradicional;
- login legado com 2FA completo;
- login via Entra.

- [ ] **Step 2: Preparar mocks determinísticos**

Mockar:
- captcha;
- `/auth/*`;
- `/authentication/*`;
- `/api/user/get/context`;
- `generateQrCode`;
- `validateQrcode`;
- `reset-totp`;
- Entra.

- [ ] **Step 3: Rodar E2E e ajustar o módulo**

- [ ] **Step 4: Atualizar a documentação de paridade**

Registrar o status do login como migrado no escopo coberto.

- [ ] **Step 5: Rodar validação final**

Executar:

```bash
npm test
npx eslint src/features/login/**/*.ts src/features/login/**/*.tsx src/app/auth/AuthContext.tsx e2e/login.spec.ts e2e/app.spec.ts
npm run build
npm run e2e -- --grep login
```

- [ ] **Step 6: Executar checklist final**

Validar:
- login tradicional;
- captcha;
- fallback moderno/legado;
- Microsoft Entra;
- 2FA setup;
- 2FA por QR;
- 2FA por escolha de autenticador;
- reset por e-mail;
- troca de token legado;
- hidratação de contexto.

- [ ] **Step 7: Commit**

```bash
git add e2e/login.spec.ts e2e/app.spec.ts docs/paridade-legado-react.md
git commit -m "test(login): valida migracao completa do fluxo de autenticacao"
```
