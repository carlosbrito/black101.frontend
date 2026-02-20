import { useState } from 'react';
import toast from 'react-hot-toast';
import { getErrorMessage, http } from '../../shared/api/http';
import { PageFrame } from '../../shared/ui/PageFrame';
import { readPagedResponse } from '../cadastros/cadastroCommon';

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
export const AdminUsuariosPage = () => {
  const [rows, setRows] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);

  const list = async () => {
    setLoading(true);
    try {
      const response = await http.get('/api/user/get/list', { params: { page: 1, pageSize: 30 } });
      const paged = readPagedResponse<ApiUserItem>(response.data);
      const source = paged.items;
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
    const pessoaId = window.prompt('Informe o PessoaId (GUID) para o novo usuário');
    if (!pessoaId) return;
    const email = window.prompt('Informe o e-mail do usuário');
    if (!email) return;

    try {
      await http.post('/api/user/register', {
        pessoaId,
        email,
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
