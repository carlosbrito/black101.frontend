import { useState } from 'react';
import toast from 'react-hot-toast';
import { getErrorMessage, http } from '../../shared/api/http';
import { PageFrame } from '../../shared/ui/PageFrame';

export const AdminAuditoriaPage = () => {
  const [items, setItems] = useState<any[]>([]);

  const list = async () => {
    try {
      const response = await http.get('/admin/auditoria', { params: { page: 1, pageSize: 30 } });
      const data = response.data as any;
      setItems(data.items ?? []);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <PageFrame title="Administrativo - Auditoria" subtitle="Consulta paginada dos eventos de auditoria."
      actions={<button className="btn-main" onClick={list}>Buscar eventos</button>}>
      <ul>
        {items.map((item, index) => (
          <li key={item.id ?? index}>
            [{item.createdAt ?? item.CreatedAt}] {item.acao ?? item.Acao} - {item.entidade ?? item.Entidade} (trace: {item.traceId ?? item.TraceId})
          </li>
        ))}
      </ul>
    </PageFrame>
  );
};
