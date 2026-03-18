# Redesign Premium Da Tela De Cedentes

**Objetivo**

Elevar a percepção visual e a legibilidade do fluxo `/cadastro/cedentes` sem alterar regras de negócio, mantendo o comportamento atual da landing, da listagem e do formulário, mas com hierarquia visual mais forte, melhor leitura operacional e aparência mais compatível com um produto financeiro premium.

**Escopo validado**

Rotas incluídas:
- `/cadastro/cedentes`
- `/cadastro/cedentes/novo`
- `/cadastro/cedentes/:id`

Áreas incluídas:
- landing inicial do módulo
- toolbar e apresentação da listagem
- cabeçalho visual do formulário
- meta bar de contexto
- navegação por abas
- aparência base de cards, painéis, blocos e superfícies do formulário

Fora de escopo:
- alteração de contratos HTTP
- mudança de fluxo funcional do cadastro
- redistribuição profunda de campos entre abas
- criação de novos passos, wizard ou validações adicionais
- mudança estrutural das tabelas internas além de styling e hierarquia

**Direção visual aprovada**

Direção escolhida: `Opção A - Comando premium`.

Características da direção:
- aparência executiva e premium, sem cair em visual futurista excessivo
- contraste forte com base escura nas áreas de destaque
- acentos quentes em dourado/âmbar para CTA, ênfase e estados de destaque
- sensação de console operacional, não de landing genérica
- reorganização leve da estrutura para melhorar leitura, sem alterar o fluxo existente

**Princípios de design**

- Priorizar leitura imediata de status, documento, vínculo e contexto operacional.
- Diferenciar claramente áreas de ação, navegação e conteúdo.
- Usar profundidade visual com moderação: borda, glow, gradiente e sombra devem reforçar hierarquia, não competir com os dados.
- Manter contraste e foco acessíveis, especialmente em inputs, abas e botões.
- Preservar responsividade real em mobile e tablet, evitando compressão visual excessiva.

**Sistema visual proposto**

Paleta:
- base escura profunda para áreas hero e cabeçalhos de contexto
- superfícies claras ou levemente azuladas para áreas densas de formulário
- destaque âmbar/dourado para CTA principal, estado ativo e indicadores-chave
- texto principal com contraste alto e texto secundário com contraste suficiente para leitura contínua

Tipografia:
- aparência mais firme e institucional
- títulos maiores, com peso alto e menor tracking
- texto auxiliar com entrelinha confortável

Componentização visual:
- cards com raio mais generoso e separação mais clara entre níveis
- abas em formato de pílula, com ativo mais expressivo
- toolbar com agrupamento explícito entre busca, filtros e ação principal
- blocos de resumo no formulário com leitura rápida antes do conteúdo tabulado

**Mudanças por área**

**1. Landing**

Objetivo:
Transformar a entrada do módulo em um hero mais nobre, mantendo a busca rápida como principal chamada à ação.

Mudanças:
- refinar o hero atual com composição mais limpa e mais contraste entre título, subtítulo e bloco de busca
- migrar o destaque cromático principal para acento âmbar/dourado, preservando a base escura
- reforçar o card de busca com aparência de painel premium, com melhor tratamento de borda, foco e profundidade
- tornar os KPIs mais fortes visualmente, com melhor diferenciação entre label, valor e descrição
- manter a estrutura geral já existente, evitando reescrita completa da landing

Resultado esperado:
- sensação inicial mais premium
- CTA principal mais evidente
- entrada mais memorável e mais alinhada ao restante do módulo

**2. Listagem**

Objetivo:
Fazer a transição da landing para a tabela com menos sensação de ruptura visual.

Mudanças:
- estilizar a toolbar da listagem como faixa executiva, com melhor agrupamento e respiro
- destacar a ação principal `Novo cedente`
- melhorar relação visual entre busca, paginação e tabela
- manter o DataTable e o fluxo atual, focando em superfície, espaçamento e leitura

Resultado esperado:
- listagem mais coesa com a landing
- ganho de percepção de qualidade sem alteração funcional

**3. Formulário**

Objetivo:
Dar ao formulário uma camada de contexto operacional antes da área tabulada.

Mudanças:
- substituir a sensação atual de barra simples de metadados por um cabeçalho-resumo mais forte
- introduzir um bloco visual superior com dados-chave, como pessoa vinculada, documento, status e contexto do cadastro
- reforçar o contraste visual entre cabeçalho, navegação por abas e conteúdo
- manter a lógica de tabs atual

Resultado esperado:
- leitura imediata do estado do cadastro
- tela menos “flat” e mais orientada à operação

**4. Abas**

Objetivo:
Melhorar orientação e escaneabilidade.

Mudanças:
- trocar visual de abas para pílulas com ativo mais marcado
- melhorar espaçamento, overflow horizontal e distinção entre habilitado, ativo e desabilitado
- manter comportamento e ordem atuais

Resultado esperado:
- navegação mais clara
- menor sensação de densidade horizontal

**5. Cards e superfícies internas**

Objetivo:
Elevar a qualidade visual do formulário sem redesenhar todas as abas individualmente.

Mudanças:
- revisar bordas, fundos, raios, sombras e títulos dos `.entity-card`
- reforçar títulos e descrições de seção
- melhorar inputs, selects, textareas e estados de foco para coerência com a nova direção
- refinar tabelas internas e ações contextuais para acompanhar o mesmo sistema visual

Resultado esperado:
- aparência mais consistente em todas as abas
- menor sensação de formulário utilitário genérico

**Implementação prevista**

Arquivos principais:
- `src/features/cadastros/cedentes/CedentesListPage.tsx`
- `src/features/cadastros/cedentes/cedentes-landing.css`
- `src/features/cadastros/cedentes/CedenteFormPage.tsx`
- `src/features/cadastros/administradoras/entity-form.css`
- `src/features/cadastros/cadastro.css`

Estratégia:
- aproveitar a estrutura existente
- concentrar a maior parte da mudança em composição visual e CSS
- adicionar no formulário apenas wrappers e blocos de resumo estritamente necessários para a nova hierarquia

**Riscos e cuidados**

- Não exagerar em glassmorphism ou brilho em áreas com muitos campos.
- Não degradar contraste em labels, placeholders e textos auxiliares.
- Não quebrar a responsividade do conjunto de abas nem o comportamento do formulário em telas menores.
- Não introduzir regressão no fluxo de navegação entre landing, listagem e edição.

**Critérios de aceite**

- A landing mantém sua função atual, mas com aparência mais premium e melhor hierarquia.
- A listagem fica visualmente coerente com a landing.
- O formulário passa a ter cabeçalho-resumo mais forte antes das abas.
- As abas ficam mais claras, com ativo e desabilitado mais legíveis.
- Cards, tabelas e campos ganham consistência visual no fluxo inteiro.
- O fluxo funcional e as integrações atuais permanecem intactos.
- A interface permanece responsiva em mobile e desktop.

**Verificação planejada**

- `npm run build`
- inspeção visual nas rotas de cedentes
- validação manual de responsividade
- se o escopo final tocar fluxo crítico de navegação, considerar `npm run e2e`
