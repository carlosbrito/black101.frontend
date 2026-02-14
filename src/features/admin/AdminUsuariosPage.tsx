import { useState } from 'react';
import toast from 'react-hot-toast';
import { getErrorMessage, http } from '../../shared/api/http';
import type { PagedResponse } from '../../shared/types/paging';
import { PageFrame } from '../../shared/ui/PageFrame';

type UserItem = { id: string; nomeCompleto: string; email: string; ativo: boolean };

export const AdminUsuariosPage = () => {
  const [rows, setRows] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);

  const list = async () => {
    setLoading(true);
    try {
      const response = await http.get<PagedResponse<UserItem>>('/admin/usuarios', { params: { page: 1, pageSize: 30 } });
      const data = response.data as any;
      setRows((data.items ?? []).map((x: any) => ({
        id: String(x.id ?? x.Id),
        nomeCompleto: x.nomeCompleto ?? x.NomeCompleto,
        email: x.email ?? x.Email,
        ativo: x.ativo ?? x.Ativo,
      })));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const createDemo = async () => {
    try {
      await http.post('/admin/usuarios', {
        nomeCompleto: 'Usuário Teste',
        email: `teste${Date.now()}@black101.local`,
        password: 'Master@5859',
      });
      toast.success('Usuário criado.');
      await list();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <PageFrame
      title="Administrativo - Usuários"
      subtitle="Base mínima de gestão de usuários com roles/claims."
      actions={<button className="btn-main" onClick={createDemo}>Criar usuário teste</button>}
    >
      <button className="btn-muted" onClick={list}>Atualizar</button>
      {loading ? <p>Carregando...</p> : (
        <ul>
          {rows.map((row) => (
            <li key={row.id}>{row.nomeCompleto} ({row.email}) - {row.ativo ? 'Ativo' : 'Inativo'}</li>
          ))}
        </ul>
      )}
    </PageFrame>
  );
};
