import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getErrorMessage, http } from '../../../shared/api/http';
import type { PagedResponse } from '../../../shared/types/paging';
import { PageFrame } from '../../../shared/ui/PageFrame';
import {
  DebentureModoResgate,
  DebentureTipoResgate,
  debentureModoResgateLabel,
  debentureTipoResgateLabel,
  type DebentureComprovanteDto,
  type DebentureResgateDto,
  type DebentureVendaDto,
} from './types';
import '../../cadastros/cadastro.css';
import '../../cadastros/administradoras/entity-form.css';

type ResgateFormState = {
  debentureVendaId: string;
  modoResgate: DebentureModoResgate;
  tipoResgate: DebentureTipoResgate;
  quantidadeResgatada: string;
  valorResgateMonetario: string;
  valorRendimento: string;
  valorIr: string;
  valorIof: string;
  dataSolicitacao: string;
  observacoes: string;
};

const emptyForm: ResgateFormState = {
  debentureVendaId: '',
  modoResgate: DebentureModoResgate.Quantidade,
  tipoResgate: DebentureTipoResgate.Parcial,
  quantidadeResgatada: '',
  valorResgateMonetario: '',
  valorRendimento: '',
  valorIr: '',
  valorIof: '0',
  dataSolicitacao: '',
  observacoes: '',
};

const toDateInput = (value?: string | null) => (value ? value.slice(0, 10) : '');
const toTodayDateInput = () => {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
};

const toDecimal = (value: string) => {
  if (!value.trim()) return 0;
  const trimmed = value.trim();
  if (!trimmed.includes(',')) {
    const parsedDirect = Number(trimmed);
    return Number.isFinite(parsedDirect) ? parsedDirect : 0;
  }

  const normalized = trimmed.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};
const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const quantityFormatter = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 6 });

export const DebentureResgateFormPage = () => {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const resgateId = params.id;
  const isEdit = !!resgateId;

  const [loading, setLoading] = useState<boolean>(isEdit);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState<ResgateFormState>(() => ({ ...emptyForm, dataSolicitacao: isEdit ? '' : toTodayDateInput() }));
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
          modoResgate: resgate.modoResgate,
          tipoResgate: resgate.tipoResgate,
          quantidadeResgatada: String(resgate.quantidadeResgatada),
          valorResgateMonetario: String(resgate.valorResgateMonetario),
          valorRendimento: String(resgate.valorRendimento),
          valorIr: String(resgate.valorIr),
          valorIof: String(resgate.valorIof),
          dataSolicitacao: toDateInput(resgate.dataSolicitacao),
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

  const selectedVenda = useMemo(
    () => vendas.find((item) => item.id === form.debentureVendaId),
    [vendas, form.debentureVendaId],
  );

  useEffect(() => {
    if (isEdit || !selectedVenda) return;
    setForm((prev) => ({
      ...prev,
      valorRendimento: String(selectedVenda.valorRendimentoAtual ?? 0),
      valorIr: '0',
    }));
  }, [selectedVenda, isEdit]);

  const isModoQuantidade = form.modoResgate === DebentureModoResgate.Quantidade;

  const ensureValid = () => {
    if (!form.debentureVendaId) {
      toast.error('Selecione a venda.');
      return false;
    }

    if (isModoQuantidade) {
      if (Number(form.quantidadeResgatada) <= 0) {
        toast.error('Quantidade resgatada inválida.');
        return false;
      }
    } else if (toDecimal(form.valorResgateMonetario) <= 0) {
      toast.error('Valor de resgate monetário inválido.');
      return false;
    }

    if (toDecimal(form.valorResgateMonetario) < 0 || toDecimal(form.valorRendimento) < 0 || toDecimal(form.valorIr) < 0 || toDecimal(form.valorIof) < 0) {
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
      modoResgate: Number(form.modoResgate),
      tipoResgate: Number(form.tipoResgate),
      quantidadeResgatada: isModoQuantidade ? Number(form.quantidadeResgatada) : 0,
      valorResgateMonetario: isModoQuantidade ? 0 : toDecimal(form.valorResgateMonetario),
      valorRendimento: toDecimal(form.valorRendimento),
      valorIr: toDecimal(form.valorIr),
      valorIof: toDecimal(form.valorIof),
      dataSolicitacao: form.dataSolicitacao,
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

  const quantidadeSolicitadaEstimada = useMemo(() => {
    if (!selectedVenda) return 0;
    if (isModoQuantidade) return Number(form.quantidadeResgatada) || 0;
    const valorMonetario = toDecimal(form.valorResgateMonetario);
    if (selectedVenda.valorUnitario <= 0 || valorMonetario <= 0) return 0;
    return valorMonetario / selectedVenda.valorUnitario;
  }, [selectedVenda, isModoQuantidade, form.quantidadeResgatada, form.valorResgateMonetario]);

  const saldoQuantidade = useMemo(() => {
    if (!selectedVenda) return 0;
    return selectedVenda.quantidadeVendida - quantidadeSolicitadaEstimada;
  }, [selectedVenda, quantidadeSolicitadaEstimada]);

  const valorResgateSolicitado = useMemo(() => {
    if (!selectedVenda) return 0;
    if (isModoQuantidade) {
      const quantidade = Number(form.quantidadeResgatada) || 0;
      return quantidade * selectedVenda.valorUnitario;
    }
    return toDecimal(form.valorResgateMonetario);
  }, [selectedVenda, isModoQuantidade, form.quantidadeResgatada, form.valorResgateMonetario]);

  const saldoMonetario = useMemo(() => {
    if (!selectedVenda) return 0;
    return selectedVenda.valorTotal - valorResgateSolicitado;
  }, [selectedVenda, valorResgateSolicitado]);

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
            <p>Escolha o modo de solicitação e preencha apenas o campo correspondente.</p>
          </header>

          <div className="entity-meta-bar">
            <span><strong>Modo:</strong> {debentureModoResgateLabel[form.modoResgate]}</span>
            <span><strong>Quantidade Total da Venda:</strong> {quantityFormatter.format(selectedVenda?.quantidadeVendida ?? 0)}</span>
            <span><strong>Resgate Solicitado (estimado):</strong> {quantityFormatter.format(quantidadeSolicitadaEstimada)}</span>
            <span><strong>Saldo em Quantidade:</strong> {quantityFormatter.format(saldoQuantidade)}</span>
            <span><strong>Valor Total da Venda:</strong> {currencyFormatter.format(selectedVenda?.valorTotal ?? 0)}</span>
            <span><strong>Saldo Monetário:</strong> {currencyFormatter.format(saldoMonetario)}</span>
          </div>

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

            <label className="span-all">
              <span>Modo de Resgate (escolha uma opção)</span>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {Object.entries(debentureModoResgateLabel).map(([value, label]) => (
                  <label key={value} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="radio"
                      name="modoResgate"
                      value={value}
                      checked={Number(form.modoResgate) === Number(value)}
                      onChange={() => {
                        const modo = Number(value) as DebentureModoResgate;
                        setForm((prev) => ({
                          ...prev,
                          modoResgate: modo,
                          quantidadeResgatada: modo === DebentureModoResgate.Quantidade ? prev.quantidadeResgatada : '',
                          valorResgateMonetario: modo === DebentureModoResgate.Monetario ? prev.valorResgateMonetario : '',
                        }));
                      }}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </label>

            <label>
              <span>Quantidade Resgatada</span>
              <input
                type="number"
                min="1"
                step="1"
                value={form.quantidadeResgatada}
                onChange={(event) => setForm((prev) => ({ ...prev, quantidadeResgatada: event.target.value }))}
                required={isModoQuantidade}
                disabled={!isModoQuantidade}
              />
            </label>

            <label>
              <span>Valor Resgate Monetário</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.valorResgateMonetario}
                onChange={(event) => setForm((prev) => ({ ...prev, valorResgateMonetario: event.target.value }))}
                required={!isModoQuantidade}
                disabled={isModoQuantidade}
              />
            </label>

            <label>
              <span>Valor Rendimento</span>
              <input type="text" value={currencyFormatter.format(toDecimal(form.valorRendimento))} readOnly />
            </label>

            <label>
              <span>Valor IR</span>
              <input type="text" value={currencyFormatter.format(toDecimal(form.valorIr))} readOnly />
            </label>

            <label>
              <span>Valor IOF</span>
              <input type="number" min="0" step="0.01" value={form.valorIof} onChange={(event) => setForm((prev) => ({ ...prev, valorIof: event.target.value }))} required />
            </label>

            <label>
              <span>Data da Solicitação</span>
              <input type="date" value={form.dataSolicitacao} onChange={(event) => setForm((prev) => ({ ...prev, dataSolicitacao: event.target.value }))} required />
            </label>

            <label>
              <span>Tipo de Resgate</span>
              <select value={Number(form.tipoResgate)} onChange={(event) => setForm((prev) => ({ ...prev, tipoResgate: Number(event.target.value) as DebentureTipoResgate }))}>
                {Object.entries(debentureTipoResgateLabel).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
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
