import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getErrorMessage, http } from '../../../shared/api/http';
import { DataTable } from '../../../shared/ui/DataTable';
import type { Column } from '../../../shared/ui/DataTable';
import { PageFrame } from '../../../shared/ui/PageFrame';
import { readPagedResponse } from '../cadastroCommon';
import '../cadastro.css';

type DespesaRow = {
  id: string;
  nome: string;
  segmento: number;
  tipo: number;
  valorBase: number;
  status: number;
};

const segmentLabel = (segmento: number) => {
  switch (segmento) {
    case 1: return 'Recebível';
    case 2: return 'Operação';
    case 3: return 'Sacado';
    default: return '-';
  }
};

const tipoLabel = (tipo: number) => (tipo === 1 ? '%' : 'R$');
const statusLabel = (status: number) => (status === 1 ? 'Ativo' : 'Inativo');

const columns: Column<DespesaRow>[] = [
  { key: 'nome', label: 'Nome' },
  { key: 'segmento', label: 'Cálculo por', render: (row) => segmentLabel(row.segmento) },
  { key: 'tipo', label: 'Tipo', render: (row) => tipoLabel(row.tipo) },
  { key: 'valorBase', label: 'Valor', render: (row) => (row.tipo === 1 ? `${row.valorBase}%` : row.valorBase) },
  {
    key: 'status',
    label: 'Status',
    render: (row) => (
      <span style={{ color: row.status === 1 ? 'var(--ok)' : 'var(--danger)', fontWeight: 700 }}>
        {statusLabel(row.status)}
      </span>
    ),
  },
];

export const DespesasPage = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<DespesaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const response = await http.get('/api/despesa/get/list', {
        params: { page, pageSize, keyword: search || undefined },
      });
      const paged = readPagedResponse<DespesaRow>(response.data);
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

  const removeItem = async (row: DespesaRow) => {
    if (!window.confirm(`Excluir despesa '${row.nome}'?`)) return;
    try {
      await http.delete(`/api/despesa/remove/${row.id}`);
      toast.success('Despesa removida.');
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <PageFrame
      title="Cadastro de Despesas"
      subtitle="Gestão de despesas mestre para uso em cedentes e operações."
      actions={<button className="btn-main" onClick={() => navigate('/cadastro/despesas/novo')}>Nova despesa</button>}
    >
      <div className="toolbar">
        <input
          placeholder="Buscar por nome"
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
        onEdit={(row) => navigate(`/cadastro/despesas/${row.id}`)}
        onDetails={(row) => navigate(`/cadastro/despesas/${row.id}`)}
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
