import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getErrorMessage, http } from '../../../shared/api/http';
import { DataTable } from '../../../shared/ui/DataTable';
import type { Column } from '../../../shared/ui/DataTable';
import { PageFrame } from '../../../shared/ui/PageFrame';
import { formatCpfCnpj, readPagedResponse } from '../cadastroCommon';
import '../cadastro.css';

type CedenteRow = {
  id: string;
  pessoaId: string;
  nome: string;
  cnpjCpf: string;
  status: string;
  cidade?: string | null;
  uf?: string | null;
  ativo: boolean;
};

const columns: Column<CedenteRow>[] = [
  { key: 'nome', label: 'Nome' },
  { key: 'cnpjCpf', label: 'CPF/CNPJ', render: (row) => formatCpfCnpj(row.cnpjCpf) },
  { key: 'status', label: 'Status' },
  { key: 'cidade', label: 'Cidade' },
  { key: 'uf', label: 'UF' },
  {
    key: 'ativo',
    label: 'Situação',
    render: (row) => (
      <span style={{ color: row.ativo ? 'var(--ok)' : 'var(--danger)', fontWeight: 700 }}>
        {row.ativo ? 'Ativo' : 'Inativo'}
      </span>
    ),
  },
];

export const CedentesPage = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<CedenteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const load = async () => {
    setLoading(true);

    try {
      const response = await http.get('/cadastros/cedentes', {
        params: {
          page,
          pageSize,
          search: search || undefined,
        },
      });

      const paged = readPagedResponse<CedenteRow>(response.data);
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
  }, [page, pageSize]);

  const pagesLabel = useMemo(() => `${page} de ${totalPages}`, [page, totalPages]);

  const removeCedente = async (row: CedenteRow) => {
    if (!window.confirm(`Excluir cedente '${row.nome}'?`)) {
      return;
    }

    try {
      await http.delete(`/cadastros/cedentes/${row.id}`);
      toast.success('Cedente removido.');
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <PageFrame
      title="Cadastro de Cedentes"
      subtitle="Módulo completo com abas equivalentes ao legado."
      actions={<button className="btn-main" onClick={() => navigate('/cadastro/cedentes/novo')}>Novo cedente</button>}
    >
      <div className="toolbar">
        <input
          placeholder="Buscar por nome, CPF/CNPJ, e-mail"
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
        onDelete={removeCedente}
        onEdit={(row) => navigate(`/cadastro/cedentes/${row.id}`)}
        onDetails={(row) => navigate(`/cadastro/cedentes/${row.id}`)}
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
