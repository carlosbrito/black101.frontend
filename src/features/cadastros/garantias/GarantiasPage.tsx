import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getErrorMessage, http } from '../../../shared/api/http';
import { DataTable } from '../../../shared/ui/DataTable';
import type { Column } from '../../../shared/ui/DataTable';
import { PageFrame } from '../../../shared/ui/PageFrame';
import { readPagedResponse } from '../cadastroCommon';
import type { PagedResponse } from '../../../shared/types/paging';
import {
  type GarantiaListDto,
  type GarantiaTipoDto,
  GarantiaStatusJuridico,
  garantiaStatusJuridicoLabel,
} from './types';
import '../cadastro.css';

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const formatCurrency = (value?: number | null) => currencyFormatter.format(Number(value ?? 0));

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleDateString('pt-BR');
};

const columns: Column<GarantiaListDto>[] = [
  { key: 'codigoInterno', label: 'Código' },
  { key: 'titulo', label: 'Título', mobileLabel: 'Garantia' },
  { key: 'tipoGarantiaCodigo', label: 'Tipo', mobileHidden: true },
  {
    key: 'statusJuridico',
    label: 'Status',
    render: (row) => garantiaStatusJuridicoLabel[row.statusJuridico] ?? '-',
  },
  {
    key: 'valorElegivel',
    label: 'Valor Elegível',
    render: (row) => formatCurrency(row.valorElegivel),
    mobileHidden: true,
  },
  {
    key: 'valorElegivelDisponivel',
    label: 'Disponível',
    render: (row) => formatCurrency(row.valorElegivelDisponivel),
    mobileHidden: true,
  },
  {
    key: 'validUntil',
    label: 'Validade',
    render: (row) => formatDate(row.validUntil),
    mobileHidden: true,
  },
  {
    key: 'alertasPendentes',
    label: 'Alertas',
    render: (row) => row.alertasPendentes.toLocaleString('pt-BR'),
  },
];

export const GarantiasPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<GarantiaListDto[]>([]);
  const [tipos, setTipos] = useState<GarantiaTipoDto[]>([]);
  const [search, setSearch] = useState('');
  const [tipoGarantiaId, setTipoGarantiaId] = useState('');
  const [statusJuridico, setStatusJuridico] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadTipos = async () => {
    try {
      const response = await http.get<GarantiaTipoDto[]>('/cadastros/garantias/tipos');
      setTipos(response.data ?? []);
    } catch {
      setTipos([]);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const response = await http.get<PagedResponse<GarantiaListDto>>('/cadastros/garantias', {
        params: {
          page,
          pageSize,
          search: search || undefined,
          tipoGarantiaId: tipoGarantiaId || undefined,
          statusJuridico: statusJuridico || undefined,
          sortBy: 'createdAt',
          sortDir: 'desc',
        },
      });
      const paged = readPagedResponse<GarantiaListDto>(response.data);
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
    void loadTipos();
  }, []);

  useEffect(() => {
    void load();
  }, [page, pageSize]); // eslint-disable-line react-hooks/exhaustive-deps

  const pagesLabel = useMemo(() => `${page} de ${totalPages}`, [page, totalPages]);

  const onDelete = async (row: GarantiaListDto) => {
    if (!window.confirm(`Excluir garantia '${row.codigoInterno} - ${row.titulo}'?`)) {
      return;
    }

    try {
      await http.delete(`/cadastros/garantias/${row.id}`);
      toast.success('Garantia removida.');
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <PageFrame
      title="Cadastro de Garantias"
      subtitle="Gestão de garantias vinculadas a cedentes e operações."
      actions={<button className="btn-main" onClick={() => navigate('/cadastro/garantias/novo')}>Nova garantia</button>}
    >
      <div className="toolbar">
        <input
          placeholder="Buscar por código interno ou título"
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

        <select value={tipoGarantiaId} onChange={(event) => setTipoGarantiaId(event.target.value)}>
          <option value="">Todos os tipos</option>
          {tipos.map((tipo) => (
            <option key={tipo.id} value={tipo.id}>{tipo.nome}</option>
          ))}
        </select>

        <select value={statusJuridico} onChange={(event) => setStatusJuridico(event.target.value)}>
          <option value="">Todos os status</option>
          {Object.values(GarantiaStatusJuridico)
            .filter((value) => typeof value === 'number')
            .map((value) => (
              <option key={String(value)} value={String(value)}>
                {garantiaStatusJuridicoLabel[value as GarantiaStatusJuridico]}
              </option>
            ))}
        </select>

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
        onDetails={(row) => navigate(`/cadastro/garantias/${row.id}`)}
        onEdit={(row) => navigate(`/cadastro/garantias/${row.id}`)}
        onDelete={(row) => void onDelete(row)}
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
