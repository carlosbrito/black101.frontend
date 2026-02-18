import { useState } from 'react';
import toast from 'react-hot-toast';
import { getErrorMessage, http } from '../../shared/api/http';
import { PageFrame } from '../../shared/ui/PageFrame';

type AuditItem = {
  id?: string;
  Id?: string;
  createdAt?: string;
  CreatedAt?: string;
  acao?: string;
  Acao?: string;
  entidade?: string;
  Entidade?: string;
  traceId?: string;
  TraceId?: string;
};

type AuditListResponse = {
  items?: AuditItem[];
  Items?: AuditItem[];
};

export const AdminAuditoriaPage = () => {
  const [items, setItems] = useState<AuditItem[]>([]);

  const list = async () => {
    try {
      const response = await http.get<AuditListResponse>('/admin/auditoria', { params: { page: 1, pageSize: 30 } });
      const data = response.data;
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
