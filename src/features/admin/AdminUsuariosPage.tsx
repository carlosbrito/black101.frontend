import { useState } from 'react';
import toast from 'react-hot-toast';
import { getErrorMessage, http } from '../../shared/api/http';
import { PageFrame } from '../../shared/ui/PageFrame';

type UserItem = { id: string; nomeCompleto: string; email: string; ativo: boolean };
type ApiUserItem = {
  id?: string;
  Id?: string;
  nomeCompleto?: string;
  NomeCompleto?: string;
  email?: string;
  Email?: string;
  ativo?: boolean;
  Ativo?: boolean;
};
type UsersResponse = {
  items?: ApiUserItem[];
  Items?: ApiUserItem[];
};

export const AdminUsuariosPage = () => {
  const [rows, setRows] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);

  const list = async () => {
    setLoading(true);
    try {
      const response = await http.get<UsersResponse>('/admin/usuarios', { params: { page: 1, pageSize: 30 } });
      const data = response.data;
      const source = data.items ?? data.Items ?? [];
      setRows(source.map((item) => ({
        id: String(item.id ?? item.Id),
        nomeCompleto: String(item.nomeCompleto ?? item.NomeCompleto ?? ''),
        email: String(item.email ?? item.Email ?? ''),
        ativo: Boolean(item.ativo ?? item.Ativo),
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
