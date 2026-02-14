import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getErrorMessage, http } from '../../shared/api/http';
import { PageFrame } from '../../shared/ui/PageFrame';

type RoleItem = { id: string; nome: string };

export const AdminRolesPage = () => {
  const [roles, setRoles] = useState<RoleItem[]>([]);

  const list = async () => {
    try {
      const response = await http.get<RoleItem[]>('/admin/roles');
      setRoles((response.data as any[]).map((x) => ({ id: String(x.id ?? x.Id), nome: x.nome ?? x.Nome })));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const create = async () => {
    const nome = window.prompt('Nome do perfil (ex.: OPERADOR)');
    if (!nome) return;

    try {
      await http.post('/admin/roles', { nome });
      toast.success('Perfil criado.');
      await list();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  useEffect(() => {
    void list();
  }, []);

  return (
    <PageFrame title="Administrativo - Grupos/Perfis" subtitle="CRUD básico de perfis e claims."
      actions={<button className="btn-main" onClick={create}>Novo perfil</button>}>
      <ul>
        {roles.map((role) => <li key={role.id}>{role.nome}</li>)}
      </ul>
    </PageFrame>
  );
};
