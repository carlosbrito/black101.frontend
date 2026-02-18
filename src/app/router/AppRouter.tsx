import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import { SecuritizadoraRoute } from '../auth/SecuritizadoraRoute';
import { MainLayout } from '../layout/MainLayout';
import { LoginPage } from '../../features/login/LoginPage';
import { HomePage } from '../../features/shared/HomePage';
import { EmConstrucaoPage } from '../../features/shared/EmConstrucaoPage';
import {
  AdministradorasPage,
  AgentesPage,
  BancosPage,
  CedentesPage,
  RepresentantesPage,
  BancarizadoresPage,
  ConsultorasPage,
  CustodiantePage,
  CertificadorasPage,
  GestorasPage,
  FornecedoresPage,
  RegistradorasPage,
  CredenciadorasPage,
  ProdutosPage,
  EmitentesPage,
  EmpresasPage,
  WhiteListPage,
  BlackListPage,
  PrestadoresPage,
  DespesasPage,
  GrupoEconomicoPage,
  EsteiraCreditoPage,
  IndicesDebenturePage,
  InvestidoresPage,
  SacadosPage,
  TestemunhasPage,
  ModalidadesPage,
} from '../../features/cadastros/CadastroPages';
import { MovimentacoesPage } from '../../features/financeiro/MovimentacoesPage';
import { OperacoesPage } from '../../features/operacoes/OperationsPage';
import { ImportacoesPage } from '../../features/operacoes/ImportacoesPage';
import { WorkersPage } from '../../features/operacoes/WorkersPage';
import { AdministradoraFormPage } from '../../features/cadastros/administradoras/AdministradoraFormPage';
import { AgenteFormPage } from '../../features/cadastros/agentes/AgenteFormPage';
import { BancoFormPage } from '../../features/cadastros/bancos/BancoFormPage';
import { CedenteFormPage } from '../../features/cadastros/cedentes/CedenteFormPage';
import { RepresentanteFormPage } from '../../features/cadastros/representantes/RepresentanteFormPage';
import { SacadoFormPage } from '../../features/cadastros/sacados/SacadoFormPage';
import { BancarizadorFormPage } from '../../features/cadastros/bancarizadores/BancarizadorFormPage';
import { TestemunhaFormPage } from '../../features/cadastros/testemunhas/TestemunhaFormPage';
import { ModalidadeFormPage } from '../../features/cadastros/modalidades/ModalidadeFormPage';
import { EmpresaFormPage } from '../../features/cadastros/empresas/EmpresaFormPage';
import {
  ConsultoraFormPage,
  CustodianteFormPage,
  GestoraFormPage,
  FornecedorFormPage,
  EmitenteFormPage,
  PrestadorFormPage,
  InvestidorFormPage,
} from '../../features/cadastros/basicos/BasicosFormPages';
import { AdminUsuariosPage } from '../../features/admin/AdminUsuariosPage';
import { AdminRolesPage } from '../../features/admin/AdminRolesPage';
import { AdminAuditoriaPage } from '../../features/admin/AdminAuditoriaPage';
import { AdminTemplatesListPage } from '../../features/admin/templates/AdminTemplatesListPage';
import { AdminTemplateFormPage } from '../../features/admin/templates/AdminTemplateFormPage';
import { DebentureEmissoesPage } from '../../features/securitizadora/debentures/DebentureEmissoesPage';
import { DebentureEmissaoFormPage } from '../../features/securitizadora/debentures/DebentureEmissaoFormPage';
import { DebentureVendasPage } from '../../features/securitizadora/debentures/DebentureVendasPage';
import { DebentureVendaFormPage } from '../../features/securitizadora/debentures/DebentureVendaFormPage';
import { DebentureResgatesPage } from '../../features/securitizadora/debentures/DebentureResgatesPage';
import { DebentureResgateFormPage } from '../../features/securitizadora/debentures/DebentureResgateFormPage';
import { DebentureRendimentosPage } from '../../features/securitizadora/debentures/DebentureRendimentosPage';
import { DebentureRelatorioPage } from '../../features/securitizadora/debentures/DebentureRelatorioPage';
import { DebentureContabilidadePage } from '../../features/securitizadora/debentures/DebentureContabilidadePage';
import { DebentureDespesasDetalhadasPage } from '../../features/securitizadora/debentures/DebentureDespesasDetalhadasPage';

export const AppRouter = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />

          <Route path="/cadastro/administradoras" element={<AdministradorasPage />} />
          <Route path="/cadastro/administradoras/novo" element={<AdministradoraFormPage />} />
          <Route path="/cadastro/administradoras/:id" element={<AdministradoraFormPage />} />

          <Route path="/cadastro/representantes" element={<RepresentantesPage />} />
          <Route path="/cadastro/representantes/novo" element={<RepresentanteFormPage />} />
          <Route path="/cadastro/representantes/:id" element={<RepresentanteFormPage />} />

          <Route path="/cadastro/agentes" element={<AgentesPage />} />
          <Route path="/cadastro/agentes/novo" element={<AgenteFormPage />} />
          <Route path="/cadastro/agentes/:id" element={<AgenteFormPage />} />

          <Route path="/cadastro/bancarizadores" element={<BancarizadoresPage />} />
          <Route path="/cadastro/bancarizadores/novo" element={<BancarizadorFormPage />} />
          <Route path="/cadastro/bancarizadores/:id" element={<BancarizadorFormPage />} />

          <Route path="/cadastro/bancos" element={<BancosPage />} />
          <Route path="/cadastro/bancos/novo" element={<BancoFormPage />} />
          <Route path="/cadastro/bancos/:id" element={<BancoFormPage />} />

          <Route path="/cadastro/cedentes" element={<CedentesPage />} />
          <Route path="/cadastro/cedentes/novo" element={<CedenteFormPage />} />
          <Route path="/cadastro/cedentes/:id" element={<CedenteFormPage />} />
          <Route path="/cadastro/sacados/novo" element={<SacadoFormPage />} />
          <Route path="/cadastro/sacados/:id" element={<SacadoFormPage />} />
          <Route path="/cadastro/consultoras" element={<ConsultorasPage />} />
          <Route path="/cadastro/consultoras/novo" element={<ConsultoraFormPage />} />
          <Route path="/cadastro/consultoras/:id" element={<ConsultoraFormPage />} />
          <Route path="/cadastro/custodiantes" element={<CustodiantePage />} />
          <Route path="/cadastro/custodiantes/novo" element={<CustodianteFormPage />} />
          <Route path="/cadastro/custodiantes/:id" element={<CustodianteFormPage />} />
          <Route path="/cadastro/certificadoras" element={<CertificadorasPage />} />
          <Route path="/cadastro/gestoras" element={<GestorasPage />} />
          <Route path="/cadastro/gestoras/novo" element={<GestoraFormPage />} />
          <Route path="/cadastro/gestoras/:id" element={<GestoraFormPage />} />
          <Route path="/cadastro/fornecedores" element={<FornecedoresPage />} />
          <Route path="/cadastro/fornecedores/novo" element={<FornecedorFormPage />} />
          <Route path="/cadastro/fornecedores/:id" element={<FornecedorFormPage />} />
          <Route path="/cadastro/registradoras" element={<RegistradorasPage />} />
          <Route path="/cadastro/credenciadoras" element={<CredenciadorasPage />} />
          <Route path="/cadastro/produtos" element={<ProdutosPage />} />
          <Route path="/cadastro/emitentes" element={<EmitentesPage />} />
          <Route path="/cadastro/emitentes/novo" element={<EmitenteFormPage />} />
          <Route path="/cadastro/emitentes/:id" element={<EmitenteFormPage />} />
          <Route path="/cadastro/empresas" element={<EmpresasPage />} />
          <Route path="/cadastro/empresas/novo" element={<EmpresaFormPage />} />
          <Route path="/cadastro/empresas/:id" element={<EmpresaFormPage />} />
          <Route path="/cadastro/modalidades" element={<ModalidadesPage />} />
          <Route path="/cadastro/modalidades/novo" element={<ModalidadeFormPage />} />
          <Route path="/cadastro/modalidades/:id" element={<ModalidadeFormPage />} />
          <Route path="/cadastro/whitelist" element={<WhiteListPage />} />
          <Route path="/cadastro/blacklist" element={<BlackListPage />} />
          <Route path="/cadastro/prestadores" element={<PrestadoresPage />} />
          <Route path="/cadastro/prestadores/novo" element={<PrestadorFormPage />} />
          <Route path="/cadastro/prestadores/:id" element={<PrestadorFormPage />} />
          <Route path="/cadastro/despesas" element={<DespesasPage />} />
          <Route path="/cadastro/grupo-economico" element={<GrupoEconomicoPage />} />
          <Route path="/cadastro/esteira-credito" element={<EsteiraCreditoPage />} />
          <Route path="/cadastro/indices-debentures" element={<IndicesDebenturePage />} />
          <Route path="/cadastro/investidores" element={<InvestidoresPage />} />
          <Route path="/cadastro/investidores/novo" element={<InvestidorFormPage />} />
          <Route path="/cadastro/investidores/:id" element={<InvestidorFormPage />} />
          <Route path="/cadastro/sacados" element={<SacadosPage />} />
          <Route path="/cadastro/testemunhas" element={<TestemunhasPage />} />
          <Route path="/cadastro/testemunhas/novo" element={<TestemunhaFormPage />} />
          <Route path="/cadastro/testemunhas/:id" element={<TestemunhaFormPage />} />
          <Route path="/financeiro/movimentacoes" element={<MovimentacoesPage />} />
          <Route path="/operacoes" element={<OperacoesPage />} />
          <Route path="/operacoes/importacoes" element={<ImportacoesPage />} />
          <Route path="/operacoes/workers" element={<WorkersPage />} />

          <Route path="/admin/usuarios" element={<AdminUsuariosPage />} />
          <Route path="/admin/roles" element={<AdminRolesPage />} />
          <Route path="/admin/auditoria" element={<AdminAuditoriaPage />} />
          <Route path="/admin/templates" element={<AdminTemplatesListPage />} />
          <Route path="/admin/templates/novo" element={<AdminTemplateFormPage />} />
          <Route path="/admin/templates/:id" element={<AdminTemplateFormPage />} />
          <Route element={<SecuritizadoraRoute />}>
            <Route path="/securitizadora/debentures/emissoes" element={<DebentureEmissoesPage />} />
            <Route path="/securitizadora/debentures/emissoes/novo" element={<DebentureEmissaoFormPage />} />
            <Route path="/securitizadora/debentures/emissoes/:id" element={<DebentureEmissaoFormPage />} />
            <Route path="/securitizadora/debentures/vendas" element={<DebentureVendasPage />} />
            <Route path="/securitizadora/debentures/vendas/novo" element={<DebentureVendaFormPage />} />
            <Route path="/securitizadora/debentures/vendas/:id" element={<DebentureVendaFormPage />} />
            <Route path="/securitizadora/debentures/resgates" element={<DebentureResgatesPage />} />
            <Route path="/securitizadora/debentures/resgates/novo" element={<DebentureResgateFormPage />} />
            <Route path="/securitizadora/debentures/resgates/:id" element={<DebentureResgateFormPage />} />
            <Route path="/securitizadora/debentures/rendimentos" element={<DebentureRendimentosPage />} />
            <Route path="/securitizadora/debentures/relatorios/:tipo" element={<DebentureRelatorioPage />} />
            <Route path="/securitizadora/contabilidade/despesas-detalhadas" element={<DebentureDespesasDetalhadasPage />} />
            <Route path="/securitizadora/contabilidade/importacao/:sistema" element={<DebentureContabilidadePage />} />
          </Route>
          <Route path="/construcao/*" element={<EmConstrucaoPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
