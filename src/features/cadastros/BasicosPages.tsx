import { CadastroCrudPage } from './CadastroCrudPage';
import type { Column } from '../../shared/ui/DataTable';

const makeBasicoPage = (title: string, subtitle: string, endpoint: string) => {
  const columns: Column<Record<string, unknown>>[] = [
    { header: 'Nome', accessor: 'nome' },
    { header: 'Código', accessor: 'codigo' },
    { header: 'Documento', accessor: 'documento' },
    { header: 'Ativo', accessor: 'ativo', type: 'boolean' },
    { header: 'Cadastro', accessor: 'createdAt', type: 'datetime' },
  ];

  const fields = [
    { name: 'nome', label: 'Nome' },
    { name: 'codigo', label: 'Código', required: false },
    { name: 'documento', label: 'CPF/CNPJ', mask: 'cpfCnpj', required: false },
  ];

  const defaultValues = { nome: '', codigo: '', documento: '', ativo: true };

  return (
    <CadastroCrudPage
      title={title}
      subtitle={subtitle}
      endpoint={endpoint}
      columns={columns as Column<Record<string, unknown>>[]}
      fields={fields}
      defaultValues={defaultValues}
    />
  );
};

export const ConsultorasPage = () => makeBasicoPage('Consultoras', 'Cadastro de consultoras.', '/cadastros/basicos/Consultora');
export const CustodiantePage = () => makeBasicoPage('Custodiantes', 'Cadastro de custodiantes.', '/cadastros/basicos/Custodiante');
export const CertificadorasPage = () => makeBasicoPage('Certificadoras', 'Cadastro de certificadoras.', '/cadastros/basicos/Certificadora');
export const GestorasPage = () => makeBasicoPage('Gestoras', 'Cadastro de gestoras.', '/cadastros/basicos/Gestora');
export const FornecedoresPage = () => makeBasicoPage('Fornecedores', 'Cadastro de fornecedores.', '/cadastros/basicos/Fornecedor');
export const RegistradorasPage = () => makeBasicoPage('Registradoras', 'Cadastro de registradoras.', '/cadastros/basicos/Registradora');
export const CredenciadorasPage = () => makeBasicoPage('Credenciadoras', 'Cadastro de credenciadoras.', '/cadastros/basicos/Credenciadora');
export const ProdutosPage = () => makeBasicoPage('Produtos', 'Cadastro de produtos.', '/cadastros/basicos/Produto');
export const EmitentesPage = () => makeBasicoPage('Emitentes', 'Cadastro de emitentes.', '/cadastros/basicos/Emitente');
export const WhiteListPage = () => makeBasicoPage('WhiteList', 'Cadastro de whitelist.', '/cadastros/basicos/WhiteList');
export const BlackListPage = () => makeBasicoPage('Blacklist', 'Cadastro de blacklist.', '/cadastros/basicos/BlackList');
export const PrestadoresPage = () => makeBasicoPage('Prestadores de Serviço', 'Cadastro de prestadores.', '/cadastros/basicos/PrestadorServico');
export const DespesasPage = () => makeBasicoPage('Despesas', 'Cadastro de despesas.', '/cadastros/basicos/Despesa');
export const GrupoEconomicoPage = () => makeBasicoPage('Grupo Econômico', 'Cadastro de grupos econômicos.', '/cadastros/basicos/GrupoEconomico');
export const EsteiraCreditoPage = () => makeBasicoPage('Esteira de Crédito', 'Configuração da esteira de crédito.', '/cadastros/basicos/EsteiraCredito');
export const IndicesDebenturePage = () => makeBasicoPage('Índices Debênture', 'Cadastro de índices.', '/cadastros/basicos/IndiceDebenture');
export const InvestidoresPage = () => makeBasicoPage('Investidores', 'Cadastro de investidores.', '/cadastros/basicos/Investidor');
export const SacadosPage = () => makeBasicoPage('Sacados', 'Cadastro de sacados.', '/cadastros/basicos/Sacado');
export const TestemunhasPage = () => makeBasicoPage('Testemunhas', 'Cadastro de testemunhas.', '/cadastros/basicos/Testemunha');
