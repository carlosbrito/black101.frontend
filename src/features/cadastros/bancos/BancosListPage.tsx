import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getErrorMessage, http } from '../../../shared/api/http';
import { DataTable } from '../../../shared/ui/DataTable';
import type { Column } from '../../../shared/ui/DataTable';
import { PageFrame } from '../../../shared/ui/PageFrame';
import { readPagedResponse } from '../cadastroCommon';
import '../cadastro.css';

type BancoRow = {
  id: string;
  nome: string;
  codigo: string;
  ativo: boolean;
};

const columns: Column<BancoRow>[] = [
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

export const BancosPage = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<BancoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const load = async () => {
    setLoading(true);

    try {
      const response = await http.get('/api/banco/get/list', {
        params: {
          page,
          pageSize,
          keyword: search || undefined,
        },
      });

      const paged = readPagedResponse<BancoRow>(response.data);
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

  const removeBanco = async (row: BancoRow) => {
    if (!window.confirm(`Excluir banco '${row.nome}'?`)) {
      return;
    }

    try {
      await http.delete(`/api/banco/remove/${row.id}`);
      toast.success('Banco removido.');
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <PageFrame
      title="Cadastro de Bancos"
      subtitle="Cadastro em tela cheia com abas no padrão do legado."
      actions={<button className="btn-main" onClick={() => navigate('/cadastro/bancos/novo')}>Novo banco</button>}
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
        onDelete={removeBanco}
        onEdit={(row) => navigate(`/cadastro/bancos/${row.id}`)}
        onDetails={(row) => navigate(`/cadastro/bancos/${row.id}`)}
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
        </select>
      </div>
    </PageFrame>
  );
};


