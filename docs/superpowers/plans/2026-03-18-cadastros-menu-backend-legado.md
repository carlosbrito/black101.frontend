# Cadastros Menu Backend Legado Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** alinhar os itens navegaveis do menu `Cadastros` aos contratos do backend legado sem reabrir o escopo completo das subtelas internas.

**Architecture:** os modulos que ja estao aderentes permanecem intocados. Os divergentes passam a consumir adapters legados por pagina, mantendo o padrao visual atual em React e corrigindo apenas os endpoints, verbos e payloads centrais do modulo.

**Tech Stack:** React 19, TypeScript, Vite, axios/http wrapper local, Playwright/Vitest quando houver cobertura existente.

---

### Task 1: Registrar o inventario e preparar adapters legados

**Files:**
- Modify: `src/features/cadastros/BasicosPages.tsx`
- Modify: `src/features/cadastros/CadastroCrudPage.tsx`
- Modify: `src/features/cadastros/basicos/entityApi.ts`

- [ ] Adicionar contratos legados necessarios para `fidc`, `certificadora` e `grupoEconomico`
- [ ] Permitir que o CRUD modal reutilize endpoints legados com mapeamento de payload
- [ ] Preservar o comportamento atual das paginas que ja usam o CRUD generico
- [ ] Commit

### Task 2: Corrigir listagens principais divergentes

**Files:**
- Modify: `src/features/cadastros/administradoras/AdministradorasListPage.tsx`
- Modify: `src/features/cadastros/cedentes/CedentesListPage.tsx`
- Modify: `src/features/cadastros/sacados/SacadosListPage.tsx`
- Modify: `src/features/cadastros/BasicosPages.tsx`

- [ ] Alinhar `Administradoras` para `administradora/get/list` e `administradora/remove`
- [ ] Alinhar `Cedentes` para `cedente/get/list` por POST e `cedente/remove`
- [ ] Alinhar `Sacados` para `sacado/get/list` por POST e `sacado/remove`
- [ ] Alinhar `Empresas` para `fidc/get/list` e `fidc/remove`
- [ ] Commit

### Task 3: Corrigir entrada principal dos fluxos por documento

**Files:**
- Modify: `src/features/cadastros/administradoras/AdministradoraFormPage.tsx`
- Modify: `src/features/cadastros/cedentes/CedenteFormPage.tsx`
- Modify: `src/features/cadastros/sacados/SacadoFormPage.tsx`

- [ ] Trocar auto-cadastro REST proprio por navegacao de criacao com documento
- [ ] Pre-preencher formularios a partir de `pessoa/get/cnpjcpf/{documento}` quando houver query param
- [ ] Manter edicao existente inalterada
- [ ] Commit

### Task 4: Corrigir modulos especiais do menu

**Files:**
- Modify: `src/features/cadastros/BasicosPages.tsx`
- Modify: `src/features/cadastros/CadastroCrudPage.tsx`

- [ ] Adaptar `Certificadoras` ao contrato `certificadora/get|register|update|remove`
- [ ] Adaptar `Grupo Economico` ao contrato `grupoEconomico/get|register|update|remove`
- [ ] Trocar `Indices Debenture` para fonte estatica local
- [ ] Commit

### Task 5: Validar recorte alterado

**Files:**
- Modify if needed: `docs/paridade-legado-react.md`

- [ ] Rodar lint segmentado dos arquivos alterados
- [ ] Rodar build
- [ ] Atualizar documentacao de paridade se a matriz tiver item especifico para Cadastros
- [ ] Commit final
