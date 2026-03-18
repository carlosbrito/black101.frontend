# Cadastro De Cedentes UI Premium Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** elevar a qualidade visual da landing, listagem e formulário de `/cadastro/cedentes` com uma direção premium e hierarquia mais forte, sem alterar o fluxo funcional.

**Architecture:** a implementação reaproveita a estrutura existente em `CedentesListPage` e `CedenteFormPage`, concentrando as mudanças em composição visual e CSS. O formulário ganha um cabeçalho-resumo e as superfícies compartilhadas do cadastro são refinadas em `entity-form.css`, evitando redistribuição profunda de campos ou mudanças de contrato.

**Tech Stack:** React 19, TypeScript, CSS, Vite, Playwright, Vitest.

---

### Task 1: Cobrir o novo contexto visual com teste de regressão

**Files:**
- Modify: `e2e/app.spec.ts`
- Test: `e2e/app.spec.ts`

- [ ] **Step 1: Write the failing test**

Adicionar uma asserção ao fluxo existente de cedentes validando a presença do novo cabeçalho-resumo do formulário e do novo agrupamento visual da landing.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test e2e/app.spec.ts -g "cedentes:"`
Expected: FAIL porque os novos seletores ainda não existirão.

- [ ] **Step 3: Write minimal implementation**

Adicionar `data-testid` estáveis na landing e no cabeçalho do formulário para suportar a regressão visual estrutural.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx playwright test e2e/app.spec.ts -g "cedentes:"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add e2e/app.spec.ts src/features/cadastros/cedentes/CedentesListPage.tsx src/features/cadastros/cedentes/CedenteFormPage.tsx
git commit -m "test: cobre estrutura premium de cedentes"
```

### Task 2: Refinar landing e toolbar da listagem

**Files:**
- Modify: `src/features/cadastros/cedentes/CedentesListPage.tsx`
- Modify: `src/features/cadastros/cedentes/cedentes-landing.css`
- Modify: `src/features/cadastros/cadastro.css`

- [ ] **Step 1: Write the failing test**

Expandir o teste estrutural de cedentes para exigir a presença dos novos blocos visuais da landing e do toolbar executivo da listagem.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test e2e/app.spec.ts -g "cedentes:"`
Expected: FAIL com ausência dos blocos/atributos novos.

- [ ] **Step 3: Write minimal implementation**

Reorganizar a landing com hero premium, bloco de busca mais forte, resumo contextual e toolbar de listagem mais executiva, preservando os fluxos atuais de busca, criação e retorno.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx playwright test e2e/app.spec.ts -g "cedentes:"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add e2e/app.spec.ts src/features/cadastros/cedentes/CedentesListPage.tsx src/features/cadastros/cedentes/cedentes-landing.css src/features/cadastros/cadastro.css
git commit -m "feat: refina landing e listagem de cedentes"
```

### Task 3: Adicionar cabeçalho-resumo premium ao formulário

**Files:**
- Modify: `src/features/cadastros/cedentes/CedenteFormPage.tsx`
- Modify: `src/features/cadastros/administradoras/entity-form.css`

- [ ] **Step 1: Write the failing test**

Expandir o teste de formulário para exigir o cabeçalho-resumo com contexto operacional, métricas rápidas e área de navegação por abas com novo agrupamento visual.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test e2e/app.spec.ts -g "crud cedentes"`
Expected: FAIL porque o resumo premium ainda não estará presente.

- [ ] **Step 3: Write minimal implementation**

Inserir um bloco superior no formulário com título contextual, chips de estado, resumo de documento/pessoa e ações secundárias, mantendo as abas e o conteúdo atuais.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx playwright test e2e/app.spec.ts -g "crud cedentes"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add e2e/app.spec.ts src/features/cadastros/cedentes/CedenteFormPage.tsx src/features/cadastros/administradoras/entity-form.css
git commit -m "feat: adiciona cabecalho premium ao formulario de cedentes"
```

### Task 4: Unificar superfícies, tabs e estados de foco

**Files:**
- Modify: `src/features/cadastros/administradoras/entity-form.css`
- Modify: `src/features/cadastros/cadastro.css`

- [ ] **Step 1: Write the failing test**

Se necessário, complementar a cobertura estrutural para garantir que os elementos essenciais continuam acessíveis após o refino visual.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test e2e/app.spec.ts -g "cedentes"`
Expected: FAIL apenas se houver novo seletor estrutural adicionado.

- [ ] **Step 3: Write minimal implementation**

Refinar tabs, cards, campos, botões, tabelas e estados de foco para um sistema visual mais consistente com a direção premium aprovada.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx playwright test e2e/app.spec.ts -g "cedentes"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add e2e/app.spec.ts src/features/cadastros/administradoras/entity-form.css src/features/cadastros/cadastro.css
git commit -m "style: unifica linguagem visual premium de cedentes"
```

### Task 5: Verificar o recorte alterado

**Files:**
- Verify: `src/features/cadastros/cedentes/CedentesListPage.tsx`
- Verify: `src/features/cadastros/cedentes/CedenteFormPage.tsx`
- Verify: `src/features/cadastros/cedentes/cedentes-landing.css`
- Verify: `src/features/cadastros/administradoras/entity-form.css`
- Verify: `src/features/cadastros/cadastro.css`
- Verify: `e2e/app.spec.ts`

- [ ] **Step 1: Run lint**

Run: `npm run lint`
Expected: exit 0

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: exit 0

- [ ] **Step 3: Run targeted E2E**

Run: `npx playwright test e2e/app.spec.ts -g "cedentes"`
Expected: PASS

- [ ] **Step 4: Commit final**

```bash
git add e2e/app.spec.ts src/features/cadastros/cedentes/CedentesListPage.tsx src/features/cadastros/cedentes/CedenteFormPage.tsx src/features/cadastros/cedentes/cedentes-landing.css src/features/cadastros/administradoras/entity-form.css src/features/cadastros/cadastro.css docs/superpowers/plans/2026-03-18-cadastro-cedentes-ui-premium.md
git commit -m "feat: aplica redesign premium na tela de cedentes"
```
