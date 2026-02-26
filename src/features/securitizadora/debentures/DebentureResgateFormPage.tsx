import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getErrorMessage, http } from '../../../shared/api/http';
import type { PagedResponse } from '../../../shared/types/paging';
import { PageFrame } from '../../../shared/ui/PageFrame';
import {
  DebentureModoResgate,
  DebentureStatusResgate,
  DebentureTipoResgate,
  debentureModoResgateLabel,
  debentureStatusResgateLabel,
  debentureTipoResgateLabel,
  type DebentureComprovanteDto,
  type DebentureEmissaoListDto,
  type DebentureResgateDto,
  type DebentureSerieDto,
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
  const [statusActionLoading, setStatusActionLoading] = useState(false);
  const [status, setStatus] = useState<DebentureStatusResgate>(DebentureStatusResgate.Solicitado);
  const [form, setForm] = useState<ResgateFormState>(() => ({ ...emptyForm, dataSolicitacao: isEdit ? '' : toTodayDateInput() }));
  const [valorRendimentoInfo, setValorRendimentoInfo] = useState(0);
  const [vendas, setVendas] = useState<DebentureVendaDto[]>([]);
  const [emissoes, setEmissoes] = useState<DebentureEmissaoListDto[]>([]);
  const [seriesById, setSeriesById] = useState<Record<string, DebentureSerieDto>>({});
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

  const loadEmissoes = async () => {
    try {
      const response = await http.get<PagedResponse<DebentureEmissaoListDto>>('/securitizadora/debentures/emissoes', {
        params: { page: 1, pageSize: 200, sortBy: 'numero', sortDir: 'asc' },
      });
      setEmissoes(response.data.items ?? []);
    } catch {
      setEmissoes([]);
    }
  };

  const loadSeriesCatalog = async (vendasList: DebentureVendaDto[]) => {
    const emissaoIds = Array.from(new Set(vendasList.map((item) => item.debentureEmissaoId)));
    if (emissaoIds.length === 0) {
      setSeriesById({});
      return;
    }

    try {
      const responses = await Promise.all(
        emissaoIds.map((emissaoId) => http.get<DebentureSerieDto[]>(`/securitizadora/debentures/emissoes/${emissaoId}/series`)),
      );
      const merged = responses.flatMap((response) => response.data ?? []);
      const map: Record<string, DebentureSerieDto> = {};
      merged.forEach((serie) => {
        map[serie.id] = serie;
      });
      setSeriesById(map);
    } catch {
      setSeriesById({});
    }
  };

  useEffect(() => {
    void loadVendas();
    void loadEmissoes();
  }, []);

  useEffect(() => {
    void loadSeriesCatalog(vendas);
  }, [vendas]);

  useEffect(() => {
    const loadResgateDetails = async () => {
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
          valorIr: String(resgate.valorIr),
          valorIof: String(resgate.valorIof),
          dataSolicitacao: toDateInput(resgate.dataSolicitacao),
          observacoes: resgate.observacoes ?? '',
        });
        setValorRendimentoInfo(resgate.valorRendimento ?? 0);
        setStatus(resgate.status);

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

    void loadResgateDetails();
  }, [resgateId]);

  const selectedVenda = useMemo(
    () => vendas.find((item) => item.id === form.debentureVendaId),
    [vendas, form.debentureVendaId],
  );

  const emissaoById = useMemo(
    () => new Map(emissoes.map((item) => [item.id, item])),
    [emissoes],
  );

  useEffect(() => {
    if (isEdit || !selectedVenda) return;
    setForm((prev) => ({ ...prev, valorIr: '0' }));
  }, [selectedVenda, isEdit]);

  const valorRendimentoInformativo = useMemo(
    () => selectedVenda?.valorRendimentoAtual ?? valorRendimentoInfo,
    [selectedVenda, valorRendimentoInfo],
  );
  const isTipoSomenteRendimentos = form.tipoResgate === DebentureTipoResgate.SomenteRendimentos;
  const valorSomenteRendimentosCalculado = useMemo(() => {
    return Math.max(0, valorRendimentoInformativo);
  }, [valorRendimentoInformativo]);

  useEffect(() => {
    if (!isTipoSomenteRendimentos) return;
    setForm((prev) => ({
      ...prev,
      modoResgate: DebentureModoResgate.Monetario,
      quantidadeResgatada: '',
      valorResgateMonetario: valorSomenteRendimentosCalculado.toFixed(2),
    }));
  }, [isTipoSomenteRendimentos, valorSomenteRendimentosCalculado]);

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

    if (toDecimal(form.valorResgateMonetario) < 0 || toDecimal(form.valorIr) < 0 || toDecimal(form.valorIof) < 0) {
      toast.error('Valores de resgate inválidos.');
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
      valorRendimento: valorRendimentoInformativo,
      valorIr: toDecimal(form.valorIr),
      valorIof: toDecimal(form.valorIof),
      dataSolicitacao: form.dataSolicitacao || toTodayDateInput(),
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

  const runStatusAction = async (action: 'aprovar' | 'reprovar' | 'cancelar') => {
    if (!resgateId) return;

    setStatusActionLoading(true);
    try {
      await http.post(`/securitizadora/debentures/resgates/${resgateId}/${action}`);
      setStatus(
        action === 'aprovar'
          ? DebentureStatusResgate.Aprovado
          : action === 'reprovar'
            ? DebentureStatusResgate.Reprovado
            : DebentureStatusResgate.Cancelado,
      );
      toast.success(`Status do resgate atualizado para ${action}.`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setStatusActionLoading(false);
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
            <span><strong>Status:</strong> {debentureStatusResgateLabel[status] ?? '-'}</span>
            <span><strong>Quantidade Total da Venda:</strong> {quantityFormatter.format(selectedVenda?.quantidadeVendida ?? 0)}</span>
            <span><strong>Resgate Solicitado (estimado):</strong> {quantityFormatter.format(quantidadeSolicitadaEstimada)}</span>
            <span><strong>Saldo em Quantidade:</strong> {quantityFormatter.format(saldoQuantidade)}</span>
            <span><strong>Valor Total da Venda:</strong> {currencyFormatter.format(selectedVenda?.valorTotal ?? 0)}</span>
            <span><strong>Saldo Monetário:</strong> {currencyFormatter.format(saldoMonetario)}</span>
            <span><strong>Valor Rendimento (informativo):</strong> {currencyFormatter.format(valorRendimentoInformativo)}</span>
          </div>

          <div className="entity-grid cols-3">
            <label>
              <span>Venda</span>
              <select value={form.debentureVendaId} onChange={(event) => setForm((prev) => ({ ...prev, debentureVendaId: event.target.value }))} disabled={isEdit} required>
                <option value="">Selecione</option>
                {vendas.map((item) => {
                  const emissao = emissaoById.get(item.debentureEmissaoId);
                  const numeroDebenture = emissao?.numeroEmissao ?? '-';
                  const nomeEmissao = emissao?.nomeEmissao ?? '-';
                  const serieCodigo = seriesById[item.debentureSerieId]?.codigoSerie ?? item.debentureSerieId.slice(0, 8).toUpperCase();
                  const valorDisponivel = Math.max(0, item.valorUnitario * (item.quantidadeVendida - item.quantidadeResgatada));
                  return (
                    <option key={item.id} value={item.id}>
                      {numeroDebenture} - {nomeEmissao} | Série: {serieCodigo} | Disponível: {currencyFormatter.format(valorDisponivel)} | {item.investidorNome}
                    </option>
                  );
                })}
              </select>
            </label>

            <label className="span-all">
              <span>Modo de Resgate (escolha uma opção)</span>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {Object.entries(debentureModoResgateLabel).map(([value, label]) => (
                  <label key={value} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, width: 'auto' }}>
                    <input
                      type="radio"
                      name="modoResgate"
                      value={value}
                      style={{ width: 16, height: 16, minHeight: 16, padding: 0, margin: 0 }}
                      checked={Number(form.modoResgate) === Number(value)}
                      onChange={() => {
                        const modo = Number(value) as DebentureModoResgate;
                        if (isTipoSomenteRendimentos && modo === DebentureModoResgate.Quantidade) {
                          return;
                        }
                        setForm((prev) => ({
                          ...prev,
                          modoResgate: modo,
                          quantidadeResgatada: modo === DebentureModoResgate.Quantidade ? prev.quantidadeResgatada : '',
                          valorResgateMonetario: modo === DebentureModoResgate.Monetario ? prev.valorResgateMonetario : '',
                        }));
                      }}
                      disabled={isTipoSomenteRendimentos && Number(value) === DebentureModoResgate.Quantidade}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </label>

            <label>
              <span>Tipo de Resgate</span>
              <select
                value={Number(form.tipoResgate)}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, tipoResgate: Number(event.target.value) as DebentureTipoResgate }))
                }
              >
                {Object.entries(debentureTipoResgateLabel).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
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
                readOnly={isTipoSomenteRendimentos}
              />
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

            <div className="entity-actions" style={{ marginTop: '0.75rem' }}>
              <button
                type="button"
                className="btn-main"
                onClick={() => void runStatusAction('aprovar')}
                disabled={statusActionLoading || status !== DebentureStatusResgate.Solicitado}
              >
                Aprovar
              </button>
              <button
                type="button"
                className="btn-muted"
                onClick={() => void runStatusAction('reprovar')}
                disabled={statusActionLoading || status !== DebentureStatusResgate.Solicitado}
              >
                Reprovar
              </button>
              <button
                type="button"
                className="btn-muted"
                onClick={() => void runStatusAction('cancelar')}
                disabled={statusActionLoading || status !== DebentureStatusResgate.Solicitado}
              >
                Cancelar
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
