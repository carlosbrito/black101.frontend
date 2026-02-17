import { CadastroCrudPage } from './CadastroCrudPage';
import type { Column } from '../../shared/ui/DataTable';
import { getErrorMessage, http } from '../../shared/api/http';
import { sanitizeDocument } from './cadastroCommon';
import toast from 'react-hot-toast';

const tiposComCodigo = new Set(['Produto', 'WhiteList', 'BlackList']);

const tiposPessoa = new Set([
  'Consultora',
  'Custodiante',
  'Certificadora',
  'Gestora',
  'Fornecedor',
  'Registradora',
  'Credenciadora',
  'Emitente',
  'PrestadorServico',
  'Investidor',
  'Sacado',
  'Testemunha',
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

  const defaultValues: Record<string, any> = { nome: '', documento: '', ativo: true };
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
      const data = resp.data as Record<string, any>;
      return {
        nome: data.nome ?? '',
        cidade: data.cidade ?? '',
        uf: data.uf ?? '',
        email: data.email ?? '',
        telefone: data.telefone ?? '',
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

export const ConsultorasPage = () => makeBasicoPage('Consultoras', 'Cadastro de consultoras.', '/cadastros/consultoras', 'Consultora');
export const CustodiantePage = () => makeBasicoPage('Custodiantes', 'Cadastro de custodiantes.', '/cadastros/custodiantes', 'Custodiante');
export const CertificadorasPage = () => makeBasicoPage('Certificadoras', 'Cadastro de certificadoras.', '/cadastros/certificadoras', 'Certificadora');
export const GestorasPage = () => makeBasicoPage('Gestoras', 'Cadastro de gestoras.', '/cadastros/gestoras', 'Gestora');
export const FornecedoresPage = () => makeBasicoPage('Fornecedores', 'Cadastro de fornecedores.', '/cadastros/fornecedores', 'Fornecedor');
export const RegistradorasPage = () => makeBasicoPage('Registradoras', 'Cadastro de registradoras.', '/cadastros/registradoras', 'Registradora');
export const CredenciadorasPage = () => makeBasicoPage('Credenciadoras', 'Cadastro de credenciadoras.', '/cadastros/credenciadoras', 'Credenciadora');
export const ProdutosPage = () => makeBasicoPage('Produtos', 'Cadastro de produtos.', '/cadastros/basicos/Produto', 'Produto');
export const EmitentesPage = () => makeBasicoPage('Emitentes', 'Cadastro de emitentes.', '/cadastros/emitentes', 'Emitente');
export const WhiteListPage = () => makeBasicoPage('WhiteList', 'Cadastro de whitelist.', '/cadastros/basicos/WhiteList', 'WhiteList');
export const BlackListPage = () => makeBasicoPage('Blacklist', 'Cadastro de blacklist.', '/cadastros/basicos/BlackList', 'BlackList');
export const PrestadoresPage = () => makeBasicoPage('Prestadores de Serviço', 'Cadastro de prestadores.', '/cadastros/prestadores', 'PrestadorServico');
export const DespesasPage = () => makeBasicoPage('Despesas', 'Cadastro de despesas.', '/cadastros/basicos/Despesa', 'Despesa');
export const GrupoEconomicoPage = () => makeBasicoPage('Grupo Econômico', 'Cadastro de grupos econômicos.', '/cadastros/basicos/GrupoEconomico', 'GrupoEconomico');
export const EsteiraCreditoPage = () => makeBasicoPage('Esteira de Crédito', 'Configuração da esteira de crédito.', '/cadastros/basicos/EsteiraCredito', 'EsteiraCredito');
export const IndicesDebenturePage = () => makeBasicoPage('Índices Debênture', 'Cadastro de índices.', '/cadastros/basicos/IndiceDebenture', 'IndiceDebenture');
export const InvestidoresPage = () => makeBasicoPage('Investidores', 'Cadastro de investidores.', '/cadastros/investidores', 'Investidor');
export const SacadosPage = () => makeBasicoPage('Sacados', 'Cadastro de sacados.', '/cadastros/sacados', 'Sacado');
export const TestemunhasPage = () => makeBasicoPage('Testemunhas', 'Cadastro de testemunhas.', '/cadastros/testemunhas', 'Testemunha');
