import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getErrorMessage, http } from '../../../shared/api/http';
import { PageFrame } from '../../../shared/ui/PageFrame';
import {
  applyCpfCnpjMask,
  applyPhoneMask,
  formatCpfCnpj,
  formatDateTime,
  isValidCpfCnpj,
  isValidPhone,
  readPagedResponse,
  sanitizeDocument,
  type HistoricoItemDto,
} from '../cadastroCommon';
import '../cadastro.css';
import '../administradoras/entity-form.css';

type TabKey = 'agente' | 'comissoes' | 'anexos' | 'observacoes' | 'historico';

type AgenteDto = {
  id: string;
  pessoaId: string;
  nome: string;
  documento: string;
  email: string;
  telefone?: string | null;
  ativo: boolean;
};

type AgenteFormState = {
  nome: string;
  documento: string;
  email: string;
  telefone: string;
  ativo: boolean;
};

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'agente', label: 'Agente' },
  { key: 'comissoes', label: 'Comissões' },
  { key: 'anexos', label: 'Anexos' },
  { key: 'observacoes', label: 'Observações' },
  { key: 'historico', label: 'Histórico' },
];

const emptyStateMessageByTab: Record<Exclude<TabKey, 'agente' | 'historico'>, { title: string; description: string }> = {
  comissoes: {
    title: 'Comissões',
    description: 'A estrutura desta aba já está pronta e será conectada aos endpoints de comissão na próxima etapa.',
  },
  anexos: {
    title: 'Anexos',
    description: 'A aba de anexos foi espelhada do legado e está preparada para integrar upload/download.',
  },
  observacoes: {
    title: 'Observações',
    description: 'A aba de observações foi criada no modelo legado e será conectada ao backend específico.',
  },
};

export const AgenteFormPage = () => {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const agenteId = params.id;
  const isEdit = !!agenteId;

  const [loading, setLoading] = useState<boolean>(isEdit);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('agente');
  const [pessoaId, setPessoaId] = useState<string | null>(null);
  const [form, setForm] = useState<AgenteFormState>({
    nome: '',
    documento: '',
    email: '',
    telefone: '',
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
          entity: 'Agente',
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
      if (!agenteId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await http.get(`/cadastros/agentes/${agenteId}`);
        const agente = response.data as AgenteDto;
        setPessoaId(agente.pessoaId);
        setForm({
          nome: agente.nome ?? '',
          documento: applyCpfCnpjMask(agente.documento ?? ''),
          email: agente.email ?? '',
          telefone: applyPhoneMask(agente.telefone ?? ''),
          ativo: agente.ativo,
        });
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, [agenteId]);

  useEffect(() => {
    if (!agenteId || activeTab !== 'historico') return;
    void loadHistorico(agenteId, historicoPaged.page);
  }, [agenteId, activeTab]);

  const ensureValidForm = () => {
    if (!form.nome.trim()) {
      toast.error('Informe o nome do agente.');
      return false;
    }

    if (!isValidCpfCnpj(form.documento)) {
      toast.error('Informe um CPF/CNPJ válido.');
      return false;
    }

    if (!form.email.trim()) {
      toast.error('Informe o e-mail do agente.');
      return false;
    }

    if (form.telefone.trim() && !isValidPhone(form.telefone)) {
      toast.error('Informe um telefone válido com DDD.');
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
      const payload = {
        nome: form.nome.trim(),
        documento: sanitizeDocument(form.documento),
        email: form.email.trim(),
        telefone: form.telefone.trim() || null,
        ativo: form.ativo,
      };

      if (agenteId) {
        await http.put(`/cadastros/agentes/${agenteId}`, payload);
        toast.success('Agente atualizado.');
      } else {
        const response = await http.post('/cadastros/agentes', payload);
        const created = response.data as { id: string };
        toast.success('Agente criado.');
        navigate(`/cadastro/agentes/${created.id}`, { replace: true });
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const currentTitle = useMemo(
    () => (isEdit ? `Agente: ${form.nome || 'Editar'}` : 'Novo Agente'),
    [isEdit, form.nome],
  );

  const changeTab = (key: TabKey) => {
    if (!canAccessSubTabs && key !== 'agente') {
      toast('Salve o agente para liberar as abas complementares.');
      return;
    }

    setActiveTab(key);
  };

  const renderAgenteTab = () => (
    <form className="entity-form-stack" onSubmit={onSave}>
      <section className="entity-card">
        <header>
          <h3>Dados do Agente</h3>
          <p>Cadastro principal no formato de tela inteira, sem modal.</p>
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
            <span>CPF/CNPJ</span>
            <input
              value={form.documento}
              onChange={(event) => setForm((current) => ({ ...current, documento: applyCpfCnpjMask(event.target.value) }))}
              required
            />
          </label>
          <label className="checkbox-inline">
            <input
              type="checkbox"
              checked={form.ativo}
              onChange={(event) => setForm((current) => ({ ...current, ativo: event.target.checked }))}
            />
            <span>Agente ativo</span>
          </label>
          <label>
            <span>E-mail</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              required
            />
          </label>
          <label>
            <span>Telefone</span>
            <input
              value={form.telefone}
              onChange={(event) => setForm((current) => ({ ...current, telefone: applyPhoneMask(event.target.value) }))}
            />
          </label>
        </div>
      </section>

      <div className="entity-actions">
        <button type="button" className="btn-muted" onClick={() => navigate('/cadastro/agentes')}>
          Voltar
        </button>
        <button type="submit" className="btn-main" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  );

  const renderPlaceholderTab = (tab: Exclude<TabKey, 'agente' | 'historico'>) => (
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

      {historicoPaged.items.length === 0 ? <div className="entity-loading">Sem eventos para este agente.</div> : null}
    </section>
  );

  const renderCurrentTab = () => {
    switch (activeTab) {
      case 'agente':
        return renderAgenteTab();
      case 'comissoes':
        return renderPlaceholderTab('comissoes');
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
      subtitle={isEdit ? 'Edição completa com abas no padrão do legado.' : 'Criação em tela cheia conforme padrão de administradora.'}
      actions={
        <button className="btn-muted" onClick={() => navigate('/cadastro/agentes')}>
          Voltar para listagem
        </button>
      }
    >
      <div className="entity-meta-bar">
        <span><strong>Pessoa:</strong> {pessoaId ?? 'Será vinculada automaticamente'}</span>
        <span><strong>Documento:</strong> {formatCpfCnpj(form.documento)}</span>
      </div>

      <div className="entity-tabs" role="tablist" aria-label="Abas de cadastro do agente">
        {tabs.map((tab) => {
          const disabled = !canAccessSubTabs && tab.key !== 'agente';

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
