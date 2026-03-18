# Migração do módulo de Movimentações Financeiras

## Contexto

O projeto `black101.frontend` já possui uma rota React para `Financeiro > Movimentações`, mas hoje ela implementa apenas um CRUD simplificado em [`src/features/financeiro/MovimentacoesPage.tsx`](C:/rep/refacFront/black101.frontend/src/features/financeiro/MovimentacoesPage.tsx). O módulo legado em Angular, localizado em [`src/app/modules/financial/movements/`](C:/rep/refacFront/BlackArrow.PortalFidc.FrontEnd/src/app/modules/financial/movements), possui comportamento substancialmente mais amplo e deve ser migrado integralmente.

O objetivo desta frente é migrar totalmente o módulo de movimento financeiro para o frontend React, preservando regras de negócio e comportamento do legado o mais fiel possível, mas adaptando a experiência visual e estrutural ao padrão já utilizado no `black101.frontend`.

## Objetivos

- Entregar o módulo completo de movimentações financeiras no frontend React.
- Reaproveitar os endpoints atuais do backend sem exigir mudança de contrato.
- Preservar regras de negócio, validações e fluxos operacionais do legado.
- Adaptar layout, composição de telas e organização de código ao padrão React já adotado no projeto.
- Priorizar funcionamento fim a fim para usuário final; refinamentos visuais podem ocorrer em iterações posteriores.

## Fora de escopo

- Alterações de backend, contratos de API ou permissões de servidor.
- Refatorações amplas e não relacionadas em módulos adjacentes do frontend.
- Redesenho visual completo do domínio financeiro além do necessário para aderir ao padrão atual do projeto.

## Abordagem escolhida

Foi escolhida a abordagem de migração por capacidades dentro de um único módulo React da feature. Essa abordagem mantém a coesão funcional da área de movimentações financeiras, reduz acoplamento entre responsabilidades e evita transportar para o React a estrutura monolítica do módulo Angular.

Em vez de uma página única grande ou de várias entregas desconectadas por rota, a feature será organizada como um módulo React único, composto por subpartes focadas: página container, componentes de exibição, dialogs especializados, camada de serviço e mapeadores tipados.

## Comportamentos do legado que devem ser preservados

Os seguintes comportamentos do módulo Angular são obrigatórios na primeira entrega React:

- carregamento inicial com filtro padrão do dia atual;
- listagem paginada, ordenável e atualizável;
- exibição de cards de saldo de contas;
- filtros por período e demais campos principais do legado;
- criação de nova movimentação via seleção de tipo;
- edição por tipo de movimentação;
- fluxos distintos para débito, crédito e transferência;
- importação de movimentações em múltiplas etapas;
- exclusão individual;
- exclusão em lote;
- baixa em lote;
- reabertura em lote;
- histórico da movimentação;
- exportação para Excel;
- geração de relatório de contabilidade;
- refresh da lista e dos cards após operações concluídas.

## Diretriz de experiência

A experiência da nova tela deve seguir o padrão de navegação, layout, estrutura visual e ergonomia do `black101.frontend`. Isso inclui uso do `PageFrame`, componentes reutilizáveis do projeto e convenções já adotadas para formulários, tabelas, carregamento e feedback.

Ao mesmo tempo, as regras e os comportamentos operacionais do legado devem ser mantidos o mais fielmente possível. Em caso de conflito entre forma visual e regra de negócio, a regra de negócio do legado prevalece.

## Arquitetura proposta

O módulo será reorganizado em torno de uma página container da rota `financeiro/movimentacoes`. Essa página será responsável por:

- carregar e sincronizar lista, cards e estado de consulta;
- coordenar filtros, paginação, ordenação e seleção em lote;
- abrir dialogs especializados;
- executar refresh consistente após ações de escrita;
- aplicar regras de permissão vindas do contexto de autenticação.

As regras de transformação de dados não devem ficar espalhadas em JSX. O payload do backend legado mistura dados de domínio com elementos de apresentação. Para evitar acoplamento excessivo, haverá uma camada de mapeamento responsável por transformar respostas da API em view models prontos para a UI React e por montar payloads de comando para criação, edição, baixa, reabertura, importação e exclusão.

## Estrutura proposta de arquivos

O módulo deve ser criado dentro de `src/features/financeiro/movimentacoes/`, mantendo a rota atual como ponto de entrada. A decomposição proposta é:

- `page/`: container principal da feature;
- `components/`: tabela, cards de saldo e barra de ações;
- `dialogs/`: filtro, seleção de tipo, formulários de débito/crédito/transferência, importação, histórico, exclusão em lote e baixa/reabertura;
- `services/`: acesso HTTP e comandos da feature;
- `types/`: contratos TypeScript de API e UI;
- `mappers/`: adaptação dos modelos do backend para modelos de tela;
- `utils/`: validações e helpers específicos do módulo.

Essa divisão foi escolhida para manter responsabilidades separadas sem fragmentar o módulo em múltiplas rotas independentes.

## Fluxo principal da feature

Ao entrar na rota:

1. A página define filtros padrão do dia atual.
2. A página carrega cards de saldo e lista paginada.
3. A tabela exibe seleção em lote, ações por linha, ordenação e paginação.
4. Os dialogs especializados executam operações por tipo ou por contexto.
5. Ao concluir qualquer operação com sucesso, a página recarrega lista e cards.

## Modelo de estado

O estado da feature será centralizado no container da página, separado em blocos claros:

- estado de consulta: filtros, paginação e ordenação;
- estado de dados: lista, totalizadores, cards e seleção;
- estado de execução: carregamentos, submissões e refresh;
- estado de interface: dialogs abertos e item ativo;
- estado derivado de permissão: ações visíveis e ações permitidas.

Esse modelo reduz inconsistência entre tabela, modais e ações em lote, além de facilitar testes.

## Regras críticas de negócio

As regras abaixo devem ser reproduzidas como no legado:

- seleção em lote exige registros do mesmo tipo;
- baixa em lote só pode ocorrer quando todos os itens selecionados estiverem em aberto;
- reabertura em lote só pode ocorrer quando todos os itens selecionados estiverem baixados;
- transferências não podem ser reabertas em lote;
- ações individuais e em lote devem respeitar permissões do usuário;
- a UI deve diferenciar corretamente débito, crédito e transferência em rótulo, ícone, cor e formulário;
- o valor principal exibido deve seguir a mesma lógica condicional usada no legado;
- descrições, contas, cedente, fornecedor/origem/destino e status devem ser normalizados antes da renderização.

## Estratégia de integração com API

Os endpoints atuais serão reaproveitados. A feature React deve encapsular a comunicação HTTP em serviços próprios e não acoplar componentes diretamente ao shape bruto das respostas.

Será necessário mapear pelo menos os seguintes grupos de chamadas:

- listagem paginada de movimentações;
- saldo de contas;
- exportação Excel;
- geração de relatório contábil;
- exclusão individual;
- operações de criação e edição;
- importação;
- histórico;
- operações em lote.

Se algum endpoint do legado não estiver hoje consumido pelo React novo, ele deve ser integrado sem mudança contratual, apenas por adaptação na camada frontend.

## Tratamento de erro

Falhas de leitura devem exibir feedback ao usuário sem quebrar a tela atual. Falhas em ações de escrita devem manter o dialog aberto quando fizer sentido, preservando contexto e permitindo correção.

As operações sensíveis devem ter validação prévia em frontend quando a regra já for conhecida, principalmente:

- consistência de tipo em seleção em lote;
- verificação de status aberto/baixado;
- bloqueio de reabertura para transferências.

Mensagens de erro e sucesso devem seguir o padrão de feedback já utilizado no projeto.

## Estratégia de testes

Para reduzir risco de regressão na migração, a cobertura mínima deve incluir:

- testes unitários para mapeadores e validações de regra crítica;
- testes de componente para carregamento, filtros, seleção em lote e refresh pós-ação;
- pelo menos um fluxo E2E cobrindo abertura da rota, filtragem, criação/edição/exclusão e uma operação em lote.

O foco dos testes deve estar na preservação de comportamento do legado, não em detalhes visuais finos.

## Critérios de aceite

A migração será considerada pronta para uso quando:

- a rota React de movimentações substituir funcionalmente o módulo legado;
- os fluxos principais do usuário final estiverem operacionais;
- as regras críticas do legado estiverem preservadas;
- a feature estiver integrada ao padrão visual e estrutural do `black101.frontend`;
- os endpoints existentes forem reutilizados sem necessidade de ajuste no backend;
- houver evidência de verificação por build/lint/testes relevantes.

## Riscos e mitigação

### Complexidade contratual do legado

Os payloads do legado carregam muitos campos e comportamentos implícitos.

Mitigação: criar contratos TypeScript explícitos e mapeadores dedicados entre API e UI.

### Regressão em operações em lote

Baixa, reabertura e exclusão em lote têm regras condicionais importantes.

Mitigação: isolar validações em funções puras e cobri-las com testes unitários.

### Acoplamento excessivo entre dialogs e página

O módulo possui muitos fluxos secundários.

Mitigação: separar dialogs por responsabilidade e expor contratos simples entre página e dialog.

### Entrega visual incompleta

Como a prioridade é funcionamento, há risco de acabamento parcial.

Mitigação: alinhar desde já que refinamentos visuais finais ficam para iteração posterior, sem bloquear a entrega funcional.

## Decisão final

A implementação deve começar pela espinha dorsal da feature em React, com container principal, contratos, serviços e mapeadores. Em seguida, os dialogs e operações especializadas devem ser integrados progressivamente dentro do mesmo módulo até cobrir o comportamento completo do legado.
