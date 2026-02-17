import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import { MainLayout } from '../layout/MainLayout';
import { LoginPage } from '../../features/login/LoginPage';
import { HomePage } from '../../features/shared/HomePage';
import { EmConstrucaoPage } from '../../features/shared/EmConstrucaoPage';
import { AdministradorasPage, AgentesPage, BancosPage, CedentesPage, RepresentantesPage, BancarizadoresPage } from '../../features/cadastros/CadastroPages';
import { AdministradoraFormPage } from '../../features/cadastros/administradoras/AdministradoraFormPage';
import { AgenteFormPage } from '../../features/cadastros/agentes/AgenteFormPage';
import { BancoFormPage } from '../../features/cadastros/bancos/BancoFormPage';
import { CedenteFormPage } from '../../features/cadastros/cedentes/CedenteFormPage';
import { RepresentanteFormPage } from '../../features/cadastros/representantes/RepresentanteFormPage';
import { AdminUsuariosPage } from '../../features/admin/AdminUsuariosPage';
import { AdminRolesPage } from '../../features/admin/AdminRolesPage';
import { AdminAuditoriaPage } from '../../features/admin/AdminAuditoriaPage';

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

          <Route path="/cadastro/bancos" element={<BancosPage />} />
          <Route path="/cadastro/bancos/novo" element={<BancoFormPage />} />
          <Route path="/cadastro/bancos/:id" element={<BancoFormPage />} />

          <Route path="/cadastro/cedentes" element={<CedentesPage />} />
          <Route path="/cadastro/cedentes/novo" element={<CedenteFormPage />} />
          <Route path="/cadastro/cedentes/:id" element={<CedenteFormPage />} />

          <Route path="/admin/usuarios" element={<AdminUsuariosPage />} />
          <Route path="/admin/roles" element={<AdminRolesPage />} />
          <Route path="/admin/auditoria" element={<AdminAuditoriaPage />} />
          <Route path="/construcao/*" element={<EmConstrucaoPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
