import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getErrorMessage, http } from '../../../shared/api/http';
import type { PagedResponse } from '../../../shared/types/paging';
import { DataTable } from '../../../shared/ui/DataTable';
import type { Column } from '../../../shared/ui/DataTable';
import { PageFrame } from '../../../shared/ui/PageFrame';
import { debentureStatusEmissaoLabel, type DebentureEmissaoListDto } from './types';
import '../../cadastros/cadastro.css';

const columns: Column<DebentureEmissaoListDto>[] = [
  { key: 'numeroEmissao', label: 'Número' },
  { key: 'nomeEmissao', label: 'Emissão' },
  { key: 'dataEmissao', label: 'Data', render: (row) => new Date(row.dataEmissao).toLocaleDateString() },
  { key: 'valorTotal', label: 'Valor Total', render: (row) => row.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
  { key: 'quantidadeTotal', label: 'Quantidade' },
  { key: 'seriesCount', label: 'Séries' },
  { key: 'status', label: 'Status', render: (row) => debentureStatusEmissaoLabel[row.status] ?? '-' },
];

export const DebentureEmissoesPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<DebentureEmissaoListDto[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const list = async () => {
    setLoading(true);
    try {
      const response = await http.get<PagedResponse<DebentureEmissaoListDto>>('/securitizadora/debentures/emissoes', {
        params: { page, pageSize, search: search || undefined, sortBy: 'data', sortDir: 'desc' },
      });
      const data = response.data;
      setRows(data.items ?? []);
      setTotalItems(data.totalItems ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void list();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const deleteRow = async (row: DebentureEmissaoListDto) => {
    if (!window.confirm(`Remover emissão ${row.numeroEmissao}?`)) return;
    try {
      await http.delete(`/securitizadora/debentures/emissoes/${row.id}`);
      toast.success('Emissão removida.');
      await list();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <PageFrame
      title="Emissão de Debêntures"
      subtitle="Cadastro de emissão e séries."
      actions={<button className="btn-main" onClick={() => navigate('/securitizadora/debentures/emissoes/novo')}>Nova Emissão</button>}
    >
      <div className="toolbar">
        <input
          placeholder="Buscar por número ou nome"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              setPage(1);
              void list();
            }
          }}
        />
        <button className="btn-muted" onClick={() => { setPage(1); void list(); }}>Filtrar</button>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        onDetails={(row) => navigate(`/securitizadora/debentures/emissoes/${row.id}`)}
        onEdit={(row) => navigate(`/securitizadora/debentures/emissoes/${row.id}`)}
        onDelete={(row) => void deleteRow(row)}
      />

      <div className="pager">
        <span>{totalItems} registro(s)</span>
        <div>
          <button disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>Anterior</button>
          <span>{page} de {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((x) => x + 1)}>Próxima</button>
        </div>
        <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={30}>30</option>
        </select>
      </div>
    </PageFrame>
  );
};


