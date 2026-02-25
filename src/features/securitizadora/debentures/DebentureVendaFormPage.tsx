import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getErrorMessage, http } from '../../../shared/api/http';
import type { PagedResponse } from '../../../shared/types/paging';
import { PageFrame } from '../../../shared/ui/PageFrame';
import { formatCpfCnpj, isValidCpfCnpj, readPagedResponse, sanitizeDocument } from '../../cadastros/cadastroCommon';
import {
  DebentureStatusVenda,
  type DebentureComprovanteDto,
  type DebentureEmissaoListDto,
  type DebentureSerieDto,
  type DebentureVendaDto,
} from './types';
import '../../cadastros/cadastro.css';
import '../../cadastros/administradoras/entity-form.css';

type VendaFormState = {
  debentureEmissaoId: string;
  debentureSerieId: string;
  investidorNome: string;
  investidorDocumento: string;
  quantidadeVendida: string;
  valorUnitario: string;
  dataVenda: string;
  status: DebentureStatusVenda;
};

const emptyForm: VendaFormState = {
  debentureEmissaoId: '',
  debentureSerieId: '',
  investidorNome: '',
  investidorDocumento: '',
  quantidadeVendida: '',
  valorUnitario: '',
  dataVenda: '',
  status: DebentureStatusVenda.Ativa,
};

const toDateInput = (value?: string | null) => (value ? value.slice(0, 10) : '');
const toTodayDateInput = () => {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
};

const toDecimal = (value: string) => {
  if (!value.trim()) return 0;
  const normalized = value.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const decimalFormatter = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 6 });
const formatDecimalDisplay = (value?: number | string | null) => {
  if (value === null || value === undefined || value === '') return '';
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return '';
  return decimalFormatter.format(parsed);
};

type InvestidorRow = {
  id: string;
  nome: string;
  documento?: string | null;
  ativo: boolean;
};

export const DebentureVendaFormPage = () => {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const vendaId = params.id;
  const isEdit = !!vendaId;

  const [loading, setLoading] = useState<boolean>(isEdit);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState<VendaFormState>(() => ({ ...emptyForm, dataVenda: isEdit ? '' : toTodayDateInput() }));
  const [emissoes, setEmissoes] = useState<DebentureEmissaoListDto[]>([]);
  const [series, setSeries] = useState<DebentureSerieDto[]>([]);
  const [comprovante, setComprovante] = useState<DebentureComprovanteDto | null>(null);
  const [investidores, setInvestidores] = useState<InvestidorRow[]>([]);
  const [investidoresLoading, setInvestidoresLoading] = useState(false);
  const [selectedInvestidorId, setSelectedInvestidorId] = useState('');

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

  const loadSeries = async (selectedEmissaoId: string, preferredSerieId?: string) => {
    if (!selectedEmissaoId) {
      setSeries([]);
      return;
    }

    try {
      const response = await http.get<DebentureSerieDto[]>(`/securitizadora/debentures/emissoes/${selectedEmissaoId}/series`);
      const list = response.data ?? [];
      setSeries(list);

      if (!preferredSerieId && list.length > 0 && !isEdit) {
        setForm((prev) => ({ ...prev, debentureSerieId: list[0].id }));
      }
    } catch {
      setSeries([]);
    }
  };

  const loadInvestidores = async () => {
    setInvestidoresLoading(true);
    try {
      const response = await http.get('/cadastros/investidores', {
        params: {
          page: 1,
          pageSize: 100,
        },
      });
      const paged = readPagedResponse<InvestidorRow>(response.data);
      setInvestidores((paged.items ?? []).filter((item) => item.ativo));
    } catch {
      setInvestidores([]);
    } finally {
      setInvestidoresLoading(false);
    }
  };

  useEffect(() => {
    void loadEmissoes();
  }, []);
  useEffect(() => {
    void loadInvestidores();
  }, []);
  useEffect(() => {
    const bootstrap = async () => {
      if (!vendaId) return;

      setLoading(true);
      try {
        const response = await http.get<DebentureVendaDto>(`/securitizadora/debentures/vendas/${vendaId}`);
        const venda = response.data;
        setForm({
          debentureEmissaoId: venda.debentureEmissaoId,
          debentureSerieId: venda.debentureSerieId,
          investidorNome: venda.investidorNome,
          investidorDocumento: venda.investidorDocumento,
          quantidadeVendida: String(venda.quantidadeVendida),
          valorUnitario: formatDecimalDisplay(venda.valorUnitario),
          dataVenda: toDateInput(venda.dataVenda),
          status: venda.status,
        });

        if (venda.comprovanteNumero) {
          setComprovante({
            id: venda.id,
            numero: venda.comprovanteNumero,
            tipo: 'VENDA',
            enviadoCertificadora: venda.comprovanteEnviadoCertificadora,
          });
        }

        await loadSeries(venda.debentureEmissaoId, venda.debentureSerieId);
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isEdit) return;
    void loadSeries(form.debentureEmissaoId);
  }, [form.debentureEmissaoId, isEdit]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isEdit) return;
    const selectedSerie = series.find((item) => item.id === form.debentureSerieId);
    setForm((prev) => ({ ...prev, valorUnitario: selectedSerie ? formatDecimalDisplay(selectedSerie.valorUnitario) : '' }));
  }, [series, form.debentureSerieId, isEdit]);

  useEffect(() => {
    if (selectedInvestidorId || !form.investidorNome || !form.investidorDocumento) {
      return;
    }

    const match = investidores.find(
      (item) => item.nome === form.investidorNome && sanitizeDocument(item.documento ?? '') === sanitizeDocument(form.investidorDocumento),
    );
    if (match) {
      setSelectedInvestidorId(match.id);
    }
  }, [investidores, selectedInvestidorId, form.investidorNome, form.investidorDocumento]);

  const ensureValid = () => {
    if (!form.debentureEmissaoId) {
      toast.error('Selecione a emissão.');
      return false;
    }

    if (!form.debentureSerieId) {
      toast.error('Selecione a série.');
      return false;
    }

    if (!form.investidorNome.trim()) {
      toast.error('Informe o nome do investidor.');
      return false;
    }

    if (!isValidCpfCnpj(form.investidorDocumento)) {
      toast.error('Informe um CPF/CNPJ válido para o investidor.');
      return false;
    }

    if (!isEdit && Number(form.quantidadeVendida) <= 0) {
      toast.error('Informe a quantidade vendida.');
      return false;
    }

    if (toDecimal(form.valorUnitario) <= 0) {
      toast.error('Informe o valor unitário.');
      return false;
    }

    if (!form.dataVenda) {
      toast.error('Informe a data da venda.');
      return false;
    }

    return true;
  };

  const onSave = async (event: FormEvent) => {
    event.preventDefault();

    if (!ensureValid()) return;

    setSaving(true);
    try {
      if (isEdit && vendaId) {
        await http.put(`/securitizadora/debentures/vendas/${vendaId}`, {
          investidorNome: form.investidorNome.trim(),
          investidorDocumento: sanitizeDocument(form.investidorDocumento),
          valorUnitario: toDecimal(form.valorUnitario),
          dataVenda: form.dataVenda,
          status: Number(form.status),
        });

        toast.success('Venda atualizada.');
      } else {
        const response = await http.post<{ id: string }>('/securitizadora/debentures/vendas', {
          debentureEmissaoId: form.debentureEmissaoId,
          debentureSerieId: form.debentureSerieId,
          investidorNome: form.investidorNome.trim(),
          investidorDocumento: sanitizeDocument(form.investidorDocumento),
          quantidadeVendida: Number(form.quantidadeVendida),
          valorUnitario: toDecimal(form.valorUnitario),
          dataVenda: form.dataVenda,
          status: Number(form.status),
        });

        toast.success('Venda criada.');
        navigate(`/securitizadora/debentures/vendas/${response.data.id}`, { replace: true });
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const runComprovanteAction = async (action: 'gerar' | 'enviar') => {
    if (!vendaId) {
      toast.error('Salve a venda antes de gerar comprovante.');
      return;
    }

    setSending(true);
    try {
      const response = action === 'gerar'
        ? await http.post<DebentureComprovanteDto>(`/securitizadora/debentures/vendas/${vendaId}/comprovante/gerar`)
        : await http.post<DebentureComprovanteDto>(`/securitizadora/debentures/vendas/${vendaId}/comprovante/enviar-certificadora`, { provedor: 'UR' });

      setComprovante(response.data);
      toast.success(action === 'gerar' ? 'Comprovante gerado.' : 'Comprovante enviado para certificadora.');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSending(false);
    }
  };

  const valorTotalVenda = useMemo(() => {
    const quantidade = Number(form.quantidadeVendida);
    const valorUnitario = toDecimal(form.valorUnitario);

    if (!Number.isFinite(quantidade) || !Number.isFinite(valorUnitario)) {
      return 0;
    }

    return quantidade * valorUnitario;
  }, [form.quantidadeVendida, form.valorUnitario]);

  if (loading) {
    return (
      <PageFrame title="Cadastro de Venda" subtitle="Carregando dados...">
        <div className="entity-loading">Carregando venda...</div>
      </PageFrame>
    );
  }

  return (
    <PageFrame
      title={isEdit ? `Venda: ${form.investidorNome || 'Editar'}` : 'Nova Venda de Debêntures'}
      subtitle="Cadastro em tela cheia para venda, comprovante e envio para certificadora."
      actions={<Link className="btn-muted" to="/securitizadora/debentures/vendas">Voltar para listagem</Link>}
    >
      <form className="entity-form-stack" onSubmit={onSave}>
        <section className="entity-card">
          <header>
            <h3>Dados da Venda</h3>
            <p>Preencha os dados principais da venda de debêntures.</p>
          </header>

          <div className="entity-grid cols-3">
            <label>
              <span>Emissão</span>
              <select
                value={form.debentureEmissaoId}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    debentureEmissaoId: event.target.value,
                    debentureSerieId: '',
                    valorUnitario: '',
                  }))
                }
                disabled={isEdit}
                required
              >
                <option value="">Selecione</option>
                {emissoes.map((item) => (
                  <option key={item.id} value={item.id}>{item.numeroEmissao} - {item.nomeEmissao}</option>
                ))}
              </select>
            </label>

            <label>
              <span>Série</span>
              <select
                value={form.debentureSerieId}
                onChange={(event) => setForm((prev) => ({ ...prev, debentureSerieId: event.target.value }))}
                disabled={isEdit}
                required
              >
                <option value="">Selecione</option>
                {series.map((serie) => (
                  <option key={serie.id} value={serie.id}>{serie.codigoSerie}</option>
                ))}
              </select>
            </label>

            <label>
              <span>Investidor</span>
              <select
                value={selectedInvestidorId}
                onChange={(event) => {
                  const nextId = event.target.value;
                  setSelectedInvestidorId(nextId);
                  const selected = investidores.find((item) => item.id === nextId);
                  setForm((prev) => ({
                    ...prev,
                    investidorNome: selected?.nome ?? '',
                    investidorDocumento: sanitizeDocument(selected?.documento ?? ''),
                  }));
                }}
                required={!isEdit}
              >
                <option value="">
                  {investidoresLoading ? 'Carregando...' : isEdit && form.investidorNome ? `Atual: ${form.investidorNome}` : 'Selecione'}
                </option>
                {investidores.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome}
                    {item.documento ? ` (${formatCpfCnpj(item.documento)})` : ''}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Quantidade Vendida</span>
              <input
                type="number"
                min="1"
                step="1"
                value={form.quantidadeVendida}
                onChange={(event) => setForm((prev) => ({ ...prev, quantidadeVendida: event.target.value }))}
                disabled={isEdit}
                required
              />
            </label>

            <label>
              <span>Valor Unitário</span>
              <input type="text" value={form.valorUnitario} readOnly required />
            </label>

            <label>
              <span>Data da Venda</span>
              <input type="date" value={form.dataVenda} onChange={(event) => setForm((prev) => ({ ...prev, dataVenda: event.target.value }))} required />
            </label>

            <label>
              <span>Valor Total da Venda</span>
              <input value={formatCurrency(valorTotalVenda)} readOnly />
            </label>
          </div>
        </section>

        {isEdit ? (
          <section className="entity-card">
            <header>
              <h3>Comprovante de Venda</h3>
              <p>Gerar comprovante e enviar para certificadora (quando necessário).</p>
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
          <button type="button" className="btn-muted" onClick={() => navigate('/securitizadora/debentures/vendas')}>Cancelar</button>
          <button type="submit" className="btn-main" disabled={saving}>{saving ? 'Salvando...' : 'Salvar Venda'}</button>
        </div>
      </form>
    </PageFrame>
  );
};


