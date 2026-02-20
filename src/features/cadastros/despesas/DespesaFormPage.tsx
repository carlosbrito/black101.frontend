import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getErrorMessage, http } from '../../../shared/api/http';
import { PageFrame } from '../../../shared/ui/PageFrame';
import '../cadastro.css';
import '../administradoras/entity-form.css';

type DespesaDto = {
  id: string;
  nome: string;
  segmento: number;
  tipo: number;
  valorBase: number;
  observacoes?: string | null;
  status: number;
};

export const DespesaFormPage = () => {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const despesaId = params.id;
  const isEdit = !!despesaId;
  const [loading, setLoading] = useState<boolean>(isEdit);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    segmento: 2,
    tipo: 2,
    valorBase: '',
    observacoes: '',
    ativa: true,
  });

  useEffect(() => {
    const bootstrap = async () => {
      if (!despesaId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await http.get(`/api/despesa/get/unique/${despesaId}`);
        const data = response.data as DespesaDto;
        setForm({
          nome: data.nome ?? '',
          segmento: data.segmento ?? 2,
          tipo: data.tipo ?? 2,
          valorBase: String(data.valorBase ?? ''),
          observacoes: data.observacoes ?? '',
          ativa: data.status === 1,
        });
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, [despesaId]);

  const onSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.nome.trim()) {
      toast.error('Informe o nome da despesa.');
      return;
    }

    const valor = Number(form.valorBase.replace(',', '.'));
    if (!Number.isFinite(valor)) {
      toast.error('Informe um valor válido.');
      return;
    }

    if (form.tipo === 1 && valor > 100) {
      toast.error('Para tipo %, o valor deve ser menor ou igual a 100.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: despesaId ?? undefined,
        nome: form.nome.trim(),
        segmento: form.segmento,
        tipo: String(form.tipo),
        valor: String(valor),
        obs: form.observacoes.trim() || null,
      };

      if (despesaId) {
        await http.put('/api/despesa/update', payload);
        if (form.ativa) {
          await http.put(`/api/despesa/activate/${despesaId}`);
        } else {
          await http.put(`/api/despesa/deactivate/${despesaId}`);
        }
        toast.success('Despesa atualizada.');
      } else {
        const response = await http.post('/api/despesa/register', payload);
        const created = response.data as { id: string };
        toast.success('Despesa criada.');
        navigate(`/cadastro/despesas/${created.id}`, { replace: true });
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const currentTitle = useMemo(
    () => (isEdit ? `Despesa: ${form.nome || 'Editar'}` : 'Nova Despesa'),
    [isEdit, form.nome],
  );

  return (
    <PageFrame
      title={currentTitle}
      subtitle="Cadastro da despesa mestre utilizada no vínculo com cedentes."
      actions={<button className="btn-muted" onClick={() => navigate('/cadastro/despesas')}>Voltar para listagem</button>}
    >
      {loading ? (
        <div className="entity-loading">Carregando cadastro...</div>
      ) : (
        <form className="entity-form-stack" onSubmit={onSave}>
          <section className="entity-card">
            <header>
              <h3>Dados da Despesa</h3>
            </header>
            <div className="entity-grid cols-3">
              <label>
                <span>Nome</span>
                <input
                  value={form.nome}
                  onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))}
                  required
                />
              </label>
              <label>
                <span>Cálculo por</span>
                <select
                  value={form.segmento}
                  onChange={(event) => setForm((current) => ({ ...current, segmento: Number(event.target.value) }))}
                >
                  <option value={1}>Recebível</option>
                  <option value={2}>Operação</option>
                  <option value={3}>Sacado</option>
                </select>
              </label>
              <label>
                <span>Tipo</span>
                <select
                  value={form.tipo}
                  onChange={(event) => setForm((current) => ({ ...current, tipo: Number(event.target.value) }))}
                >
                  <option value={1}>%</option>
                  <option value={2}>R$</option>
                </select>
              </label>
              <label>
                <span>Valor</span>
                <input
                  value={form.valorBase}
                  onChange={(event) => setForm((current) => ({ ...current, valorBase: event.target.value }))}
                  required
                />
              </label>
              <label className="span-all">
                <span>Observações</span>
                <textarea
                  rows={4}
                  value={form.observacoes}
                  onChange={(event) => setForm((current) => ({ ...current, observacoes: event.target.value }))}
                />
              </label>
              <label className="checkbox-inline">
                <input
                  type="checkbox"
                  checked={form.ativa}
                  onChange={(event) => setForm((current) => ({ ...current, ativa: event.target.checked }))}
                />
                <span>Despesa ativa</span>
              </label>
            </div>
          </section>

          <div className="entity-actions">
            <button type="button" className="btn-muted" onClick={() => navigate('/cadastro/despesas')}>
              Voltar
            </button>
            <button type="submit" className="btn-main" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      )}
    </PageFrame>
  );
};
