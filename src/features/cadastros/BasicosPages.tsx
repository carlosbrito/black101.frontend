import { CadastroCrudPage } from './CadastroCrudPage';
import type { Column } from '../../shared/ui/DataTable';
import { DataTable } from '../../shared/ui/DataTable';
import { PageFrame } from '../../shared/ui/PageFrame';
import { getErrorMessage, http } from '../../shared/api/http';
import { sanitizeDocument } from './cadastroCommon';
import toast from 'react-hot-toast';
import { BasicoEntityListPage } from './basicos/BasicoEntityListPage';
import { basicoEntityApis } from './basicos/entityApi';

const tiposComCodigo = new Set(['Produto', 'WhiteList', 'BlackList']);

const tiposPessoa = new Set([
  'Registradora',
  'Credenciadora',
]);

const staticIndiceDebentureRows = [
  { id: '1', codigo: '1', nome: 'CDI' },
  { id: '2', codigo: '2', nome: 'FIXO' },
  { id: '3', codigo: '3', nome: 'IPCA' },
  { id: '4', codigo: '4', nome: 'HÍBRIDO (FIXO + CDI)' },
  { id: '5', codigo: '5', nome: 'DESÁGIO' },
];

const makeBasicoPage = (title: string, subtitle: string, endpoint: string, tipo: string) => {
  const columns: Column<Record<string, unknown>>[] = [
    { key: 'nome', label: 'Nome' },
    ...(tiposComCodigo.has(tipo) ? [{ key: 'codigo', label: 'Código' }] : []),
    { key: 'documento', label: 'Documento' },
    ...(tiposPessoa.has(tipo) ? [{ key: 'email', label: 'E-mail' }, { key: 'telefone', label: 'Telefone' }] : []),
    { key: 'ativo', label: 'Ativo' },
    { key: 'createdAt', label: 'Cadastro' },
  ];

  const fields = [
    { name: 'nome', label: 'Nome' },
    ...(tiposComCodigo.has(tipo) ? [{ name: 'codigo', label: 'Código', required: false }] : []),
    { name: 'documento', label: 'CPF/CNPJ', mask: 'cpfCnpj' as const, required: false },
    ...(tiposPessoa.has(tipo)
      ? [
          { name: 'email', label: 'E-mail', type: 'email' as const, required: false },
          { name: 'telefone', label: 'Telefone', mask: 'phone' as const, required: false },
          { name: 'cidade', label: 'Cidade', required: false },
          { name: 'uf', label: 'UF', required: false },
        ]
      : []),
  ];

  const defaultValues: Record<string, string | boolean> = { nome: '', documento: '', ativo: true };
  if (tiposComCodigo.has(tipo)) defaultValues.codigo = '';
  if (tiposPessoa.has(tipo)) {
    defaultValues.email = '';
    defaultValues.telefone = '';
    defaultValues.cidade = '';
    defaultValues.uf = '';
  }

  const lookupDocumento = async (doc: string) => {
    const digits = sanitizeDocument(doc);
    if (digits.length !== 14) return null;
    try {
      const resp = await http.get('/cadastros/pessoas/receita', { params: { cnpj: digits } });
      const data = resp.data as Record<string, unknown>;
      return {
        nome: String(data.nome ?? ''),
        cidade: String(data.cidade ?? ''),
        uf: String(data.uf ?? ''),
        email: String(data.email ?? ''),
        telefone: String(data.telefone ?? ''),
        documento: digits,
      };
    } catch (error) {
      toast.error(getErrorMessage(error));
      return null;
    }
  };

  return (
    <CadastroCrudPage
      title={title}
      subtitle={subtitle}
      endpoint={endpoint}
      columns={columns as Column<Record<string, unknown>>[]}
      fields={fields}
      defaultValues={defaultValues}
      withExtras
      onDocumentoLookup={lookupDocumento}
    />
  );
};

export const ConsultorasPage = () => (
  <BasicoEntityListPage
    title="Cadastro de Consultoras"
    subtitle="Cadastro em tela cheia com abas e auto-cadastro por documento."
    api={basicoEntityApis.consultora}
    routeBase="/cadastro/consultoras"
    createLabel="Nova consultora"
  />
);

export const CustodiantePage = () => (
  <BasicoEntityListPage
    title="Cadastro de Custodiantes"
    subtitle="Cadastro em tela cheia com abas e auto-cadastro por documento."
    api={basicoEntityApis.custodiante}
    routeBase="/cadastro/custodiantes"
    createLabel="Novo custodiante"
  />
);

export const GestorasPage = () => (
  <BasicoEntityListPage
    title="Cadastro de Gestoras"
    subtitle="Cadastro em tela cheia com abas e auto-cadastro por documento."
    api={basicoEntityApis.gestora}
    routeBase="/cadastro/gestoras"
    createLabel="Nova gestora"
  />
);

export const FornecedoresPage = () => (
  <BasicoEntityListPage
    title="Cadastro de Fornecedores"
    subtitle="Cadastro em tela cheia com abas e auto-cadastro por documento."
    api={basicoEntityApis.fornecedor}
    routeBase="/cadastro/fornecedores"
    createLabel="Novo fornecedor"
  />
);

export const EmitentesPage = () => (
  <BasicoEntityListPage
    title="Cadastro de Emitentes"
    subtitle="Cadastro em tela cheia com abas e auto-cadastro por documento."
    api={basicoEntityApis.emitente}
    routeBase="/cadastro/emitentes"
    createLabel="Novo emitente"
  />
);

export const EmpresasPage = () => (
  <BasicoEntityListPage
    title="Cadastro de Empresas"
    subtitle="Cadastro em tela cheia com abas, alinhado ao contrato legado de FIDC."
    api={basicoEntityApis.fidc}
    routeBase="/cadastro/empresas"
    createLabel="Nova empresa"
    allowAutoCadastro={false}
  />
);

export const PrestadoresPage = () => (
  <BasicoEntityListPage
    title="Cadastro de Prestadores de Serviço"
    subtitle="Cadastro em tela cheia com abas e auto-cadastro por documento."
    api={basicoEntityApis.prestador}
    routeBase="/cadastro/prestadores"
    createLabel="Novo prestador"
  />
);

export const InvestidoresPage = () => (
  <BasicoEntityListPage
    title="Cadastro de Investidores"
    subtitle="Cadastro em tela cheia com abas e auto-cadastro por documento."
    api={basicoEntityApis.investidor}
    routeBase="/cadastro/investidores"
    createLabel="Novo investidor"
  />
);

export const CertificadorasPage = () => (
  <CadastroCrudPage
    title="Certificadoras"
    subtitle="Cadastro de certificadoras com contrato legado."
    endpoint=""
    columns={[
      { key: 'nome', label: 'Nome' },
      { key: 'documento', label: 'Documento' },
      { key: 'url', label: 'URL' },
      { key: 'ativo', label: 'Ativo' },
      { key: 'createdAt', label: 'Cadastro' },
    ]}
    fields={[
      { name: 'nome', label: 'Nome' },
      { name: 'documento', label: 'CPF/CNPJ', mask: 'cpfCnpj', required: false },
      { name: 'url', label: 'URL', required: false },
    ]}
    defaultValues={{ nome: '', documento: '', url: '', ativo: true }}
    apiMapper={{
      api: basicoEntityApis.certificadora,
      mapListItem: (item) => ({
        id: String(item.id ?? ''),
        nome: String(item.nome ?? ''),
        documento: String(item.cnpjCpf ?? ''),
        url: String(item.url ?? ''),
        ativo: Number(item.status ?? 0) === 0,
        createdAt: item.dateCreated as string | undefined,
      }),
      mapUniqueItem: (item) => ({
        id: String(item.id ?? ''),
        nome: String(item.nome ?? ''),
        documento: String(item.cnpjCpf ?? ''),
        url: String(item.url ?? ''),
        ativo: Number(item.status ?? 0) === 0,
      }),
      buildCreatePayload: (form) => ({
        nome: String(form.nome ?? '').trim().toUpperCase(),
        observacoes: null,
        status: form.ativo === false ? 1 : 0,
        url: String(form.url ?? '').trim() || null,
        cnpjCpf: sanitizeDocument(String(form.documento ?? '')) || null,
      }),
      buildUpdatePayload: (id, form) => ({
        id,
        nome: String(form.nome ?? '').trim().toUpperCase(),
        observacoes: null,
        status: form.ativo === false ? 1 : 0,
        url: String(form.url ?? '').trim() || null,
        cnpjCpf: sanitizeDocument(String(form.documento ?? '')) || null,
      }),
    }}
  />
);
export const RegistradorasPage = () => makeBasicoPage('Registradoras', 'Cadastro de registradoras.', '/cadastros/registradoras', 'Registradora');
export const CredenciadorasPage = () => makeBasicoPage('Credenciadoras', 'Cadastro de credenciadoras.', '/cadastros/credenciadoras', 'Credenciadora');
export const ProdutosPage = () => makeBasicoPage('Produtos', 'Cadastro de produtos.', '/cadastros/basicos/Produto', 'Produto');
export const WhiteListPage = () => makeBasicoPage('WhiteList', 'Cadastro de whitelist.', '/cadastros/basicos/WhiteList', 'WhiteList');
export const BlackListPage = () => makeBasicoPage('Blacklist', 'Cadastro de blacklist.', '/cadastros/basicos/BlackList', 'BlackList');
export const DespesasPage = () => makeBasicoPage('Despesas', 'Cadastro de despesas.', '/cadastros/basicos/Despesa', 'Despesa');
export const GrupoEconomicoPage = () => (
  <CadastroCrudPage
    title="Grupo Econômico"
    subtitle="Cadastro de grupos econômicos com contrato legado."
    endpoint=""
    columns={[
      { key: 'nome', label: 'Nome' },
      { key: 'limiteTotal', label: 'Limite Total' },
      { key: 'ativo', label: 'Ativo' },
      { key: 'createdAt', label: 'Cadastro' },
    ]}
    fields={[
      { name: 'nome', label: 'Nome' },
      { name: 'limiteTotal', label: 'Limite Total', required: false },
      { name: 'observacao', label: 'Observação', required: false },
    ]}
    defaultValues={{ nome: '', limiteTotal: '', observacao: '', ativo: true }}
    apiMapper={{
      api: basicoEntityApis.grupoEconomico,
      mapListItem: (item) => ({
        id: String(item.id ?? ''),
        nome: String(item.nome ?? ''),
        limiteTotal: Number(item.limite ?? item.limiteTotal ?? 0),
        ativo: Boolean(item.isActive ?? false),
        createdAt: item.dateCreated as string | undefined,
      }),
      mapUniqueItem: (item) => ({
        id: String(item.id ?? ''),
        nome: String(item.nome ?? ''),
        limiteTotal: String(item.limite ?? item.limiteTotal ?? ''),
        observacao: String(item.observacao ?? ''),
        ativo: Boolean(item.isActive ?? false),
      }),
      buildCreatePayload: (form) => ({
        nome: String(form.nome ?? '').trim(),
        observacao: String(form.observacao ?? '').trim() || null,
        limiteTotal: form.limiteTotal === '' ? null : Number(form.limiteTotal),
      }),
      buildUpdatePayload: (id, form) => ({
        id,
        nome: String(form.nome ?? '').trim(),
        observacao: String(form.observacao ?? '').trim() || null,
        limiteTotal: form.limiteTotal === '' ? null : Number(form.limiteTotal),
      }),
    }}
  />
);
export const EsteiraCreditoPage = () => makeBasicoPage('Esteira de Crédito', 'Configuração da esteira de crédito.', '/cadastros/basicos/EsteiraCredito', 'EsteiraCredito');
export const IndicesDebenturePage = () => (
  <PageFrame
    title="Índices Debênture"
    subtitle="Fonte estática local, como no legado."
  >
    <DataTable
      columns={[
        { key: 'codigo', label: 'Código' },
        { key: 'nome', label: 'Índice' },
      ]}
      rows={staticIndiceDebentureRows}
      loading={false}
    />
  </PageFrame>
);
