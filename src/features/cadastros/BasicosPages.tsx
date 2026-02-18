import { CadastroCrudPage } from './CadastroCrudPage';
import type { Column } from '../../shared/ui/DataTable';
import { getErrorMessage, http } from '../../shared/api/http';
import { sanitizeDocument } from './cadastroCommon';
import toast from 'react-hot-toast';
import { BasicoEntityListPage } from './basicos/BasicoEntityListPage';

const tiposComCodigo = new Set(['Produto', 'WhiteList', 'BlackList']);

const tiposPessoa = new Set([
  'Registradora',
  'Credenciadora',
]);

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
    endpoint="/cadastros/consultoras"
    routeBase="/cadastro/consultoras"
    createLabel="Nova consultora"
  />
);

export const CustodiantePage = () => (
  <BasicoEntityListPage
    title="Cadastro de Custodiantes"
    subtitle="Cadastro em tela cheia com abas e auto-cadastro por documento."
    endpoint="/cadastros/custodiantes"
    routeBase="/cadastro/custodiantes"
    createLabel="Novo custodiante"
  />
);

export const GestorasPage = () => (
  <BasicoEntityListPage
    title="Cadastro de Gestoras"
    subtitle="Cadastro em tela cheia com abas e auto-cadastro por documento."
    endpoint="/cadastros/gestoras"
    routeBase="/cadastro/gestoras"
    createLabel="Nova gestora"
  />
);

export const FornecedoresPage = () => (
  <BasicoEntityListPage
    title="Cadastro de Fornecedores"
    subtitle="Cadastro em tela cheia com abas e auto-cadastro por documento."
    endpoint="/cadastros/fornecedores"
    routeBase="/cadastro/fornecedores"
    createLabel="Novo fornecedor"
  />
);

export const EmitentesPage = () => (
  <BasicoEntityListPage
    title="Cadastro de Emitentes"
    subtitle="Cadastro em tela cheia com abas e auto-cadastro por documento."
    endpoint="/cadastros/emitentes"
    routeBase="/cadastro/emitentes"
    createLabel="Novo emitente"
  />
);

export const EmpresasPage = () => (
  <BasicoEntityListPage
    title="Cadastro de Empresas"
    subtitle="Cadastro em tela cheia com abas e auto-cadastro por documento."
    endpoint="/cadastros/empresas"
    routeBase="/cadastro/empresas"
    createLabel="Nova empresa"
  />
);

export const PrestadoresPage = () => (
  <BasicoEntityListPage
    title="Cadastro de Prestadores de Serviço"
    subtitle="Cadastro em tela cheia com abas e auto-cadastro por documento."
    endpoint="/cadastros/prestadores"
    routeBase="/cadastro/prestadores"
    createLabel="Novo prestador"
  />
);

export const InvestidoresPage = () => (
  <BasicoEntityListPage
    title="Cadastro de Investidores"
    subtitle="Cadastro em tela cheia com abas e auto-cadastro por documento."
    endpoint="/cadastros/investidores"
    routeBase="/cadastro/investidores"
    createLabel="Novo investidor"
  />
);

export const CertificadorasPage = () => makeBasicoPage('Certificadoras', 'Cadastro de certificadoras.', '/cadastros/certificadoras', 'Certificadora');
export const RegistradorasPage = () => makeBasicoPage('Registradoras', 'Cadastro de registradoras.', '/cadastros/registradoras', 'Registradora');
export const CredenciadorasPage = () => makeBasicoPage('Credenciadoras', 'Cadastro de credenciadoras.', '/cadastros/credenciadoras', 'Credenciadora');
export const ProdutosPage = () => makeBasicoPage('Produtos', 'Cadastro de produtos.', '/cadastros/basicos/Produto', 'Produto');
export const WhiteListPage = () => makeBasicoPage('WhiteList', 'Cadastro de whitelist.', '/cadastros/basicos/WhiteList', 'WhiteList');
export const BlackListPage = () => makeBasicoPage('Blacklist', 'Cadastro de blacklist.', '/cadastros/basicos/BlackList', 'BlackList');
export const DespesasPage = () => makeBasicoPage('Despesas', 'Cadastro de despesas.', '/cadastros/basicos/Despesa', 'Despesa');
export const GrupoEconomicoPage = () => makeBasicoPage('Grupo Econômico', 'Cadastro de grupos econômicos.', '/cadastros/basicos/GrupoEconomico', 'GrupoEconomico');
export const EsteiraCreditoPage = () => makeBasicoPage('Esteira de Crédito', 'Configuração da esteira de crédito.', '/cadastros/basicos/EsteiraCredito', 'EsteiraCredito');
export const IndicesDebenturePage = () => makeBasicoPage('Índices Debênture', 'Cadastro de índices.', '/cadastros/basicos/IndiceDebenture', 'IndiceDebenture');
