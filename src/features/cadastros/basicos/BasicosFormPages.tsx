import { BasicoEntityFormPage } from './BasicoEntityFormPage';

export const ConsultoraFormPage = () => (
  <BasicoEntityFormPage
    title="Consultora"
    endpoint="/cadastros/consultoras"
    listRoute="/cadastro/consultoras"
    singularLabel="Consultora"
  />
);

export const CustodianteFormPage = () => (
  <BasicoEntityFormPage
    title="Custodiante"
    endpoint="/cadastros/custodiantes"
    listRoute="/cadastro/custodiantes"
    singularLabel="Custodiante"
  />
);

export const GestoraFormPage = () => (
  <BasicoEntityFormPage
    title="Gestora"
    endpoint="/cadastros/gestoras"
    listRoute="/cadastro/gestoras"
    singularLabel="Gestora"
  />
);

export const FornecedorFormPage = () => (
  <BasicoEntityFormPage
    title="Fornecedor"
    endpoint="/cadastros/fornecedores"
    listRoute="/cadastro/fornecedores"
    singularLabel="Fornecedor"
  />
);

export const EmitenteFormPage = () => (
  <BasicoEntityFormPage
    title="Emitente"
    endpoint="/cadastros/emitentes"
    listRoute="/cadastro/emitentes"
    singularLabel="Emitente"
  />
);

export const EmpresaFormPage = () => (
  <BasicoEntityFormPage
    title="Empresa"
    endpoint="/cadastros/empresas"
    listRoute="/cadastro/empresas"
    singularLabel="Empresa"
  />
);

export const PrestadorFormPage = () => (
  <BasicoEntityFormPage
    title="Prestador de Serviço"
    endpoint="/cadastros/prestadores"
    listRoute="/cadastro/prestadores"
    singularLabel="Prestador de Serviço"
  />
);

export const InvestidorFormPage = () => (
  <BasicoEntityFormPage
    title="Investidor"
    endpoint="/cadastros/investidores"
    listRoute="/cadastro/investidores"
    singularLabel="Investidor"
  />
);
