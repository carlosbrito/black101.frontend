import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { http, getErrorMessage } from '../../shared/api/http';
import { PageFrame } from '../../shared/ui/PageFrame';
import { DataTable, type Column } from '../../shared/ui/DataTable';
import './operations/workers.css';

type WorkerStatus = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  type: number;
  queueName?: string;
  enabled: boolean;
  minConsumers: number;
  maxConsumers: number;
  defaultConsumers: number;
  prefetchCount: number;
  status: number;
  currentConsumers: number;
  lastStartedAt?: string;
  lastStoppedAt?: string;
  lastError?: string;
};

type WorkerAudit = {
  action: number;
  fromStatus: number;
  toStatus: number;
  performedAt: string;
  performedBy?: string;
  consumersBefore: number;
  consumersAfter: number;
  details?: string;
};

const statusLabel = (status?: number) => {
  switch (status) {
    case 1:
      return 'Em execução';
    case 2:
      return 'Parado';
    case 3:
      return 'Iniciando';
    case 4:
      return 'Parando';
    case 5:
      return 'Falhou';
    default:
      return 'Criado';
  }
};

const typeLabel = (type?: number) => {
  switch (type) {
    case 1:
      return 'RabbitMQ';
    case 2:
      return 'Hangfire';
    case 3:
      return 'Externo';
    default:
      return 'N/D';
  }
};

export const WorkersPage = () => {
  const [rows, setRows] = useState<WorkerStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<WorkerStatus | null>(null);
  const [audits, setAudits] = useState<WorkerAudit[]>([]);
  const [scaleValue, setScaleValue] = useState(1);
  const [actionLoading, setActionLoading] = useState(false);

  const columns: Column<WorkerStatus>[] = useMemo(
    () => [
      { key: 'name', label: 'Worker' },
      {
        key: 'status',
        label: 'Status',
        render: (row: WorkerStatus) => statusLabel(row.status),
      },
      {
        key: 'type',
        label: 'Tipo',
        render: (row: WorkerStatus) => typeLabel(row.type),
      },
      { key: 'queueName', label: 'Fila' },
      {
        key: 'currentConsumers',
        label: 'Consumers',
        render: (row: WorkerStatus) => `${row.currentConsumers} / ${row.maxConsumers}`,
      },
      {
        key: 'lastStartedAt',
        label: 'Último start',
      },
    ],
    [],
  );

  const fetchWorkers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await http.get('/workers');
      const data = (response.data as WorkerStatus[]).map((w) => ({ ...w, id: w.slug }));
      setRows(data);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAudits = useCallback(
    async (slug: string) => {
      try {
        const response = await http.get(`/workers/${slug}/audits`, { params: { take: 20 } });
        setAudits(response.data as WorkerAudit[]);
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    [],
  );

  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  const setAndLoad = (row: WorkerStatus) => {
    setSelected(row);
    setScaleValue(row.currentConsumers || row.defaultConsumers || 1);
    fetchAudits(row.slug);
  };

  const mutate = async (slug: string, action: 'start' | 'stop' | 'restart' | 'scale', consumers?: number) => {
    setActionLoading(true);
    try {
      const body = consumers ? { consumers } : undefined;
      const response = await http.post(`/workers/${slug}/${action}`, body);
      const updated = response.data as WorkerStatus;
      setRows((prev) => prev.map((r) => (r.slug === slug ? updated : r)));
      if (selected?.slug === slug) {
        setSelected(updated);
        fetchAudits(slug);
      }
      toast.success(`Worker ${action === 'stop' ? 'parado' : 'atualizado'} com sucesso.`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <PageFrame
      title="Workers"
      subtitle="Controle de start/stop e escala de consumidores de cada worker."
      actions={
        <button className="btn ghost" onClick={fetchWorkers} disabled={loading}>
          Atualizar
        </button>
      }
    >
      <div className="workers-grid">
        <div className="workers-table">
          <DataTable
            columns={columns}
            rows={rows}
            loading={loading}
            onEdit={(row) => setAndLoad(row)}
            onDetails={(row) => setAndLoad(row)}
            onDelete={() => toast.error('Remoção de worker não suportada.')}
          />
        </div>

        <div className="workers-details">
          {selected ? (
            <>
              <header className="workers-details__header">
                <div>
                  <h3>{selected.name}</h3>
                  <p>{selected.description}</p>
                  <p className="muted">
                    {typeLabel(selected.type)} · Fila: {selected.queueName ?? 'N/D'}
                  </p>
                </div>
                <span className={`badge status-${selected.status}`}>{statusLabel(selected.status)}</span>
              </header>

              <div className="workers-details__controls">
                <button className="btn primary" disabled={actionLoading} onClick={() => mutate(selected.slug, 'start')}>
                  Iniciar
                </button>
                <button className="btn" disabled={actionLoading} onClick={() => mutate(selected.slug, 'stop')}>
                  Parar
                </button>
                <button className="btn ghost" disabled={actionLoading} onClick={() => mutate(selected.slug, 'restart')}>
                  Reiniciar
                </button>
              </div>

              <div className="workers-details__scale">
                <label>Consumers</label>
                <div className="scale-row">
                  <input
                    type="number"
                    min={selected.minConsumers}
                    max={selected.maxConsumers}
                    value={scaleValue}
                    onChange={(e) => setScaleValue(Number(e.target.value))}
                  />
                  <button
                    className="btn secondary"
                    disabled={actionLoading}
                    onClick={() => mutate(selected.slug, 'scale', scaleValue)}
                  >
                    Ajustar
                  </button>
                </div>
                <small>
                  Mínimo {selected.minConsumers} · Máximo {selected.maxConsumers} · Default {selected.defaultConsumers}
                </small>
              </div>

              <div className="workers-details__audits">
                <h4>Últimas ações</h4>
                <ul>
                  {audits.map((a, idx) => (
                    <li key={`${a.performedAt}-${idx}`}>
                      <div>
                        <strong>{statusLabel(a.toStatus)}</strong> ({a.action}) — {a.performedBy ?? 'sistema'}
                      </div>
                      <div className="muted">
                        {new Date(a.performedAt).toLocaleString()} · Cons {a.consumersBefore} → {a.consumersAfter}
                      </div>
                      {a.details && <div className="muted">{a.details}</div>}
                    </li>
                  ))}
                  {audits.length === 0 && <li className="muted">Nenhuma ação registrada.</li>}
                </ul>
              </div>
            </>
          ) : (
            <div className="workers-details__placeholder">Selecione um worker para ver detalhes.</div>
          )}
        </div>
      </div>
    </PageFrame>
  );
};
