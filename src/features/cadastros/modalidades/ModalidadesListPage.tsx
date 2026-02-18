import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getErrorMessage, http } from '../../../shared/api/http';
import { DataTable } from '../../../shared/ui/DataTable';
import type { Column } from '../../../shared/ui/DataTable';
import { PageFrame } from '../../../shared/ui/PageFrame';
import { readPagedResponse } from '../cadastroCommon';
import '../cadastro.css';

type ModalidadeRow = {
  id: string;
  nome: string;
  codigo: string;
  ativo: boolean;
};

const columns: Column<ModalidadeRow>[] = [
  { key: 'nome', label: 'Nome' },
  { key: 'codigo', label: 'Código' },
  {
    key: 'ativo',
    label: 'Status',
    render: (row) => (
      <span style={{ color: row.ativo ? 'var(--ok)' : 'var(--danger)', fontWeight: 700 }}>
        {row.ativo ? 'Ativo' : 'Inativo'}
      </span>
    ),
  },
];

export const ModalidadesPage = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ModalidadeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const response = await http.get('/cadastros/modalidades', {
        params: { page, pageSize, search: search || undefined },
      });
      const paged = readPagedResponse<ModalidadeRow>(response.data);
      setRows(paged.items);
      setTotalItems(paged.totalItems);
      setTotalPages(paged.totalPages);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pagesLabel = useMemo(() => `${page} de ${totalPages}`, [page, totalPages]);

  const removeItem = async (row: ModalidadeRow) => {
    if (!window.confirm(`Excluir modalidade '${row.nome}'?`)) return;
    try {
      await http.delete(`/cadastros/modalidades/${row.id}`);
      toast.success('Modalidade removida.');
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <PageFrame
      title="Cadastro de Modalidades"
      subtitle="CRUD de modalidades para uso na parametrização de empresas."
      actions={<button className="btn-main" onClick={() => navigate('/cadastro/modalidades/novo')}>Nova modalidade</button>}
    >
      <div className="toolbar">
        <input
          placeholder="Buscar por nome ou código"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              setPage(1);
              void load();
            }
          }}
        />
        <button
          className="btn-muted"
          onClick={() => {
            setPage(1);
            void load();
          }}
        >
          Filtrar
        </button>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        onDelete={removeItem}
        onEdit={(row) => navigate(`/cadastro/modalidades/${row.id}`)}
        onDetails={(row) => navigate(`/cadastro/modalidades/${row.id}`)}
      />

      <div className="pager">
        <span>{totalItems} registro(s)</span>
        <div>
          <button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Anterior</button>
          <span>{pagesLabel}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Próxima</button>
        </div>
        <select
          value={pageSize}
          onChange={(event) => {
            setPageSize(Number(event.target.value));
            setPage(1);
          }}
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={30}>30</option>
          <option value={50}>50</option>
        </select>
      </div>
    </PageFrame>
  );
};
