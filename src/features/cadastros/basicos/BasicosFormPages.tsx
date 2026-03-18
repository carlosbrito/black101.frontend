import { BasicoEntityFormPage } from './BasicoEntityFormPage';
import { basicoEntityApis } from './entityApi';

export const ConsultoraFormPage = () => (
  <BasicoEntityFormPage
    title="Consultora"
    api={basicoEntityApis.consultora}
    listRoute="/cadastro/consultoras"
    singularLabel="Consultora"
  />
);

export const CustodianteFormPage = () => (
  <BasicoEntityFormPage
    title="Custodiante"
    api={basicoEntityApis.custodiante}
    listRoute="/cadastro/custodiantes"
    singularLabel="Custodiante"
  />
);

export const GestoraFormPage = () => (
  <BasicoEntityFormPage
    title="Gestora"
    api={basicoEntityApis.gestora}
    listRoute="/cadastro/gestoras"
    singularLabel="Gestora"
  />
);

export const FornecedorFormPage = () => (
  <BasicoEntityFormPage
    title="Fornecedor"
    api={basicoEntityApis.fornecedor}
    listRoute="/cadastro/fornecedores"
    singularLabel="Fornecedor"
  />
);

export const EmitenteFormPage = () => (
  <BasicoEntityFormPage
    title="Emitente"
    api={basicoEntityApis.emitente}
    listRoute="/cadastro/emitentes"
    singularLabel="Emitente"
  />
);

export const PrestadorFormPage = () => (
  <BasicoEntityFormPage
    title="Prestador de Serviço"
    api={basicoEntityApis.prestador}
    listRoute="/cadastro/prestadores"
    singularLabel="Prestador de Serviço"
  />
);

export const InvestidorFormPage = () => (
  <BasicoEntityFormPage
    title="Investidor"
    api={basicoEntityApis.investidor}
    listRoute="/cadastro/investidores"
    singularLabel="Investidor"
  />
);
