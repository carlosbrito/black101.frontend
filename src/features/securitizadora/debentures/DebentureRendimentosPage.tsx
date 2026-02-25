import { useState } from 'react';
import toast from 'react-hot-toast';
import { getErrorMessage, http } from '../../../shared/api/http';
import { PageFrame } from '../../../shared/ui/PageFrame';
import type { DebentureJobDto } from './types';
import '../../cadastros/cadastro.css';
import '../../cadastros/administradoras/entity-form.css';

export const DebentureRendimentosPage = () => {
  const [loading, setLoading] = useState(false);
  const [lastJob, setLastJob] = useState<DebentureJobDto | null>(null);

  const recalculate = async (tipo: 'cdi' | 'fixo') => {
    setLoading(true);
    try {
      const response = await http.post<DebentureJobDto>('/securitizadora/debentures/rendimentos/recalcular', { tipo });
      setLastJob(response.data);
      toast.success(response.data.mensagem || 'Solicitação enviada para processamento.');

      try {
        const workerResponse = await http.get<{ status: number }>('/workers/debenture-rendimento-cdi');
        const workerStatus = workerResponse.data?.status;
        const isRunning = workerStatus === 1 || workerStatus === 3;
        if (!isRunning) {
          toast('Job enfileirado. O worker de rendimento está parado; inicie em Operações > Workers.');
        }
      } catch {
        // best effort: o recálculo já foi enfileirado
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageFrame
      title="Atualização de Rendimentos"
      subtitle="Serviço assíncrono para atualização de rendimentos das debêntures ativas."
    >
      <section className="entity-card">
        <header>
          <h3>Recalcular Rendimentos</h3>
          <p>Dispara processamento em fila para recálculo baseado em CDI ou cálculo fixo.</p>
        </header>

        <div className="entity-actions" style={{ justifyContent: 'flex-start' }}>
          <button type="button" className="btn-main" onClick={() => void recalculate('cdi')} disabled={loading}>
            Recalcular por CDI
          </button>
          <button type="button" className="btn-muted" onClick={() => void recalculate('fixo')} disabled={loading}>
            Recalcular por Cálculo Fixo
          </button>
        </div>
      </section>

      {lastJob ? (
        <section className="entity-card">
          <header>
            <h3>Última Solicitação</h3>
          </header>
          <div className="entity-meta-bar">
            <span><strong>Job:</strong> {lastJob.jobId}</span>
            <span><strong>Tipo:</strong> {lastJob.tipo}</span>
            <span><strong>Status:</strong> {lastJob.status}</span>
          </div>
          <p>{lastJob.mensagem}</p>
        </section>
      ) : null}
    </PageFrame>
  );
};
