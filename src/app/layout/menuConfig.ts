import type { MenuGroup } from '../../shared/types/menu';

const c = (route: string) => `/construcao/${route}`;

export const legacyMenu: MenuGroup[] = [
  {
    label: 'Cadastros',
    childrens: [
      { label: 'Administradoras', route: '/cadastro/administradoras' },
      { label: 'Agentes', route: '/cadastro/agentes' },
      { label: 'Bancos', route: '/cadastro/bancos' },
      { label: 'Bancarizador', route: c('register/bancarizador') },
      { label: 'Cedentes', route: '/cadastro/cedentes' },
      { label: 'Consultoras', route: c('register/consultant') },
      { label: 'Custodiantes', route: c('register/custodians') },
      { label: 'Certificadoras', route: c('register/certifiers') },
      { label: 'Empresas', route: c('register/fidc') },
      { label: 'Regulamento', route: c('register/regulamento') },
      { label: 'Fornecedores', route: c('register/suppliers') },
      { label: 'Gestoras', route: c('register/managers') },
      { label: 'Representantes', route: '/cadastro/representantes' },
      { label: 'Sacados', route: c('register/drawers') },
      { label: 'Testemunhas', route: c('register/witnesses') },
      { label: 'Classificação', route: c('register/rating') },
      { label: 'Blacklist', route: c('gestora/blacklist') },
      { label: 'Prestadores de Serviços', route: c('service-providers') },
      { label: 'Investidores', route: c('register/investor') },
      { label: 'Registradoras', route: c('register/registers') },
      { label: 'Credenciadoras', route: c('register/credenciadoras') },
      { label: 'Produto', route: c('register/product') },
      { label: 'Emitentes', route: c('register/emitentes') },
      { label: 'WhiteList', route: c('register/white-list') },
    ],
    complementaryItems: [
      {
        label: 'Complementares',
        childrens: [
          { label: 'Despesas', route: c('register/expense') },
          { label: 'Grupo Econômico', route: c('register/economic-group') },
          { label: 'Esteira de Crédito', route: c('register/credit-mat') },
        ],
      },
      {
        label: 'Debentures',
        childrens: [{ label: 'Índices', route: c('register/investor') }],
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
      { label: 'Registros', route: c('gestora/registros') },
      { label: 'Recebíveis', route: c('operation/documentsv2') },
      { label: 'Recebíveis Gestora', route: c('gestora/recebiveis') },
      { label: 'Operações', route: c('operation/operations') },
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
    ],
  },
  {
    label: 'Financeiro',
    childrens: [
      { label: 'Movimentações', route: c('financial/movements') },
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
    label: 'Relatórios',
    childrens: [
      { label: 'Gestora', route: c('report/relatorio-gestora') },
      { label: 'Meus Relatórios', route: c('report/my-reports') },
      { label: 'Cedente', route: c('report/assignor') },
      { label: 'Financeiro', route: c('report/financial') },
      { label: 'Reciprocidade Serasa', route: c('report/reciprocidade-serasa') },
      { label: 'Operação', route: c('report/operation') },
      { label: 'Contabilidade', route: c('report/accounting') },
    ],
    complementaryItems: [
      {
        label: 'Relatórios Externos',
        childrens: [
          { label: 'Aquisições', route: c('acquisition') },
          { label: 'Baixados e Liquidados', route: c('lowered-and-paid') },
          { label: 'Carteira Diária', route: c('report/wallet-import') },
          { label: 'Estoque', route: c('report/inventory') },
          { label: 'Extrato Bancário', route: c('gestora/bank-statement') },
          { label: 'Evolução das Cotas', route: c('report/pl') },
          { label: 'Movimentos em Aberto', route: c('gestora/open-moves') },
          { label: 'Pagamento das Operações', route: c('gestora/operations-payments') },
          { label: 'Saldos', route: c('gestora/balance') },
        ],
      },
      {
        label: 'Securitizadora',
        childrens: [{ label: 'Debentures', route: c('report/debenture') }],
      },
    ],
  },
  {
    label: 'Consultas',
    childrens: [{ label: 'Consulta Cadastral', route: c('register/consultation') }],
  },
  {
    label: 'Comunicações',
    childrens: [
      { label: 'Central de E-mail', route: c('comunication/email') },
      { label: 'Notificações', route: c('comunication/notification') },
      { label: 'Carta de Cessão', route: c('comunication/carta-cessao') },
    ],
  },
  {
    label: 'Administrativo',
    childrens: [
      { label: 'E-mails', route: c('register/emails') },
      { label: 'Grupos', route: '/admin/roles' },
      { label: 'Monitoramento de Integração', route: c('register/integration-log') },
      { label: 'Log Integração', route: c('register/log-integracao') },
      { label: 'Log Implantação', route: c('register/log-implantacao') },
      { label: 'Pessoas', route: c('register/person') },
      { label: 'Templates', route: c('register/templates') },
      { label: 'Usuários', route: '/admin/usuarios' },
      { label: 'FAQ', route: c('register/manual-faq') },
      { label: 'Auditoria', route: '/admin/auditoria' },
    ],
  },
  {
    label: 'Setup',
    childrens: [
      { label: 'Migração de dados', route: c('setup/data-migration') },
      { label: 'Cadastro de Fundo', route: c('setup/fund-register') },
    ],
  },
  {
    label: 'Debentures',
    childrens: [
      { label: 'Emissão', route: c('debenture/emissao') },
      { label: 'Vendas', route: c('debenture/vendas') },
    ],
  },
];
