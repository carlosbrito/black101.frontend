import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getErrorMessage, http } from '../../../shared/api/http';
import { PageFrame } from '../../../shared/ui/PageFrame';
import {
  applyCpfCnpjMask,
  formatCpfCnpj,
  formatDateTime,
  isValidCpfCnpj,
  readPagedResponse,
  sanitizeDocument,
  type HistoricoItemDto,
} from '../cadastroCommon';
import '../cadastro.css';
import '../administradoras/entity-form.css';

type TabKey = 'bancarizador' | 'contas' | 'anexos' | 'observacoes' | 'historico';

type BancarizadorDto = {
  id: string;
  nome?: string;
  cnpjCpf?: string;
  observacao?: string | null;
  status?: number;
};

type GestoraLookupDto = {
  bancarizadorId?: string | null;
  pessoaId?: string | null;
  nome?: string;
  cnpjCpf?: string;
};

type BancarizadorFormState = {
  nome: string;
  documento: string;
  observacao: string;
  ativo: boolean;
};

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'bancarizador', label: 'Bancarizador' },
  { key: 'contas', label: 'Contas' },
  { key: 'anexos', label: 'Anexos' },
  { key: 'observacoes', label: 'Observações' },
  { key: 'historico', label: 'Histórico' },
];

const emptyStateMessageByTab: Record<Exclude<TabKey, 'bancarizador' | 'historico'>, { title: string; description: string }> = {
  contas: {
    title: 'Contas',
    description: 'A estrutura da aba já está pronta no layout e será ligada ao backend específico.',
  },
  anexos: {
    title: 'Anexos',
    description: 'A aba de anexos foi preparada no padrão legado e será conectada aos endpoints dedicados.',
  },
  observacoes: {
    title: 'Observações',
    description: 'A aba de observações foi criada para manter a compatibilidade de UX com o sistema legado.',
  },
};

const activeFromStatus = (status?: number) => Number(status ?? 1) === 1;

export const BancarizadorFormPage = () => {
  const params = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const bancarizadorId = params.id;
  const isEdit = !!bancarizadorId;

  const [loading, setLoading] = useState<boolean>(isEdit);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('bancarizador');
  const [pessoaId, setPessoaId] = useState<string | null>(null);
  const [originalAtivo, setOriginalAtivo] = useState(true);
  const [form, setForm] = useState<BancarizadorFormState>({
    nome: '',
    documento: '',
    observacao: '',
    ativo: true,
  });
  const [historicoPaged, setHistoricoPaged] = useState({
    items: [] as HistoricoItemDto[],
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 1,
  });

  const canAccessSubTabs = isEdit;

  const loadHistorico = async (id: string, page: number) => {
    try {
      const response = await http.get('/admin/auditoria', {
        params: {
          page,
          pageSize: historicoPaged.pageSize,
          entity: 'Bancarizador',
        },
      });

      const paged = readPagedResponse<HistoricoItemDto>(response.data);
      const filteredItems = paged.items.filter((item) => item.entidadeId === id);
      setHistoricoPaged((current) => ({
        ...current,
        items: filteredItems,
        page,
        totalItems: filteredItems.length,
        totalPages: filteredItems.length > 0 ? 1 : 1,
      }));
    } catch {
      setHistoricoPaged((current) => ({
        ...current,
        items: [],
        page,
        totalItems: 0,
        totalPages: 1,
      }));
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      setLoading(true);
      try {
        if (bancarizadorId) {
          const response = await http.get<BancarizadorDto>(`/api/bancarizador/get/unique/${bancarizadorId}`);
          const bancarizador = response.data;
          const ativo = activeFromStatus(bancarizador.status);
          setForm({
            nome: bancarizador.nome ?? '',
            documento: applyCpfCnpjMask(bancarizador.cnpjCpf ?? ''),
            observacao: bancarizador.observacao ?? '',
            ativo,
          });
          setOriginalAtivo(ativo);
          return;
        }

        const documento = sanitizeDocument(searchParams.get('documento') ?? '');
        if (!documento) {
          setLoading(false);
          return;
        }

        setForm((current) => ({ ...current, documento: applyCpfCnpjMask(documento) }));

        const lookupResponse = await http.get<GestoraLookupDto>('/api/bancarizador/get/cnpjcpf/gestora', {
          params: { cnpjcpf: documento },
        });

        const lookup = lookupResponse.data;
        if (lookup?.bancarizadorId) {
          navigate(`/cadastro/bancarizadores/${lookup.bancarizadorId}`, { replace: true });
          return;
        }

        setPessoaId(lookup?.pessoaId ?? null);
        setForm((current) => ({
          ...current,
          nome: lookup?.nome ?? current.nome,
          documento: applyCpfCnpjMask(lookup?.cnpjCpf ?? documento),
        }));
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, [bancarizadorId, navigate, searchParams]);

  useEffect(() => {
    if (!bancarizadorId || activeTab !== 'historico') return;
    void loadHistorico(bancarizadorId, historicoPaged.page);
  }, [activeTab, bancarizadorId, historicoPaged.page]); // eslint-disable-line react-hooks/exhaustive-deps

  const ensureValidForm = () => {
    if (!form.nome.trim()) {
      toast.error('Informe o nome do bancarizador.');
      return false;
    }

    if (!isValidCpfCnpj(form.documento)) {
      toast.error('Informe um CNPJ/CPF válido.');
      return false;
    }

    return true;
  };

  const onSave = async (event: FormEvent) => {
    event.preventDefault();

    if (!ensureValidForm()) {
      return;
    }

    setSaving(true);

    try {
      if (bancarizadorId) {
        await http.put('/api/bancarizador/update', {
          id: bancarizadorId,
          observacao: form.observacao.trim() || null,
        });

        if (form.ativo !== originalAtivo) {
          if (form.ativo) {
            await http.put(`/api/bancarizador/activate/${bancarizadorId}`);
          } else {
            await http.put(`/api/bancarizador/deactivate/${bancarizadorId}`);
          }
          setOriginalAtivo(form.ativo);
        }

        toast.success('Bancarizador atualizado.');
      } else {
        const response = await http.post('/api/bancarizador/register', {
          nome: form.nome.trim(),
          cnpjCpf: sanitizeDocument(form.documento),
          observacao: form.observacao.trim() || null,
        });

        const created = response.data as Record<string, unknown>;
        const createdId = String(created.id ?? created.Id ?? response.data ?? '');
        if (!createdId) {
          throw new Error('Não foi possível criar o bancarizador.');
        }

        if (!form.ativo) {
          await http.put(`/api/bancarizador/deactivate/${createdId}`);
        }

        toast.success('Bancarizador criado.');
        navigate(`/cadastro/bancarizadores/${createdId}`, { replace: true });
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const currentTitle = useMemo(
    () => (isEdit ? `Bancarizador: ${form.nome || 'Editar'}` : 'Novo Bancarizador'),
    [isEdit, form.nome],
  );

  const changeTab = (key: TabKey) => {
    if (!canAccessSubTabs && key !== 'bancarizador') {
      toast('Salve o bancarizador para liberar as abas complementares.');
      return;
    }

    setActiveTab(key);
  };

  const renderBancarizadorTab = () => (
    <form className="entity-form-stack" onSubmit={onSave}>
      <section className="entity-card">
        <header>
          <h3>Dados do Bancarizador</h3>
          <p>Cadastro em tela inteira no padrão legado.</p>
        </header>
        <div className="entity-grid cols-3">
          <label>
            <span>Nome</span>
            <input
              value={form.nome}
              onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))}
              required
              disabled={isEdit}
            />
          </label>
          <label>
            <span>CPF/CNPJ</span>
            <input
              value={form.documento}
              onChange={(event) => setForm((current) => ({ ...current, documento: applyCpfCnpjMask(event.target.value) }))}
              required
              disabled={isEdit}
            />
          </label>
          <label className="checkbox-inline">
            <input
              type="checkbox"
              checked={form.ativo}
              onChange={(event) => setForm((current) => ({ ...current, ativo: event.target.checked }))}
            />
            <span>Bancarizador ativo</span>
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            <span>Observação</span>
            <textarea
              value={form.observacao}
              onChange={(event) => setForm((current) => ({ ...current, observacao: event.target.value }))}
              rows={4}
            />
          </label>
        </div>
      </section>

      <div className="entity-actions">
        <button type="button" className="btn-muted" onClick={() => navigate('/cadastro/bancarizadores')}>
          Voltar
        </button>
        <button type="submit" className="btn-main" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  );

  const renderPlaceholderTab = (tab: Exclude<TabKey, 'bancarizador' | 'historico'>) => (
    <section className="entity-card">
      <header>
        <h3>{emptyStateMessageByTab[tab].title}</h3>
        <p>{emptyStateMessageByTab[tab].description}</p>
      </header>
      <div className="entity-loading">Aba disponível no layout e pronta para integração.</div>
    </section>
  );

  const renderHistoricoTab = () => (
    <section className="entity-card entity-form-stack">
      <header>
        <h3>Histórico de Auditoria</h3>
      </header>
      <div className="entity-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Ação</th>
              <th>Entidade</th>
              <th>Usuário</th>
              <th>Data</th>
              <th>TraceId</th>
            </tr>
          </thead>
          <tbody>
            {historicoPaged.items.map((item) => (
              <tr key={item.id}>
                <td>{item.acao}</td>
                <td>{item.entidade}</td>
                <td>{item.userEmail || '-'}</td>
                <td>{formatDateTime(item.createdAt)}</td>
                <td className="trace-id-cell" title={item.traceId}>{item.traceId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {historicoPaged.items.length === 0 ? <div className="entity-loading">Sem eventos para este bancarizador.</div> : null}
    </section>
  );

  const renderCurrentTab = () => {
    switch (activeTab) {
      case 'bancarizador':
        return renderBancarizadorTab();
      case 'contas':
        return renderPlaceholderTab('contas');
      case 'anexos':
        return renderPlaceholderTab('anexos');
      case 'observacoes':
        return renderPlaceholderTab('observacoes');
      case 'historico':
        return renderHistoricoTab();
      default:
        return null;
    }
  };

  return (
    <PageFrame
      title={currentTitle}
      subtitle={isEdit ? 'Edição completa com abas no padrão do legado.' : 'Criação em tela cheia para bancarizador.'}
      actions={
        <button className="btn-muted" onClick={() => navigate('/cadastro/bancarizadores')}>
          Voltar para listagem
        </button>
      }
    >
      <div className="entity-meta-bar">
        <span><strong>Pessoa:</strong> {pessoaId ?? 'Será vinculada automaticamente quando disponível'}</span>
        <span><strong>Documento:</strong> {formatCpfCnpj(form.documento)}</span>
      </div>

      <div className="entity-tabs" role="tablist" aria-label="Abas de cadastro do bancarizador">
        {tabs.map((tab) => {
          const disabled = !canAccessSubTabs && tab.key !== 'bancarizador';

          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              className={`entity-tab-btn ${activeTab === tab.key ? 'is-active' : ''}`}
              onClick={() => changeTab(tab.key)}
              disabled={disabled}
              aria-selected={activeTab === tab.key}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {loading ? <div className="entity-loading">Carregando cadastro...</div> : renderCurrentTab()}
    </PageFrame>
  );
};
