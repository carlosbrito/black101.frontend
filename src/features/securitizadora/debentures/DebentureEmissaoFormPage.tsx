import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getErrorMessage, http } from '../../../shared/api/http';
import { PageFrame } from '../../../shared/ui/PageFrame';
import {
  DebentureIndiceTipo,
  DebentureStatusEmissao,
  debentureIndiceTipoLabel,
  debentureStatusEmissaoLabel,
  type DebentureEmissaoDetailsDto,
  type DebentureEscrituraDto,
  type DebentureSerieDto,
} from './types';
import '../../cadastros/cadastro.css';
import '../../cadastros/administradoras/entity-form.css';

type TabKey = 'emissao' | 'series' | 'escritura';

type EmissaoFormState = {
  numeroEmissao: string;
  nomeEmissao: string;
  dataEmissao: string;
  valorTotal: string;
  valorPu: string;
  status: DebentureStatusEmissao;
  observacoes: string;
};

type SerieFormState = {
  id?: string;
  codigoSerie: string;
  indice: DebentureIndiceTipo;
  taxa: string;
  quantidade: string;
  valorUnitario: string;
  dataVencimento: string;
  ativa: boolean;
};

type EscrituraFormState = {
  numeroInstrumento: string;
  dataAssinatura: string;
  localAssinatura: string;
  agenteFiduciario: string;
  textoLivre: string;
  templateWordNome: string;
};

const emptyEmissaoForm: EmissaoFormState = {
  numeroEmissao: '',
  nomeEmissao: '',
  dataEmissao: '',
  valorTotal: '',
  valorPu: '',
  status: DebentureStatusEmissao.Rascunho,
  observacoes: '',
};

const emptySerieForm: SerieFormState = {
  codigoSerie: '',
  indice: DebentureIndiceTipo.Cdi,
  taxa: '',
  quantidade: '',
  valorUnitario: '',
  dataVencimento: '',
  ativa: true,
};

const emptyEscrituraForm: EscrituraFormState = {
  numeroInstrumento: '',
  dataAssinatura: '',
  localAssinatura: '',
  agenteFiduciario: '',
  textoLivre: '',
  templateWordNome: '',
};

const toDateInput = (value?: string | null) => (value ? value.slice(0, 10) : '');

const toDecimal = (value: string) => Number(value.replace(',', '.'));
const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const maskCurrencyInput = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  return currencyFormatter.format(Number(digits) / 100);
};

const parseCurrencyToDecimal = (value: string) => {
  if (!value.trim()) return 0;
  const normalized = value
    .replace(/\s/g, '')
    .replace('R$', '')
    .replace(/\./g, '')
    .replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrencyFromDecimal = (value?: number | null) => {
  if (value === null || value === undefined) return '';
  return currencyFormatter.format(value);
};

export const DebentureEmissaoFormPage = () => {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const emissaoId = params.id;
  const isEdit = !!emissaoId;

  const [activeTab, setActiveTab] = useState<TabKey>('emissao');
  const [loading, setLoading] = useState<boolean>(isEdit);
  const [saving, setSaving] = useState(false);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [escrituraSaving, setEscrituraSaving] = useState(false);
  const [emissaoForm, setEmissaoForm] = useState<EmissaoFormState>(emptyEmissaoForm);
  const [serieForm, setSerieForm] = useState<SerieFormState>(emptySerieForm);
  const [escrituraForm, setEscrituraForm] = useState<EscrituraFormState>(emptyEscrituraForm);
  const [series, setSeries] = useState<DebentureSerieDto[]>([]);

  const canAccessSubTabs = isEdit;

  const hydrateForm = (data: DebentureEmissaoDetailsDto) => {
    setEmissaoForm({
      numeroEmissao: data.numeroEmissao ?? '',
      nomeEmissao: data.nomeEmissao ?? '',
      dataEmissao: toDateInput(data.dataEmissao),
      valorTotal: formatCurrencyFromDecimal(data.valorTotal),
      valorPu: formatCurrencyFromDecimal(data.valorPu),
      status: data.status,
      observacoes: data.observacoes ?? '',
    });

    setSeries(data.series ?? []);
    setEscrituraForm({
      numeroInstrumento: data.escritura?.numeroInstrumento ?? '',
      dataAssinatura: toDateInput(data.escritura?.dataAssinatura ?? undefined),
      localAssinatura: data.escritura?.localAssinatura ?? '',
      agenteFiduciario: data.escritura?.agenteFiduciario ?? '',
      textoLivre: data.escritura?.textoLivre ?? '',
      templateWordNome: data.escritura?.templateWordNome ?? '',
    });
  };

  const load = async () => {
    if (!emissaoId) return;

    setLoading(true);
    try {
      const response = await http.get<DebentureEmissaoDetailsDto>(`/securitizadora/debentures/emissoes/${emissaoId}`);
      hydrateForm(response.data);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const quantidadeTotalCalculada = useMemo(() => {
    const valorTotal = parseCurrencyToDecimal(emissaoForm.valorTotal);
    const valorPu = parseCurrencyToDecimal(emissaoForm.valorPu);
    if (valorTotal <= 0 || valorPu <= 0) {
      return 0;
    }

    return Math.floor(valorTotal / valorPu);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const ensureEmissaoValid = () => {
    if (!emissaoForm.numeroEmissao.trim()) {
      toast.error('Informe o número da emissão.');
      return false;
    }

    if (!emissaoForm.nomeEmissao.trim()) {
      toast.error('Informe o nome da emissão.');
      return false;
    }

    if (!emissaoForm.dataEmissao) {
      toast.error('Informe a data da emissão.');
      return false;
    }

    if (parseCurrencyToDecimal(emissaoForm.valorTotal) <= 0) {
      toast.error('Informe o valor total da emissão.');
      return false;
    }

    if (parseCurrencyToDecimal(emissaoForm.valorPu) <= 0) {
      toast.error('Informe o valor do PU.');
      return false;
    }

    if (quantidadeTotalCalculada <= 0) {
      toast.error('A quantidade total calculada deve ser maior que zero.');
      return false;
    }

    return true;
  };

  const onSaveEmissao = async (event: FormEvent) => {
    event.preventDefault();

    if (!ensureEmissaoValid()) {
      return;
    }

    setSaving(true);
    try {
      const payload = {
        numeroEmissao: emissaoForm.numeroEmissao.trim(),
        nomeEmissao: emissaoForm.nomeEmissao.trim(),
        dataEmissao: emissaoForm.dataEmissao,
        valorTotal: parseCurrencyToDecimal(emissaoForm.valorTotal),
        valorPu: parseCurrencyToDecimal(emissaoForm.valorPu),
        status: Number(emissaoForm.status),
        observacoes: emissaoForm.observacoes.trim() || null,
      };

      if (emissaoId) {
        await http.put(`/securitizadora/debentures/emissoes/${emissaoId}`, payload);
        toast.success('Emissão atualizada.');
      } else {
        const response = await http.post<{ id: string }>('/securitizadora/debentures/emissoes', payload);
        toast.success('Emissão criada.');
        navigate(`/securitizadora/debentures/emissoes/${response.data.id}`, { replace: true });
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const ensureSerieValid = () => {
    if (!emissaoId) {
      toast.error('Salve a emissão antes de incluir séries.');
      return false;
    }

    if (!serieForm.codigoSerie.trim()) {
      toast.error('Informe o código da série.');
      return false;
    }

    if (!serieForm.dataVencimento) {
      toast.error('Informe a data de vencimento da série.');
      return false;
    }

    if (toDecimal(serieForm.taxa) < 0) {
      toast.error('Taxa percentual inválida.');
      return false;
    }

    if (toDecimal(serieForm.valorUnitario) <= 0) {
      toast.error('Valor unitário inválido.');
      return false;
    }

    return true;
  };

  const resetSerieForm = () => setSerieForm(emptySerieForm);

  const refreshSeries = async () => {
    if (!emissaoId) return;
    setSeriesLoading(true);
    try {
      const response = await http.get<DebentureSerieDto[]>(`/securitizadora/debentures/emissoes/${emissaoId}/series`);
      setSeries(response.data ?? []);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSeriesLoading(false);
    }
  };

  const onSaveSerie = async (event: FormEvent) => {
    event.preventDefault();

    if (!ensureSerieValid() || !emissaoId) {
      return;
    }

    const quantidadeSerie = serieForm.id
      ? Number(serieForm.quantidade)
      : quantidadeTotalCalculada;
    if (quantidadeSerie <= 0) {
      toast.error('A emissão deve possuir quantidade total válida para criar série.');
      return;
    }

    const payload = {
      codigoSerie: serieForm.codigoSerie.trim(),
      indice: Number(serieForm.indice),
      taxa: toDecimal(serieForm.taxa),
      quantidade: quantidadeSerie,
      valorUnitario: toDecimal(serieForm.valorUnitario),
      dataVencimento: serieForm.dataVencimento,
      ativa: serieForm.ativa,
    };

    try {
      if (serieForm.id) {
        await http.put(`/securitizadora/debentures/emissoes/${emissaoId}/series/${serieForm.id}`, payload);
        toast.success('Série atualizada.');
      } else {
        await http.post(`/securitizadora/debentures/emissoes/${emissaoId}/series`, payload);
        toast.success('Série incluída.');
      }

      resetSerieForm();
      await refreshSeries();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const onEditSerie = (serie: DebentureSerieDto) => {
    setSerieForm({
      id: serie.id,
      codigoSerie: serie.codigoSerie,
      indice: serie.indice,
      taxa: String(serie.taxa),
      quantidade: String(serie.quantidade),
      valorUnitario: String(serie.valorUnitario),
      dataVencimento: toDateInput(serie.dataVencimento),
      ativa: serie.ativa,
    });
  };

  const onDeleteSerie = async (serieId: string) => {
    if (!emissaoId) return;
    if (!window.confirm('Remover série da emissão?')) return;

    try {
      await http.delete(`/securitizadora/debentures/emissoes/${emissaoId}/series/${serieId}`);
      toast.success('Série removida.');
      if (serieForm.id === serieId) {
        resetSerieForm();
      }
      await refreshSeries();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const onSaveEscritura = async (event: FormEvent) => {
    event.preventDefault();

    if (!emissaoId) {
      toast.error('Salve a emissão antes de editar a escritura.');
      return;
    }

    setEscrituraSaving(true);
    try {
      const payload: DebentureEscrituraDto = {
        debentureEmissaoId: emissaoId,
        numeroInstrumento: escrituraForm.numeroInstrumento.trim() || null,
        dataAssinatura: escrituraForm.dataAssinatura || null,
        localAssinatura: escrituraForm.localAssinatura.trim() || null,
        agenteFiduciario: escrituraForm.agenteFiduciario.trim() || null,
        textoLivre: escrituraForm.textoLivre.trim() || null,
        templateWordNome: escrituraForm.templateWordNome.trim() || null,
      };

      await http.put(`/securitizadora/debentures/emissoes/${emissaoId}/escritura`, payload);
      toast.success('Escritura atualizada.');
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setEscrituraSaving(false);
    }
  };

  const pageTitle = useMemo(() => {
    if (!isEdit) return 'Nova Emissão de Debêntures';
    return emissaoForm.nomeEmissao ? `Emissão: ${emissaoForm.nomeEmissao}` : 'Editar Emissão de Debêntures';
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const changeTab = (nextTab: TabKey) => {
    if (!canAccessSubTabs && nextTab !== 'emissao') {
      toast('Salve a emissão para liberar esta aba.');
      return;
    }

    setActiveTab(nextTab);
  };

  if (loading) {
    return (
      <PageFrame title="Cadastro de Emissão" subtitle="Carregando dados...">
        <div className="entity-loading">Carregando emissão...</div>
      </PageFrame>
    );
  }

  return (
    <PageFrame
      title={pageTitle}
      subtitle="Tela cheia com abas para emissão, séries e escritura da debênture."
      actions={<Link className="btn-muted" to="/securitizadora/debentures/emissoes">Voltar para listagem</Link>}
    >
      {isEdit ? (
        <div className="entity-meta-bar">
          <span><strong>Número:</strong> {emissaoForm.numeroEmissao || '-'}</span>
          <span><strong>Status:</strong> {debentureStatusEmissaoLabel[Number(emissaoForm.status)] ?? '-'}</span>
        </div>
      ) : null}

      <div className="entity-tabs" role="tablist" aria-label="Abas do cadastro de emissão">
        <button type="button" className={`entity-tab-btn ${activeTab === 'emissao' ? 'is-active' : ''}`} onClick={() => changeTab('emissao')}>Emissão</button>
        <button type="button" className={`entity-tab-btn ${activeTab === 'series' ? 'is-active' : ''}`} onClick={() => changeTab('series')} disabled={!canAccessSubTabs}>Séries</button>
        <button type="button" className={`entity-tab-btn ${activeTab === 'escritura' ? 'is-active' : ''}`} onClick={() => changeTab('escritura')} disabled={!canAccessSubTabs}>Escritura</button>
      </div>

      {activeTab === 'emissao' ? (
        <form className="entity-form-stack" onSubmit={onSaveEmissao}>
          <section className="entity-card">
            <header>
              <h3>Dados da Emissão</h3>
              <p>Cadastro principal de emissão de debêntures.</p>
            </header>

            <div className="entity-grid cols-3">
              <label>
                <span>Número</span>
                <input value={emissaoForm.numeroEmissao} onChange={(event) => setEmissaoForm((prev) => ({ ...prev, numeroEmissao: event.target.value }))} required />
              </label>
              <label>
                <span>Nome da Emissão</span>
                <input value={emissaoForm.nomeEmissao} onChange={(event) => setEmissaoForm((prev) => ({ ...prev, nomeEmissao: event.target.value }))} required />
              </label>
              <label>
                <span>Data da Emissão</span>
                <input type="date" value={emissaoForm.dataEmissao} onChange={(event) => setEmissaoForm((prev) => ({ ...prev, dataEmissao: event.target.value }))} required />
              </label>
              <label>
                <span>Valor Total</span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="R$ 0,00"
                  value={emissaoForm.valorTotal}
                  onChange={(event) => setEmissaoForm((prev) => ({ ...prev, valorTotal: maskCurrencyInput(event.target.value) }))}
                  required
                />
              </label>
              <label>
                <span>Valor do PU</span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="R$ 0,00"
                  value={emissaoForm.valorPu}
                  onChange={(event) => setEmissaoForm((prev) => ({ ...prev, valorPu: maskCurrencyInput(event.target.value) }))}
                  required
                />
              </label>
              <label>
                <span>Quantidade Total (calculada)</span>
                <input type="text" value={quantidadeTotalCalculada.toString()} readOnly />
              </label>
              <label>
                <span>Status</span>
                <select value={Number(emissaoForm.status)} onChange={(event) => setEmissaoForm((prev) => ({ ...prev, status: Number(event.target.value) as DebentureStatusEmissao }))}>
                  {Object.entries(debentureStatusEmissaoLabel).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="span-all">
                <span>Observações</span>
                <textarea value={emissaoForm.observacoes} onChange={(event) => setEmissaoForm((prev) => ({ ...prev, observacoes: event.target.value }))} />
              </label>
            </div>
          </section>

          <div className="entity-actions">
            <button type="button" className="btn-muted" onClick={() => navigate('/securitizadora/debentures/emissoes')}>Cancelar</button>
            <button type="submit" className="btn-main" disabled={saving}>{saving ? 'Salvando...' : 'Salvar Emissão'}</button>
          </div>
        </form>
      ) : null}

      {activeTab === 'series' ? (
        <div className="entity-form-stack">
          <form className="entity-card" onSubmit={onSaveSerie}>
            <header>
              <h3>{serieForm.id ? 'Editar Série' : 'Nova Série'}</h3>
              <p>Configure as séries da emissão com índice e taxa percentual.</p>
            </header>

            <div className="entity-grid cols-3">
              <label>
                <span>Código da Série</span>
                <input value={serieForm.codigoSerie} onChange={(event) => setSerieForm((prev) => ({ ...prev, codigoSerie: event.target.value }))} required />
              </label>
              <label>
                <span>Índice</span>
                <select value={Number(serieForm.indice)} onChange={(event) => setSerieForm((prev) => ({ ...prev, indice: Number(event.target.value) as DebentureIndiceTipo }))}>
                  {Object.entries(debentureIndiceTipoLabel).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Taxa (%)</span>
                <input type="number" min="0" step="0.000001" value={serieForm.taxa} onChange={(event) => setSerieForm((prev) => ({ ...prev, taxa: event.target.value }))} required />
              </label>
              <label>
                <span>Quantidade (automática)</span>
                <input type="text" value={(serieForm.id ? Number(serieForm.quantidade) : quantidadeTotalCalculada).toString()} readOnly />
              </label>
              <label>
                <span>Valor Unitário</span>
                <input type="number" min="0" step="0.01" value={serieForm.valorUnitario} onChange={(event) => setSerieForm((prev) => ({ ...prev, valorUnitario: event.target.value }))} required />
              </label>
              <label>
                <span>Vencimento</span>
                <input type="date" value={serieForm.dataVencimento} onChange={(event) => setSerieForm((prev) => ({ ...prev, dataVencimento: event.target.value }))} required />
              </label>
            </div>

            <div className="entity-actions">
              {serieForm.id ? <button type="button" className="btn-muted" onClick={resetSerieForm}>Cancelar edição</button> : null}
              <button type="submit" className="btn-main">{serieForm.id ? 'Atualizar Série' : 'Adicionar Série'}</button>
            </div>
          </form>

          <section className="entity-card">
            <header>
              <h3>Séries Cadastradas</h3>
              <p>Gerencie as séries vinculadas à emissão.</p>
            </header>

            <div className="entity-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Índice</th>
                    <th>Taxa</th>
                    <th>Quantidade</th>
                    <th>Disponível</th>
                    <th>Valor Unitário</th>
                    <th>Vencimento</th>
                    <th>Status</th>
                    <th className="col-actions">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {seriesLoading ? (
                    <tr>
                      <td colSpan={9}>Carregando séries...</td>
                    </tr>
                  ) : series.length === 0 ? (
                    <tr>
                      <td colSpan={9}>Nenhuma série cadastrada.</td>
                    </tr>
                  ) : (
                    series.map((serie) => (
                      <tr key={serie.id}>
                        <td>{serie.codigoSerie}</td>
                        <td>{debentureIndiceTipoLabel[serie.indice] ?? '-'}</td>
                        <td>{serie.taxa}%</td>
                        <td>{serie.quantidade}</td>
                        <td>{serie.quantidadeDisponivel}</td>
                        <td>{serie.valorUnitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                        <td>{new Date(serie.dataVencimento).toLocaleDateString()}</td>
                        <td>{serie.ativa ? 'Ativa' : 'Inativa'}</td>
                        <td className="col-actions">
                          <div className="table-actions">
                            <button type="button" onClick={() => onEditSerie(serie)}>Editar</button>
                            <button type="button" className="danger" onClick={() => void onDeleteSerie(serie.id)}>Excluir</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === 'escritura' ? (
        <form className="entity-form-stack" onSubmit={onSaveEscritura}>
          <section className="entity-card">
            <header>
              <h3>Escritura da Debênture</h3>
              <p>Formulário da escritura para geração de documentos e comprovantes.</p>
            </header>

            <div className="entity-grid cols-3">
              <label>
                <span>Número do Instrumento</span>
                <input value={escrituraForm.numeroInstrumento} onChange={(event) => setEscrituraForm((prev) => ({ ...prev, numeroInstrumento: event.target.value }))} />
              </label>
              <label>
                <span>Data da Assinatura</span>
                <input type="date" value={escrituraForm.dataAssinatura} onChange={(event) => setEscrituraForm((prev) => ({ ...prev, dataAssinatura: event.target.value }))} />
              </label>
              <label>
                <span>Local da Assinatura</span>
                <input value={escrituraForm.localAssinatura} onChange={(event) => setEscrituraForm((prev) => ({ ...prev, localAssinatura: event.target.value }))} />
              </label>
              <label>
                <span>Agente Fiduciário</span>
                <input value={escrituraForm.agenteFiduciario} onChange={(event) => setEscrituraForm((prev) => ({ ...prev, agenteFiduciario: event.target.value }))} />
              </label>
              <label>
                <span>Template Word</span>
                <input value={escrituraForm.templateWordNome} onChange={(event) => setEscrituraForm((prev) => ({ ...prev, templateWordNome: event.target.value }))} />
              </label>
              <label className="span-all">
                <span>Texto Livre</span>
                <textarea value={escrituraForm.textoLivre} onChange={(event) => setEscrituraForm((prev) => ({ ...prev, textoLivre: event.target.value }))} />
              </label>
            </div>
          </section>

          <div className="entity-actions">
            <button type="submit" className="btn-main" disabled={escrituraSaving}>{escrituraSaving ? 'Salvando...' : 'Salvar Escritura'}</button>
          </div>
        </form>
      ) : null}
    </PageFrame>
  );
};


