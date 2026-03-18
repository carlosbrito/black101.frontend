# Auditoria Dos Modulos De Cadastros Contra O Backend Legado

**Objetivo**

Alinhar os itens navegaveis do menu `Cadastros` do frontend React aos contratos do backend usados pelo sistema legado Angular, sem expandir o escopo para subtabs e formularios internos alem do necessario para manter o fluxo principal de entrada do modulo.

**Escopo validado**

Itens auditados do menu:
- Administradoras
- Agentes
- Bancos
- Cedentes
- Certificadoras
- Empresas
- Modalidades
- Representantes
- Sacados
- Testemunhas
- Prestadores de Servicos
- Investidores
- Despesas
- Grupo Economico
- Indices Debenture

**Resultado da auditoria**

Ja aderentes ao legado no contrato principal:
- Agentes
- Bancos
- Modalidades
- Representantes
- Testemunhas
- Prestadores de Servicos
- Investidores
- Despesas

Divergentes e alvo desta correcao:
- Administradoras: React usa `/cadastros/administradoras`; legado usa `administradora/get|remove`.
- Cedentes: React usa `/cadastros/cedentes`; legado usa `cedente/get|remove` e listagem principal por POST.
- Sacados: React usa `/cadastros/sacados`; legado usa `sacado/get|remove` e listagem principal por POST.
- Empresas: React lista por `/cadastros/empresas`; legado usa `fidc/get|remove`.
- Certificadoras: React usa CRUD generico `/cadastros/certificadoras`; legado usa `certificadora/get|register|update|remove`.
- Grupo Economico: React usa CRUD generico `/cadastros/basicos/GrupoEconomico`; legado usa `grupoEconomico/get|register|update|remove`.
- Indices Debenture: React tenta consumir backend; no legado o modulo se apoia em enum local compartilhado, sem CRUD remoto do menu.

**Direcao tecnica**

- Ajustar listagens principais para os mesmos endpoints e verbos HTTP do legado.
- Ajustar remocao principal para os contratos `remove` do legado.
- Remover dependencias de endpoints `/cadastros/...` onde o legado usa `/api/...`.
- Nos modulos com entrada por documento no legado, substituir auto-cadastro REST proprio do React por navegacao para criacao com documento pre-preenchido.
- Em `Certificadoras` e `Grupo Economico`, adaptar o CRUD modal atual do React para um adapter de contrato legado em vez de trocar o fluxo visual.
- Em `Indices Debenture`, trocar a tela para fonte estatica local, espelhando o comportamento legado.
