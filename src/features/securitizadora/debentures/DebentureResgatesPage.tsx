import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getErrorMessage, http } from '../../../shared/api/http';
import type { PagedResponse } from '../../../shared/types/paging';
import { DataTable } from '../../../shared/ui/DataTable';
import type { Column } from '../../../shared/ui/DataTable';
import { PageFrame } from '../../../shared/ui/PageFrame';
import { debentureModoResgateLabel, debentureStatusResgateLabel, debentureTipoResgateLabel, type DebentureResgateDto } from './types';
import '../../cadastros/cadastro.css';

const columns: Column<DebentureResgateDto>[] = [
  { key: 'debentureVendaId', label: 'Venda', render: (row) => row.debentureVendaId.slice(0, 8).toUpperCase() },
  { key: 'modoResgate', label: 'Modo', render: (row) => debentureModoResgateLabel[row.modoResgate] ?? '-' },
  { key: 'tipoResgate', label: 'Tipo', render: (row) => debentureTipoResgateLabel[row.tipoResgate] ?? '-' },
  { key: 'quantidadeResgatada', label: 'Qtde' },
  { key: 'valorResgateMonetario', label: 'Valor Resgate', render: (row) => row.valorResgateMonetario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
  { key: 'valorRendimento', label: 'Rendimento', render: (row) => row.valorRendimento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
  { key: 'valorIof', label: 'IOF', render: (row) => row.valorIof.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
  { key: 'dataSolicitacao', label: 'Data', render: (row) => new Date(row.dataSolicitacao).toLocaleDateString() },
  { key: 'status', label: 'Status', render: (row) => debentureStatusResgateLabel[row.status] ?? '-' },
];

export const DebentureResgatesPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<DebentureResgateDto[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const list = async () => {
    setLoading(true);
    try {
      const response = await http.get<PagedResponse<DebentureResgateDto>>('/securitizadora/debentures/resgates', {
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

  const deleteRow = async (row: DebentureResgateDto) => {
    if (!window.confirm('Remover resgate selecionado?')) return;
    try {
      await http.delete(`/securitizadora/debentures/resgates/${row.id}`);
      toast.success('Resgate removido.');
      await list();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <PageFrame
      title="Resgate de Debêntures"
      subtitle="Controle de resgates unitários e monetários."
      actions={<button className="btn-main" onClick={() => navigate('/securitizadora/debentures/resgates/novo')}>Novo Resgate</button>}
    >
      <div className="toolbar">
        <input
          placeholder="Buscar por comprovante ou observações"
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
        onDetails={(row) => navigate(`/securitizadora/debentures/resgates/${row.id}`)}
        onEdit={(row) => navigate(`/securitizadora/debentures/resgates/${row.id}`)}
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


