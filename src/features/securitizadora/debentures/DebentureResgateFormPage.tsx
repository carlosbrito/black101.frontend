import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getErrorMessage, http } from '../../../shared/api/http';
import type { PagedResponse } from '../../../shared/types/paging';
import { PageFrame } from '../../../shared/ui/PageFrame';
import {
  DebentureStatusResgate,
  DebentureTipoResgate,
  debentureStatusResgateLabel,
  debentureTipoResgateLabel,
  type DebentureComprovanteDto,
  type DebentureResgateDto,
  type DebentureVendaDto,
} from './types';
import '../../cadastros/cadastro.css';
import '../../cadastros/administradoras/entity-form.css';

type ResgateFormState = {
  debentureVendaId: string;
  tipoResgate: DebentureTipoResgate;
  quantidadeResgatada: string;
  valorResgateMonetario: string;
  valorRendimento: string;
  valorIr: string;
  dataSolicitacao: string;
  status: DebentureStatusResgate;
  observacoes: string;
};

const emptyForm: ResgateFormState = {
  debentureVendaId: '',
  tipoResgate: DebentureTipoResgate.Parcial,
  quantidadeResgatada: '',
  valorResgateMonetario: '',
  valorRendimento: '',
  valorIr: '',
  dataSolicitacao: '',
  status: DebentureStatusResgate.Solicitado,
  observacoes: '',
};

const toDateInput = (value?: string | null) => (value ? value.slice(0, 10) : '');

const toDecimal = (value: string) => Number(value.replace(',', '.'));

export const DebentureResgateFormPage = () => {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const resgateId = params.id;
  const isEdit = !!resgateId;

  const [loading, setLoading] = useState<boolean>(isEdit);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState<ResgateFormState>(emptyForm);
  const [vendas, setVendas] = useState<DebentureVendaDto[]>([]);
  const [comprovante, setComprovante] = useState<DebentureComprovanteDto | null>(null);

  const loadVendas = async () => {
    try {
      const response = await http.get<PagedResponse<DebentureVendaDto>>('/securitizadora/debentures/vendas', {
        params: { page: 1, pageSize: 200, sortBy: 'data', sortDir: 'desc' },
      });
      setVendas(response.data.items ?? []);
    } catch {
      setVendas([]);
    }
  };

  useEffect(() => {
    void loadVendas();
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      if (!resgateId) return;

      setLoading(true);
      try {
        const response = await http.get<DebentureResgateDto>(`/securitizadora/debentures/resgates/${resgateId}`);
        const resgate = response.data;
        setForm({
          debentureVendaId: resgate.debentureVendaId,
          tipoResgate: resgate.tipoResgate,
          quantidadeResgatada: String(resgate.quantidadeResgatada),
          valorResgateMonetario: String(resgate.valorResgateMonetario),
          valorRendimento: String(resgate.valorRendimento),
          valorIr: String(resgate.valorIr),
          dataSolicitacao: toDateInput(resgate.dataSolicitacao),
          status: resgate.status,
          observacoes: resgate.observacoes ?? '',
        });

        if (resgate.comprovanteNumero) {
          setComprovante({
            id: resgate.id,
            numero: resgate.comprovanteNumero,
            tipo: 'RESGATE',
            enviadoCertificadora: resgate.comprovanteEnviadoCertificadora,
          });
        }
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, [resgateId]);

  const ensureValid = () => {
    if (!form.debentureVendaId) {
      toast.error('Selecione a venda.');
      return false;
    }

    if (Number(form.quantidadeResgatada) <= 0) {
      toast.error('Quantidade resgatada inválida.');
      return false;
    }

    if (toDecimal(form.valorResgateMonetario) < 0 || toDecimal(form.valorRendimento) < 0 || toDecimal(form.valorIr) < 0) {
      toast.error('Valores de resgate inválidos.');
      return false;
    }

    if (!form.dataSolicitacao) {
      toast.error('Informe a data da solicitação.');
      return false;
    }

    return true;
  };

  const onSave = async (event: FormEvent) => {
    event.preventDefault();

    if (!ensureValid()) return;

    const payload = {
      debentureVendaId: form.debentureVendaId,
      tipoResgate: Number(form.tipoResgate),
      quantidadeResgatada: Number(form.quantidadeResgatada),
      valorResgateMonetario: toDecimal(form.valorResgateMonetario),
      valorRendimento: toDecimal(form.valorRendimento),
      valorIr: toDecimal(form.valorIr),
      dataSolicitacao: form.dataSolicitacao,
      status: Number(form.status),
      observacoes: form.observacoes.trim() || null,
    };

    setSaving(true);
    try {
      if (isEdit && resgateId) {
        await http.put(`/securitizadora/debentures/resgates/${resgateId}`, payload);
        toast.success('Resgate atualizado.');
      } else {
        const response = await http.post<{ id: string }>('/securitizadora/debentures/resgates', payload);
        toast.success('Resgate criado.');
        navigate(`/securitizadora/debentures/resgates/${response.data.id}`, { replace: true });
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const runComprovanteAction = async (action: 'gerar' | 'enviar') => {
    if (!resgateId) {
      toast.error('Salve o resgate antes de gerar comprovante.');
      return;
    }

    setSending(true);
    try {
      const response = action === 'gerar'
        ? await http.post<DebentureComprovanteDto>(`/securitizadora/debentures/resgates/${resgateId}/comprovante/gerar`)
        : await http.post<DebentureComprovanteDto>(`/securitizadora/debentures/resgates/${resgateId}/comprovante/enviar-certificadora`, { provedor: 'UR' });

      setComprovante(response.data);
      toast.success(action === 'gerar' ? 'Comprovante gerado.' : 'Comprovante enviado para certificadora.');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSending(false);
    }
  };

  const selectedVenda = useMemo(
    () => vendas.find((item) => item.id === form.debentureVendaId),
    [vendas, form.debentureVendaId],
  );

  if (loading) {
    return (
      <PageFrame title="Cadastro de Resgate" subtitle="Carregando dados...">
        <div className="entity-loading">Carregando resgate...</div>
      </PageFrame>
    );
  }

  return (
    <PageFrame
      title={isEdit ? `Resgate: ${resgateId?.slice(0, 8).toUpperCase()}` : 'Novo Resgate de Debêntures'}
      subtitle="Cadastro em tela cheia para resgates e comprovante."
      actions={<Link className="btn-muted" to="/securitizadora/debentures/resgates">Voltar para listagem</Link>}
    >
      <form className="entity-form-stack" onSubmit={onSave}>
        <section className="entity-card">
          <header>
            <h3>Dados do Resgate</h3>
            <p>Preencha as informações de resgate unitário/monetário.</p>
          </header>

          <div className="entity-grid cols-3">
            <label>
              <span>Venda</span>
              <select value={form.debentureVendaId} onChange={(event) => setForm((prev) => ({ ...prev, debentureVendaId: event.target.value }))} disabled={isEdit} required>
                <option value="">Selecione</option>
                {vendas.map((item) => (
                  <option key={item.id} value={item.id}>{item.investidorNome} - {item.id.slice(0, 8).toUpperCase()}</option>
                ))}
              </select>
            </label>

            <label>
              <span>Tipo de Resgate</span>
              <select value={Number(form.tipoResgate)} onChange={(event) => setForm((prev) => ({ ...prev, tipoResgate: Number(event.target.value) as DebentureTipoResgate }))}>
                {Object.entries(debentureTipoResgateLabel).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>

            <label>
              <span>Status</span>
              <select value={Number(form.status)} onChange={(event) => setForm((prev) => ({ ...prev, status: Number(event.target.value) as DebentureStatusResgate }))}>
                {Object.entries(debentureStatusResgateLabel).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>

            <label>
              <span>Quantidade Resgatada</span>
              <input type="number" min="1" step="1" value={form.quantidadeResgatada} onChange={(event) => setForm((prev) => ({ ...prev, quantidadeResgatada: event.target.value }))} required />
            </label>

            <label>
              <span>Valor Resgate Monetário</span>
              <input type="number" min="0" step="0.01" value={form.valorResgateMonetario} onChange={(event) => setForm((prev) => ({ ...prev, valorResgateMonetario: event.target.value }))} required />
            </label>

            <label>
              <span>Valor Rendimento</span>
              <input type="number" min="0" step="0.01" value={form.valorRendimento} onChange={(event) => setForm((prev) => ({ ...prev, valorRendimento: event.target.value }))} required />
            </label>

            <label>
              <span>Valor IR</span>
              <input type="number" min="0" step="0.01" value={form.valorIr} onChange={(event) => setForm((prev) => ({ ...prev, valorIr: event.target.value }))} required />
            </label>

            <label>
              <span>Data da Solicitação</span>
              <input type="date" value={form.dataSolicitacao} onChange={(event) => setForm((prev) => ({ ...prev, dataSolicitacao: event.target.value }))} required />
            </label>

            <label>
              <span>Venda Selecionada</span>
              <input value={selectedVenda ? `${selectedVenda.investidorNome} (${selectedVenda.investidorDocumento})` : '-'} disabled />
            </label>

            <label className="span-all">
              <span>Observações</span>
              <textarea value={form.observacoes} onChange={(event) => setForm((prev) => ({ ...prev, observacoes: event.target.value }))} />
            </label>
          </div>
        </section>

        {isEdit ? (
          <section className="entity-card">
            <header>
              <h3>Comprovante de Resgate</h3>
              <p>Gerar comprovante e enviar para certificadora.</p>
            </header>

            <div className="entity-meta-bar">
              <span><strong>Número:</strong> {comprovante?.numero ?? '-'}</span>
              <span><strong>Enviado:</strong> {comprovante?.enviadoCertificadora ? 'Sim' : 'Não'}</span>
            </div>

            <div className="entity-actions">
              <button type="button" className="btn-muted" onClick={() => void runComprovanteAction('gerar')} disabled={sending}>
                Gerar Comprovante
              </button>
              <button type="button" className="btn-main" onClick={() => void runComprovanteAction('enviar')} disabled={sending}>
                Enviar para Certificadora
              </button>
            </div>
          </section>
        ) : null}

        <div className="entity-actions">
          <button type="button" className="btn-muted" onClick={() => navigate('/securitizadora/debentures/resgates')}>Cancelar</button>
          <button type="submit" className="btn-main" disabled={saving}>{saving ? 'Salvando...' : 'Salvar Resgate'}</button>
        </div>
      </form>
    </PageFrame>
  );
};
