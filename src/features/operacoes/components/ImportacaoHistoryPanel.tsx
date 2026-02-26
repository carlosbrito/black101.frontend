import { HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../app/auth/AuthContext';
import { getErrorMessage, http } from '../../../shared/api/http';
import { DataTable, type Column } from '../../../shared/ui/DataTable';
import { formatDateTime } from '../../cadastros/cadastroCommon';
import { ImportacaoDetailsDrawer } from './ImportacaoDetailsDrawer';
import {
  asRecord,
  mapImportacaoDetails,
  mapImportacoesList,
  readField,
  statusClass,
  type CedenteAtivoOption,
  type FetchDetailsOptions,
  type ImportacaoDetails,
  type ImportacaoItem,
} from '../importacoes/importacoes.shared';

const formatDateOrDash = (value?: string | null) => (value ? formatDateTime(value) : '-');

export const ImportacaoHistoryPanel = () => {
  const { selectedEmpresaIds } = useAuth();
  const [rows, setRows] = useState<ImportacaoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selected, setSelected] = useState<ImportacaoDetails | null>(null);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [cedentesAtivos, setCedentesAtivos] = useState<CedenteAtivoOption[]>([]);
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  const selectedIdRef = useRef<string | null>(null);
  const listRef = useRef<(() => Promise<void>) | null>(null);
  const detailsRef = useRef<((id: string, options?: FetchDetailsOptions) => Promise<void>) | null>(null);
  const connectionRef = useRef<import('@microsoft/signalr').HubConnection | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);

  const cedenteLookup = useMemo(
    () => new Map(cedentesAtivos.map((item) => [item.id, `${item.nome} (${item.cnpjCpf})`])),
    [cedentesAtivos],
  );

  const cedenteLabelById = useCallback((id: string) => cedenteLookup.get(id) ?? id, [cedenteLookup]);

  const columns: Column<ImportacaoItem>[] = useMemo(
    () => [
      {
        key: 'fileName',
        label: 'Arquivo',
        render: (row) => <span className="import-cell-ellipsis" title={row.fileName ?? '-'}>{row.fileName ?? '-'}</span>,
      },
      { key: 'tipoArquivo', label: 'Tipo', render: (row) => row.tipoArquivo ?? '-' },
      { key: 'origem', label: 'Origem', render: (row) => row.origem ?? '-' },
      { key: 'cedenteId', label: 'Cedente', render: (row) => (row.cedenteId ? cedenteLabelById(row.cedenteId) : '-') },
      { key: 'status', label: 'Status', render: (row) => <span className={statusClass(row.status)}>{row.status}</span> },
      { key: 'createdAt', label: 'Criado em', render: (row) => formatDateOrDash(row.createdAt), mobileHidden: true },
      { key: 'completedAt', label: 'Concluído em', render: (row) => formatDateOrDash(row.completedAt), mobileHidden: true },
      { key: 'tentativas', label: 'Tentativas', render: (row) => String(row.tentativas ?? 0), mobileHidden: true },
      {
        key: 'errorSummary',
        label: 'Erro resumido',
        render: (row) => <span className="import-cell-ellipsis" title={row.errorSummary ?? '-'}>{row.errorSummary ?? '-'}</span>,
        mobileHidden: true,
      },
    ],
    [cedenteLabelById],
  );

  const list = useCallback(async () => {
    setLoading(true);
    try {
      const response = await http.get('/operacoes/importacoes', {
        params: { page, pageSize },
      });
      const data = mapImportacoesList(response.data);
      setRows(data.items);
      setTotalPages(Math.max(1, data.totalPages));
      setTotalItems(data.totalItems);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  const fetchDetailsById = useCallback(async (id: string, options?: FetchDetailsOptions) => {
    if (!options?.silent) {
      setSelectedLoading(true);
    }

    try {
      const response = await http.get(`/operacoes/importacoes/${id}`);
      setSelected(mapImportacaoDetails(response.data));
      selectedIdRef.current = id;
    } catch (error) {
      if (!options?.silent) {
        toast.error(getErrorMessage(error));
      }
    } finally {
      if (!options?.silent) {
        setSelectedLoading(false);
      }
    }
  }, []);

  const loadCedentesAtivos = useCallback(async () => {
    try {
      const response = await http.get('/cadastros/cedentes/ativos');
      const data = Array.isArray(response.data) ? response.data : [];
      const options = data
        .map((item) => {
          const row = asRecord(item);
          return {
            id: String(readField(row, 'id', 'Id') ?? ''),
            nome: String(readField(row, 'nome', 'Nome') ?? ''),
            cnpjCpf: String(readField(row, 'cnpjCpf', 'CnpjCpf') ?? ''),
          };
        })
        .filter((item) => item.id && item.nome);

      setCedentesAtivos(options);
    } catch {
      setCedentesAtivos([]);
    }
  }, []);

  const reprocessar = async (id: string) => {
    try {
      await http.post(`/operacoes/importacoes/${id}/reprocessar`);
      toast.success('Reprocessamento solicitado.');
      await list();
      if (selected?.id === id) {
        await fetchDetailsById(id);
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const copyText = async (value: string | null | undefined, label: string) => {
    if (!value) {
      toast.error(`${label} indisponível.`);
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copiado.`);
    } catch {
      toast.error(`Não foi possível copiar ${label.toLowerCase()}.`);
    }
  };

  useEffect(() => {
    listRef.current = list;
  }, [list]);

  useEffect(() => {
    detailsRef.current = fetchDetailsById;
  }, [fetchDetailsById]);

  useEffect(() => {
    void list();
  }, [list]);

  useEffect(() => {
    void loadCedentesAtivos();
  }, [loadCedentesAtivos]);

  useEffect(() => {
    selectedIdRef.current = selected?.id ?? null;
  }, [selected?.id]);

  useEffect(() => {
    let cancelled = false;
    const hubUrl = new URL('/hubs/importacoes', http.defaults.baseURL ?? window.location.origin).toString();
    const connection = new HubConnectionBuilder()
      .withUrl(hubUrl, { withCredentials: true })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .build();

    connection.on('ImportacaoChanged', (payload: { importacaoId?: string; ImportacaoId?: string }) => {
      const changedId = String(payload.importacaoId ?? payload.ImportacaoId ?? '');
      if (!changedId) return;

      if (refreshTimerRef.current === null) {
        refreshTimerRef.current = window.setTimeout(() => {
          refreshTimerRef.current = null;
          if (listRef.current) {
            void listRef.current();
          }
        }, 300);
      }

      if (selectedIdRef.current && changedId === selectedIdRef.current && detailsRef.current) {
        void detailsRef.current(changedId, { silent: true });
      }
    });

    connection.onreconnecting(() => {
      setRealtimeStatus('connecting');
    });

    connection.onreconnected(() => {
      setRealtimeStatus('connected');
      if (selectedEmpresaIds.length > 0) {
        void connection.invoke('SubscribeEmpresas', selectedEmpresaIds);
      }
    });

    connection.onclose(() => {
      setRealtimeStatus('disconnected');
    });

    const start = async () => {
      setRealtimeStatus('connecting');
      try {
        await connection.start();
        if (cancelled) {
          await connection.stop();
          return;
        }

        connectionRef.current = connection;
        setRealtimeStatus('connected');
        if (selectedEmpresaIds.length > 0) {
          await connection.invoke('SubscribeEmpresas', selectedEmpresaIds);
        }
      } catch {
        setRealtimeStatus('disconnected');
      }
    };

    void start();

    return () => {
      cancelled = true;
      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      const current = connectionRef.current;
      connectionRef.current = null;
      if (current) {
        void current.stop();
      } else {
        void connection.stop();
      }
    };
    // conexão criada uma única vez e reusa subscribe por efeito dedicado
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const current = connectionRef.current;
    if (!current || current.state !== HubConnectionState.Connected || selectedEmpresaIds.length === 0) {
      return;
    }

    void current.invoke('SubscribeEmpresas', selectedEmpresaIds);
  }, [selectedEmpresaIds]);

  return (
    <section className="card list-card import-history-panel">
      <header>
        <div>
          <h3>Histórico de importações</h3>
          <p>Atualização em tempo real via websocket. Use o refresh para recarga manual da tabela.</p>
        </div>
        <div className="pager">
          <span className={`realtime-status ${realtimeStatus}`}>
            {realtimeStatus === 'connected' ? 'Ao vivo' : realtimeStatus === 'connecting' ? 'Conectando...' : 'Desconectado'}
          </span>
          <span>{totalItems} registro(s)</span>
          <button onClick={() => void list()} disabled={loading}>
            {loading ? 'Atualizando...' : 'Atualizar tabela'}
          </button>
          <button disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
            Anterior
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>
            Próxima
          </button>
          <select
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setPage(1);
            }}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </header>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        onDetails={(row) => void fetchDetailsById(row.id)}
        renderActions={(row) =>
          row.status === 'FINALIZADO_FALHA' ? (
            <button className="danger" onClick={() => void reprocessar(row.id)}>
              Reprocessar
            </button>
          ) : null
        }
      />

      {selected ? (
        <ImportacaoDetailsDrawer
          selected={selected}
          selectedLoading={selectedLoading}
          onClose={() => {
            setSelected(null);
            selectedIdRef.current = null;
          }}
          onRefresh={() => fetchDetailsById(selected.id)}
          onCopy={copyText}
          onReprocess={reprocessar}
          cedenteLabelById={cedenteLabelById}
        />
      ) : null}
    </section>
  );
};
