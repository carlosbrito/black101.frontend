import type { MenuGroup } from '../../shared/types/menu';

const c = (route: string) => `/construcao/${route}`;

export const legacyMenu: MenuGroup[] = [
  {
    label: 'Cadastros',
    childrens: [
      { label: 'Administradoras', route: '/cadastro/administradoras' },
      { label: 'Agentes', route: '/cadastro/agentes' },
      { label: 'Bancos', route: '/cadastro/bancos' },
      { label: 'Cedentes', route: '/cadastro/cedentes' },
      { label: 'Certificadoras', route: '/cadastro/certificadoras' },
      { label: 'Empresas', route: '/cadastro/empresas' },
      { label: 'Modalidades', route: '/cadastro/modalidades' },
      { label: 'Representantes', route: '/cadastro/representantes' },
      { label: 'Sacados', route: '/cadastro/sacados' },
      { label: 'Testemunhas', route: '/cadastro/testemunhas' },
      { label: 'Classificação', route: c('register/rating') },
      { label: 'Prestadores de Serviços', route: '/cadastro/prestadores' },
      { label: 'Investidores', route: '/cadastro/investidores' },
    ],
    complementaryItems: [
      {
        label: 'Complementares',
        childrens: [
          { label: 'Despesas', route: '/cadastro/despesas' },
          { label: 'Grupo Econômico', route: '/cadastro/grupo-economico' },
        ],
      },
      {
        label: 'Debentures',
        childrens: [{ label: 'Índices', route: '/cadastro/indices-debentures' }],
      },
    ],
  },
  {
    label: 'Dashboards',
    childrens: [
      { label: 'Carteira Geral', route: c('dashboard/wallet-v2') },
      { label: 'Resumo Operacional', route: c('dashboard/operational-summary') },
      { label: 'Dashboard Fundos', route: c('dashboard/fundos') },
      { label: 'Dashboard BI', route: c('dashboard/black-bi') },
    ],
  },
  {
    label: 'Ativos',
    childrens: [
      { label: 'CCB', route: c('ativos/emissao-ccbs') },
      { label: 'Nota Comercial', route: c('ativos/nota-comercial') },
    ],
    complementaryItems: [
      {
        label: 'Cartão de Crédito',
        childrens: [
          { label: 'Optin', route: c('ativos/cartao-de-credito/optin') },
          { label: 'Contrato', route: c('ativos/cartao-de-credito/contrato') },
          { label: 'Agenda', route: c('ativos/cartao-de-credito/agenda') },
        ],
      },
    ],
  },
  {
    label: 'Operações',
    childrens: [
      { label: 'Operações', route: '/operacoes' },
      { label: 'Importar Operações', route: '/operacoes/importacoes' },
      { label: 'Registros', route: c('gestora/registros') },
      { label: 'Recebíveis', route: c('operation/documentsv2') },
      { label: 'Recebíveis Gestora', route: c('gestora/recebiveis') },
      { label: 'Carteira', route: c('operation/wallet-fidc') },
      { label: 'Gestora', route: c('gestora/operations') },
      { label: 'Lastros', route: c('lastro') },
      { label: 'Garantia', route: c('gestora/assurance') },
      { label: 'Garantidores', route: c('gestora/guarantors') },
      { label: 'Instruções', route: c('operation/instrucoes') },
      { label: 'Dividas', route: c('gestora/debt') },
      { label: 'Checagem', route: c('operation/checagem') },
      { label: 'Cobrança', route: c('operation/cobranca') },
      { label: 'Monitoramento NFe', route: c('operation/monitoramento-nfe') },
      { label: 'Revisão dos Fundos', route: c('gestora/net-worth') },
      { label: 'Simulador', route: c('operation/simulador') },
      { label: 'Workers', route: '/operacoes/workers' },
    ],
  },
  {
    label: 'Financeiro',
    childrens: [
      { label: 'Movimentações', route: '/financeiro/movimentacoes' },
      { label: 'Plano de Contas', route: c('financial/accounts-plans') },
      { label: 'Movimento Contábil', route: c('financial/contabil-movements') },
      { label: 'Contas a Pagar', route: c('financial/accounts-to-pay') },
      { label: 'Contas a Receber', route: c('financial/accounts-to-receive') },
      { label: 'Centro de Custo', route: c('financial/cost-center') },
      { label: 'Movimento Falimentar', route: c('financial/bankruptcy-motion') },
      { label: 'Fechar Data Mov. Financeiro', route: c('financial/close-movement-date') },
    ],
  },
  {
    label: 'Securitizadora',
    childrens: [
      { label: 'Emissão Debêntures', route: '/securitizadora/debentures/emissoes' },
      { label: 'Venda de Debêntures', route: '/securitizadora/debentures/vendas' },
      { label: 'Resgate de Debêntures', route: '/securitizadora/debentures/resgates' },
      { label: 'Atualização de Rendimentos', route: '/securitizadora/debentures/rendimentos' },
    ],
    complementaryItems: [
      {
        label: 'Relatórios',
        childrens: [
          { label: 'Relatório de Rendimentos', route: '/securitizadora/debentures/relatorios/rendimentos' },
          { label: 'Relatório Extrato de Vendas', route: '/securitizadora/debentures/relatorios/extrato-vendas' },
          { label: 'Relatório de Resgate', route: '/securitizadora/debentures/relatorios/resgates' },
        ],
      },
      {
        label: 'Contabilidade',
        childrens: [
          { label: 'Operações Despesas Detalhadas', route: '/securitizadora/contabilidade/despesas-detalhadas' },
          { label: 'Importação Folhamatic', route: '/securitizadora/contabilidade/importacao/folhamatic' },
          { label: 'Importação Dominio', route: '/securitizadora/contabilidade/importacao/dominio' },
          { label: 'Importação Alterdata', route: '/securitizadora/contabilidade/importacao/alterdata' },
          { label: 'Importação Phoenix', route: '/securitizadora/contabilidade/importacao/phoenix' },
          { label: 'Importação Prosis', route: '/securitizadora/contabilidade/importacao/prosis' },
        ],
      },
    ],
  },
  {
    label: 'Administrativo',
    childrens: [
      { label: 'Templates', route: '/admin/templates' },
      { label: 'Usuários', route: '/admin/usuarios' },
      { label: 'Grupos', route: '/admin/roles' },
      { label: 'Auditoria', route: '/admin/auditoria' },
    ],
  },
];
