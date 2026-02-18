import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getErrorMessage, http } from '../../../shared/api/http';
import { PageFrame } from '../../../shared/ui/PageFrame';
import '../cadastro.css';
import '../administradoras/entity-form.css';

type ModalidadeDto = {
  id: string;
  nome: string;
  codigo: string;
  ativo: boolean;
};

export const ModalidadeFormPage = () => {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const modalidadeId = params.id;
  const isEdit = !!modalidadeId;
  const [loading, setLoading] = useState<boolean>(isEdit);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    codigo: '',
    ativo: true,
  });

  useEffect(() => {
    const bootstrap = async () => {
      if (!modalidadeId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await http.get(`/cadastros/modalidades/${modalidadeId}`);
        const data = response.data as ModalidadeDto;
        setForm({
          nome: data.nome ?? '',
          codigo: data.codigo ?? '',
          ativo: data.ativo,
        });
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, [modalidadeId]);

  const onSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.nome.trim()) {
      toast.error('Informe o nome da modalidade.');
      return;
    }
    if (!form.codigo.trim()) {
      toast.error('Informe o código da modalidade.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        codigo: form.codigo.trim().toUpperCase(),
        ativo: form.ativo,
      };

      if (modalidadeId) {
        await http.put(`/cadastros/modalidades/${modalidadeId}`, payload);
        toast.success('Modalidade atualizada.');
      } else {
        const response = await http.post('/cadastros/modalidades', payload);
        const created = response.data as { id: string };
        toast.success('Modalidade criada.');
        navigate(`/cadastro/modalidades/${created.id}`, { replace: true });
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const currentTitle = useMemo(
    () => (isEdit ? `Modalidade: ${form.nome || 'Editar'}` : 'Nova Modalidade'),
    [isEdit, form.nome],
  );

  return (
    <PageFrame
      title={currentTitle}
      subtitle="Cadastro e edição de modalidades para parametrização de empresas."
      actions={<button className="btn-muted" onClick={() => navigate('/cadastro/modalidades')}>Voltar para listagem</button>}
    >
      {loading ? (
        <div className="entity-loading">Carregando cadastro...</div>
      ) : (
        <form className="entity-form-stack" onSubmit={onSave}>
          <section className="entity-card">
            <header>
              <h3>Dados da Modalidade</h3>
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
                <span>Código</span>
                <input
                  value={form.codigo}
                  onChange={(event) => setForm((current) => ({ ...current, codigo: event.target.value.toUpperCase() }))}
                  required
                />
              </label>
              <label className="checkbox-inline">
                <input
                  type="checkbox"
                  checked={form.ativo}
                  onChange={(event) => setForm((current) => ({ ...current, ativo: event.target.checked }))}
                />
                <span>Modalidade ativa</span>
              </label>
            </div>
          </section>

          <div className="entity-actions">
            <button type="button" className="btn-muted" onClick={() => navigate('/cadastro/modalidades')}>
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
