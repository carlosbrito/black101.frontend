# Migração de Movimentações Financeiras Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar completamente o módulo de movimentações financeiras do legado Angular para o frontend React, preservando regras e fluxos operacionais e adaptando a experiência ao padrão do `black101.frontend`.

**Architecture:** A feature será reorganizada em `src/features/financeiro/movimentacoes/` com uma página container centralizando estado, chamadas HTTP e refresh, enquanto componentes e dialogs especializados encapsulam exibição e operações. A integração com o backend ficará em serviços tipados e mapeadores puros que convertem contratos do legado para modelos de UI e payloads de comando.

**Tech Stack:** React 19, TypeScript strict, Vite, Axios, react-hot-toast, React Router, Playwright, ESLint.

---

### Task 1: Preparar a espinha dorsal da feature

**Files:**
- Create: `src/features/financeiro/movimentacoes/page/MovimentacoesFeaturePage.tsx`
- Create: `src/features/financeiro/movimentacoes/types.ts`
- Create: `src/features/financeiro/movimentacoes/utils/defaultFilters.ts`
- Create: `src/features/financeiro/movimentacoes/utils/defaultFilters.test.ts`
- Modify: `src/features/financeiro/MovimentacoesPage.tsx`

- [ ] **Step 1: Escrever o teste de regra para filtros iniciais**

Criar uma função pura em `defaultFilters.ts` para montar o filtro padrão do dia atual, e escrever primeiro um teste simples para garantir:
- início e fim no mesmo dia;
- ordenação por `dataMovimento desc`;
- `page = 0`;
- `pageSize = 100`.

- [ ] **Step 2: Rodar o teste e confirmar falha inicial**

Executar o teste isolado para validar que a função ainda não existe ou não implementa o contrato esperado.

- [ ] **Step 3: Implementar os contratos básicos da feature**

Adicionar em `types.ts`:
- tipos de filtro;
- tipos de paginação/ordenação;
- modelos de resposta da lista;
- modelos de cards de saldo;
- enums/unions para tipo de movimento, status de baixa e ações de dialog.

- [ ] **Step 4: Implementar `defaultFilters.ts`**

Criar helper puro responsável por:
- calcular o início do dia;
- serializar datas em formato `yyyy-MM-dd`;
- retornar o estado inicial usado pela feature.

- [ ] **Step 5: Criar a nova página container**

Criar `MovimentacoesFeaturePage.tsx` com:
- `PageFrame`;
- estados básicos de consulta, loading e dialogs;
- placeholders temporários dos blocos de cards, toolbar e tabela;
- efeito inicial de bootstrap.

- [ ] **Step 6: Redirecionar a rota atual**

Atualizar `src/features/financeiro/MovimentacoesPage.tsx` para reexportar ou delegar para a nova página container, preservando a rota já registrada em `AppRouter.tsx`.

- [ ] **Step 7: Rodar lint nos arquivos novos**

Executar `npm run lint` ou lint segmentado se necessário para validar a espinha dorsal.

- [ ] **Step 8: Commit**

```bash
git add src/features/financeiro/MovimentacoesPage.tsx src/features/financeiro/movimentacoes/page/MovimentacoesFeaturePage.tsx src/features/financeiro/movimentacoes/types.ts src/features/financeiro/movimentacoes/utils/defaultFilters.ts src/features/financeiro/movimentacoes/utils/defaultFilters.test.ts
git commit -m "feat(financeiro): estrutura base do modulo de movimentacoes"
```

### Task 2: Implementar camada de API e mapeadores do legado

**Files:**
- Create: `src/features/financeiro/movimentacoes/services/movimentacoesApi.ts`
- Create: `src/features/financeiro/movimentacoes/mappers/movimentacoesMappers.ts`
- Create: `src/features/financeiro/movimentacoes/utils/permissions.ts`
- Create: `src/features/financeiro/movimentacoes/utils/permissions.test.ts`
- Test: `src/features/financeiro/movimentacoes/mappers/movimentacoesMappers.test.ts`

- [ ] **Step 1: Fazer inventário contratual do legado**

Mapear antes de codar:
- endpoints efetivamente usados na lista, saldo, criação, edição, exclusão, importação, histórico, baixa/reabertura, exportação e relatório;
- payloads mínimos obrigatórios;
- enums/status críticos;
- claims realmente usados no legado para cada ação.

- [ ] **Step 2: Escrever testes dos mapeadores**

Cobrir primeiro as regras puras:
- normalização de tipo `Debito`, `Credito`, `Transferencia`;
- cálculo de `originalValue`;
- definição de tags de baixa;
- fallback de conta, conta destino, fornecedor e cedente;
- totalizador do dia.

- [ ] **Step 3: Escrever testes das permissões**

Cobrir a matriz mínima:
- visualizar ações por linha;
- criar;
- editar;
- excluir individual;
- excluir em lote;
- baixa;
- reabertura;
- importar;
- exportar;
- gerar relatório.

- [ ] **Step 4: Rodar os testes e confirmar falha**

Executar os testes de mapper e permissões antes de implementar os arquivos.

- [ ] **Step 5: Implementar `movimentacoesApi.ts`**

Criar funções tipadas para:
- listar movimentações;
- carregar saldo de contas;
- criar, editar e excluir;
- exportar Excel;
- gerar relatório contábil;
- carregar histórico;
- baixa/reabertura/exclusão em lote;
- pontos de importação.

- [ ] **Step 6: Implementar os mapeadores**

Criar funções puras para:
- converter contratos do backend em linhas de tabela e cards;
- calcular rótulos, cores e ícones;
- formatar nomes de conta no padrão do legado;
- preparar dados para histórico e dialogs;
- transformar filtros de UI em query params da API.

- [ ] **Step 7: Implementar helper de permissões**

Mapear `claims` do `AuthContext` para:
- ações por linha;
- ações em lote;
- botões de importação, relatório e criação.

- [ ] **Step 8: Validar integração estática**

Conectar a página container aos serviços com chamadas reais e placeholders de renderização para confirmar bootstrap de lista e cards.

- [ ] **Step 9: Rodar testes e lint**

Executar os testes de mapeador, permissões e lint da feature.

- [ ] **Step 10: Commit**

```bash
git add src/features/financeiro/movimentacoes/services/movimentacoesApi.ts src/features/financeiro/movimentacoes/mappers/movimentacoesMappers.ts src/features/financeiro/movimentacoes/utils/permissions.ts src/features/financeiro/movimentacoes/utils/permissions.test.ts src/features/financeiro/movimentacoes/mappers/movimentacoesMappers.test.ts src/features/financeiro/movimentacoes/page/MovimentacoesFeaturePage.tsx
git commit -m "feat(financeiro): integra contratos e mapeadores de movimentacoes"
```

### Task 3: Construir a experiência principal da página

**Files:**
- Create: `src/features/financeiro/movimentacoes/components/AccountBalanceCards.tsx`
- Create: `src/features/financeiro/movimentacoes/components/MovimentacoesToolbar.tsx`
- Create: `src/features/financeiro/movimentacoes/components/MovimentacoesTable.tsx`
- Create: `src/features/financeiro/movimentacoes/components/movimentacoes.css`
- Create: `src/features/financeiro/movimentacoes/page/MovimentacoesFeaturePage.test.tsx`
- Modify: `src/features/financeiro/movimentacoes/page/MovimentacoesFeaturePage.tsx`

- [ ] **Step 1: Escrever teste de renderização básica da página**

Cobrir:
- loading inicial;
- exibição dos cards;
- renderização de linhas mapeadas;
- seleção em lote;
- renderização condicional por permissão;
- abertura de dialogs de ação;
- refresh após mudança de filtro, paginação e operação de escrita.

- [ ] **Step 2: Rodar o teste e confirmar falha**

Executar o teste de componente antes de implementar os blocos visuais.

- [ ] **Step 3: Implementar `AccountBalanceCards.tsx`**

Criar o bloco de cards respeitando:
- estado de loading;
- label/valor/conta;
- fallback seguro para listas vazias.

- [ ] **Step 4: Implementar `MovimentacoesToolbar.tsx`**

Adicionar:
- botão de nova movimentação;
- botão de importar;
- ações extras como exportar/relatório;
- resumo de filtros ativos;
- gatilho para modal de filtros.

- [ ] **Step 5: Implementar `MovimentacoesTable.tsx`**

Criar tabela própria ou adaptar `DataTable` para suportar:
- seleção em lote;
- paginação;
- ordenação;
- totalizador;
- ações por linha;
- coluna de status e tipo com estilos compatíveis com o padrão React.

- [ ] **Step 6: Integrar tudo na página**

Conectar cards, toolbar e tabela à página container com refresh único e estado compartilhado.

- [ ] **Step 7: Definir política de erro assíncrono da página**

Garantir comportamento explícito para:
- erro no bootstrap inicial;
- erro parcial entre cards e lista;
- retry manual por refresh;
- preservação da tela carregada quando falhar uma atualização posterior.

- [ ] **Step 8: Rodar lint e testes da feature**

Executar testes de componente e lint dos arquivos alterados.

- [ ] **Step 9: Commit**

```bash
git add src/features/financeiro/movimentacoes/components src/features/financeiro/movimentacoes/page/MovimentacoesFeaturePage.tsx src/features/financeiro/movimentacoes/page/MovimentacoesFeaturePage.test.tsx
git commit -m "feat(financeiro): adiciona tela principal de movimentacoes"
```

### Task 4: Migrar filtros e operações individuais

**Files:**
- Create: `src/features/financeiro/movimentacoes/dialogs/MovimentacoesFilterDialog.tsx`
- Create: `src/features/financeiro/movimentacoes/dialogs/MovimentacoesSelectionDialog.tsx`
- Create: `src/features/financeiro/movimentacoes/dialogs/MovimentacaoDebitoDialog.tsx`
- Create: `src/features/financeiro/movimentacoes/dialogs/MovimentacaoCreditoDialog.tsx`
- Create: `src/features/financeiro/movimentacoes/dialogs/MovimentacaoTransferenciaDialog.tsx`
- Create: `src/features/financeiro/movimentacoes/dialogs/dialogs.css`
- Create: `src/features/financeiro/movimentacoes/utils/formPayloads.ts`
- Test: `src/features/financeiro/movimentacoes/utils/formPayloads.test.ts`
- Modify: `src/features/financeiro/movimentacoes/page/MovimentacoesFeaturePage.tsx`

- [ ] **Step 1: Escrever testes de payload e validações de formulário**

Cobrir:
- construção de payload por tipo de movimentação;
- preenchimento de datas e campos opcionais;
- distinção entre criação e edição.

- [ ] **Step 2: Rodar os testes e confirmar falha**

Executar o teste antes da implementação dos helpers.

- [ ] **Step 3: Implementar os dialogs de seleção e filtro**

Migrar o comportamento do legado para:
- filtro por período, tipo, status, conta, plano de contas, cedente e palavra-chave;
- seleção de tipo para nova movimentação;
- remoção/reset de filtros.

- [ ] **Step 4: Implementar os dialogs de débito, crédito e transferência**

Garantir:
- edição e criação com o mesmo componente por tipo;
- carregamento de dados existentes;
- submissão via API;
- refresh no fechamento com sucesso;
- manutenção do dialog aberto em caso de erro.

- [ ] **Step 5: Definir política de erro dos dialogs**

Cobrir explicitamente:
- mensagens de erro por submissão;
- bloqueio visual durante envio;
- reabilitação do formulário após falha;
- comportamento quando endpoints auxiliares falharem durante carregamento do dialog.

- [ ] **Step 6: Implementar `formPayloads.ts`**

Centralizar transformação entre estado do formulário e payload esperado pela API.

- [ ] **Step 7: Integrar ações por linha e criação**

Ligar botões da toolbar e ações da tabela aos dialogs corretos.

- [ ] **Step 8: Rodar testes e lint**

Executar testes dos helpers e lint da feature.

- [ ] **Step 9: Commit**

```bash
git add src/features/financeiro/movimentacoes/dialogs src/features/financeiro/movimentacoes/utils/formPayloads.ts src/features/financeiro/movimentacoes/utils/formPayloads.test.ts src/features/financeiro/movimentacoes/page/MovimentacoesFeaturePage.tsx
git commit -m "feat(financeiro): migra filtros e formularios de movimentacoes"
```

### Task 5: Migrar importação, histórico e operações em lote

**Files:**
- Create: `src/features/financeiro/movimentacoes/dialogs/MovimentacoesImportDialog.tsx`
- Create: `src/features/financeiro/movimentacoes/dialogs/MovimentacoesImportReviewDialog.tsx`
- Create: `src/features/financeiro/movimentacoes/dialogs/MovimentacoesHistoryDialog.tsx`
- Create: `src/features/financeiro/movimentacoes/dialogs/MovimentacoesBatchDeleteDialog.tsx`
- Create: `src/features/financeiro/movimentacoes/dialogs/MovimentacoesBatchSettlementDialog.tsx`
- Create: `src/features/financeiro/movimentacoes/dialogs/MovimentacoesBatchReopenDialog.tsx`
- Create: `src/features/financeiro/movimentacoes/utils/batchRules.ts`
- Test: `src/features/financeiro/movimentacoes/utils/batchRules.test.ts`
- Modify: `src/features/financeiro/movimentacoes/page/MovimentacoesFeaturePage.tsx`
- Modify: `src/features/financeiro/movimentacoes/components/MovimentacoesToolbar.tsx`
- Modify: `src/features/financeiro/movimentacoes/components/MovimentacoesTable.tsx`

- [ ] **Step 1: Escrever testes das regras em lote**

Cobrir:
- mesma tipagem para itens selecionados;
- baixa apenas com itens abertos;
- reabertura apenas com itens baixados;
- bloqueio de reabertura para transferências.

- [ ] **Step 2: Rodar os testes e confirmar falha**

Executar o teste das regras antes da implementação.

- [ ] **Step 3: Implementar `batchRules.ts`**

Criar funções puras para validar seleção e retornar mensagens de erro reaproveitáveis.

- [ ] **Step 4: Implementar dialogs de lote**

Adicionar:
- exclusão em lote;
- baixa em lote;
- reabertura em lote;
- feedback de erro e sucesso;
- refresh ao concluir;
- diferenças explícitas de validação e submissão entre baixa e reabertura.

- [ ] **Step 5: Implementar histórico**

Criar modal com:
- resumo lateral da movimentação;
- carregamento sob demanda do histórico;
- mapeamento dos eventos de ação do legado;
- política de fallback em erro sem derrubar a página principal.

- [ ] **Step 6: Implementar fluxo de importação em duas etapas**

Adicionar:
- seleção de conta/entrada inicial;
- revisão ou segunda etapa;
- validação dos campos mínimos exigidos pelo legado;
- envio para API;
- refresh dos dados ao concluir;
- feedback explícito em caso de falha.

- [ ] **Step 7: Integrar ações extras**

Ligar toolbar e tabela a:
- exportação Excel;
- relatório contábil;
- importação;
- histórico;
- ações em lote.

- [ ] **Step 8: Rodar testes e lint**

Executar testes das regras em lote e lint da feature.

- [ ] **Step 9: Validar checklist de paridade das operações avançadas**

Confirmar ao menos:
- histórico funcional;
- importação em duas etapas;
- exclusão em lote;
- baixa em lote;
- reabertura em lote;
- exportação e relatório acionáveis;
- refresh após cada operação.

- [ ] **Step 10: Commit**

```bash
git add src/features/financeiro/movimentacoes/dialogs src/features/financeiro/movimentacoes/utils/batchRules.ts src/features/financeiro/movimentacoes/utils/batchRules.test.ts src/features/financeiro/movimentacoes/components/MovimentacoesToolbar.tsx src/features/financeiro/movimentacoes/components/MovimentacoesTable.tsx src/features/financeiro/movimentacoes/page/MovimentacoesFeaturePage.tsx
git commit -m "feat(financeiro): migra operacoes avancadas de movimentacoes"
```

### Task 6: Cobertura E2E, polimento funcional e validação final

**Files:**
- Create: `e2e/financeiro-movimentacoes.spec.ts`
- Modify: `e2e/app.spec.ts`
- Modify: `docs/paridade-legado-react.md`

- [ ] **Step 1: Escrever o cenário E2E do módulo**

Cobrir minimamente:
- acesso à rota;
- renderização inicial;
- aplicação de filtro;
- criação ou edição;
- exclusão;
- operação em lote.

- [ ] **Step 2: Preparar mocks determinísticos**

Mockar chamadas de lista, saldo, dialogs e ações mutáveis para tornar o fluxo repetível.

- [ ] **Step 3: Rodar o E2E e ajustar o módulo**

Corrigir problemas encontrados no fluxo real.

- [ ] **Step 4: Atualizar documentação de paridade**

Registrar no documento de acompanhamento o status do módulo migrado e eventuais pendências visuais.

- [ ] **Step 5: Rodar validação final**

Executar:

```bash
npm run lint
npm run build
npm run e2e -- --grep financeiro-movimentacoes
```

Esperado:
- lint sem erros;
- build sem erros de TypeScript;
- E2E do módulo passando.

- [ ] **Step 6: Executar checklist final de paridade funcional**

Validar contra o spec:
- carga inicial com filtro do dia;
- cards de saldo;
- filtros principais;
- criação/edição por tipo;
- importação;
- exclusão individual e em lote;
- baixa e reabertura em lote;
- histórico;
- exportação;
- relatório;
- refresh consistente após sucesso;
- respeito às permissões.

- [ ] **Step 7: Commit**

```bash
git add e2e/financeiro-movimentacoes.spec.ts e2e/app.spec.ts docs/paridade-legado-react.md
git commit -m "test(financeiro): valida migracao do modulo de movimentacoes"
```
