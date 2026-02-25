import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getErrorMessage, http } from '../../../shared/api/http';
import type { PagedResponse } from '../../../shared/types/paging';
import { DataTable } from '../../../shared/ui/DataTable';
import type { Column } from '../../../shared/ui/DataTable';
import { PageFrame } from '../../../shared/ui/PageFrame';
import { debentureStatusVendaLabel, type DebentureVendaDto } from './types';
import '../../cadastros/cadastro.css';

const formatCurrency = (value?: number | null) =>
  Number(value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('pt-BR');
};

const columns: Column<DebentureVendaDto>[] = [
  { key: 'investidorNome', label: 'Investidor' },
  { key: 'quantidadeVendida', label: 'Qtde Vendida' },
  { key: 'quantidadeResgatada', label: 'Qtde Resgatada' },
  { key: 'valorTotal', label: 'Valor Total', render: (row) => formatCurrency(row.valorTotal) },
  { key: 'valorRendimentoAtual', label: 'Rendimento', render: (row) => formatCurrency(row.valorRendimentoAtual) },
  { key: 'valorIrAtual', label: 'Valor IR', render: (row) => formatCurrency(row.valorIrAtual) },
  { key: 'valorIofAtual', label: 'Valor IOF', render: (row) => formatCurrency(row.valorIofAtual) },
  { key: 'dataVenda', label: 'Data Venda', render: (row) => new Date(row.dataVenda).toLocaleDateString() },
  { key: 'dataHoraUltimaAtualizacao', label: 'Dt. e hora da Última atualização', render: (row) => formatDateTime(row.dataHoraUltimaAtualizacao) },
  { key: 'status', label: 'Status', render: (row) => debentureStatusVendaLabel[row.status] ?? '-' },
];

export const DebentureVendasPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<DebentureVendaDto[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const list = async () => {
    setLoading(true);
    try {
      const response = await http.get<PagedResponse<DebentureVendaDto>>('/securitizadora/debentures/vendas', {
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

  const deleteRow = async (row: DebentureVendaDto) => {
    if (!window.confirm(`Remover venda de ${row.investidorNome}?`)) return;
    try {
      await http.delete(`/securitizadora/debentures/vendas/${row.id}`);
      toast.success('Venda removida.');
      await list();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <PageFrame
      title="Venda de Debêntures"
      subtitle="Gestão de vendas cadastradas e comprovantes."
      actions={<button className="btn-main" onClick={() => navigate('/securitizadora/debentures/vendas/novo')}>Nova Venda</button>}
    >
      <div className="toolbar">
        <input
          placeholder="Buscar por investidor ou comprovante"
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
        onDetails={(row) => navigate(`/securitizadora/debentures/vendas/${row.id}`)}
        onEdit={(row) => navigate(`/securitizadora/debentures/vendas/${row.id}`)}
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


