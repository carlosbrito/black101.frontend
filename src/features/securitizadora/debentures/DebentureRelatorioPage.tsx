import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getErrorMessage, http } from '../../../shared/api/http';
import { PageFrame } from '../../../shared/ui/PageFrame';
import type { DebentureJobDto } from './types';
import '../../cadastros/cadastro.css';
import '../../cadastros/administradoras/entity-form.css';

const relatorioLabels: Record<string, string> = {
  rendimentos: 'Relatório de Rendimentos',
  'extrato-vendas': 'Relatório Extrato de Vendas',
  resgates: 'Relatório de Resgate',
};

export const DebentureRelatorioPage = () => {
  const params = useParams<{ tipo: string }>();
  const tipo = params.tipo ?? 'rendimentos';
  const [loading, setLoading] = useState(false);
  const [job, setJob] = useState<DebentureJobDto | null>(null);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const label = useMemo(() => relatorioLabels[tipo] ?? 'Relatório de Debêntures', [tipo]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();

    setLoading(true);
    try {
      const response = await http.post<DebentureJobDto>(`/securitizadora/debentures/relatorios/${tipo}`, {
        dataInicio: dataInicio || null,
        dataFim: dataFim || null,
      });
      setJob(response.data);
      toast.success('Geração do relatório enfileirada.');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageFrame
      title={label}
      subtitle="Geração assíncrona com template Word e exportação final em PDF."
    >
      <form className="entity-form-stack" onSubmit={onSubmit}>
        <section className="entity-card">
          <header>
            <h3>Período do Relatório</h3>
            <p>Defina o período e solicite a geração do documento.</p>
          </header>

          <div className="entity-grid cols-3">
            <label>
              <span>Data Inicial</span>
              <input type="date" value={dataInicio} onChange={(event) => setDataInicio(event.target.value)} />
            </label>
            <label>
              <span>Data Final</span>
              <input type="date" value={dataFim} onChange={(event) => setDataFim(event.target.value)} />
            </label>
          </div>

          <div className="entity-actions">
            <button type="submit" className="btn-main" disabled={loading}>{loading ? 'Enfileirando...' : 'Gerar Relatório'}</button>
          </div>
        </section>
      </form>

      {job ? (
        <section className="entity-card">
          <header>
            <h3>Solicitação Registrada</h3>
          </header>
          <div className="entity-meta-bar">
            <span><strong>Job:</strong> {job.jobId}</span>
            <span><strong>Tipo:</strong> {job.tipo}</span>
            <span><strong>Status:</strong> {job.status}</span>
          </div>
          <p>{job.mensagem}</p>
        </section>
      ) : null}
    </PageFrame>
  );
};
