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

type TabKey = 'testemunha' | 'complemento' | 'anexos' | 'observacoes' | 'historico';

type TestemunhaDto = {
  id: string;
  pessoaId: string;
  nome: string;
  documento: string;
  email?: string | null;
  telefone?: string | null;
  ativo: boolean;
};

type TestemunhaFormState = {
  nome: string;
  documento: string;
  email: string;
  telefone: string;
  ativo: boolean;
};

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'testemunha', label: 'Testemunha' },
  { key: 'complemento', label: 'Complemento' },
  { key: 'anexos', label: 'Anexos' },
  { key: 'observacoes', label: 'Observações' },
  { key: 'historico', label: 'Histórico' },
];

const emptyStateMessageByTab: Record<Exclude<TabKey, 'testemunha' | 'historico'>, { title: string; description: string }> = {
  complemento: {
    title: 'Complemento',
    description: 'A aba de complemento foi preparada e será conectada à API específica na próxima etapa.',
  },
  anexos: {
    title: 'Anexos',
    description: 'Aba de anexos preparada no padrão do legado para integração futura.',
  },
  observacoes: {
    title: 'Observações',
    description: 'Aba de observações pronta para receber a integração dedicada.',
  },
};

export const TestemunhaFormPage = () => {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const testemunhaId = params.id;
  const isEdit = !!testemunhaId;

  const [loading, setLoading] = useState<boolean>(isEdit);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('testemunha');
  const [pessoaId, setPessoaId] = useState<string | null>(null);
  const [form, setForm] = useState<TestemunhaFormState>({
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
          entity: 'Testemunha',
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
      if (!testemunhaId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await http.get(`/cadastros/testemunhas/${testemunhaId}`);
        const testemunha = response.data as TestemunhaDto;
        setPessoaId(testemunha.pessoaId);
        setForm({
          nome: testemunha.nome ?? '',
          documento: applyCpfCnpjMask(testemunha.documento ?? ''),
          email: testemunha.email ?? '',
          telefone: applyPhoneMask(testemunha.telefone ?? ''),
          ativo: testemunha.ativo,
        });
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, [testemunhaId]);

  useEffect(() => {
    if (!testemunhaId || activeTab !== 'historico') return;
    void loadHistorico(testemunhaId, historicoPaged.page);
  }, [testemunhaId, activeTab]);

  const ensureValidForm = () => {
    if (!form.nome.trim()) {
      toast.error('Informe o nome da testemunha.');
      return false;
    }

    if (!isValidCpfCnpj(form.documento)) {
      toast.error('Informe um CPF/CNPJ válido.');
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
        email: form.email.trim() || null,
        telefone: form.telefone.trim() || null,
        ativo: form.ativo,
      };

      if (testemunhaId) {
        await http.put(`/cadastros/testemunhas/${testemunhaId}`, payload);
        toast.success('Testemunha atualizada.');
      } else {
        const response = await http.post('/cadastros/testemunhas', payload);
        const created = response.data as { id: string };
        toast.success('Testemunha criada.');
        navigate(`/cadastro/testemunhas/${created.id}`, { replace: true });
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const currentTitle = useMemo(
    () => (isEdit ? `Testemunha: ${form.nome || 'Editar'}` : 'Nova Testemunha'),
    [isEdit, form.nome],
  );

  const changeTab = (key: TabKey) => {
    if (!canAccessSubTabs && key !== 'testemunha') {
      toast('Salve a testemunha para liberar as abas complementares.');
      return;
    }

    setActiveTab(key);
  };

  const renderTestemunhaTab = () => (
    <form className="entity-form-stack" onSubmit={onSave}>
      <section className="entity-card">
        <header>
          <h3>Dados da Testemunha</h3>
          <p>Cadastro em tela inteira no padrão de abas do sistema legado.</p>
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
            <span>Testemunha ativa</span>
          </label>
          <label>
            <span>E-mail</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
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
        <button type="button" className="btn-muted" onClick={() => navigate('/cadastro/testemunhas')}>
          Voltar
        </button>
        <button type="submit" className="btn-main" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  );

  const renderPlaceholderTab = (tab: Exclude<TabKey, 'testemunha' | 'historico'>) => (
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

      {historicoPaged.items.length === 0 ? <div className="entity-loading">Sem eventos para esta testemunha.</div> : null}
    </section>
  );

  const renderCurrentTab = () => {
    switch (activeTab) {
      case 'testemunha':
        return renderTestemunhaTab();
      case 'complemento':
        return renderPlaceholderTab('complemento');
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
      subtitle={isEdit ? 'Edição completa com abas no padrão do legado.' : 'Criação em tela cheia para testemunha.'}
      actions={
        <button className="btn-muted" onClick={() => navigate('/cadastro/testemunhas')}>
          Voltar para listagem
        </button>
      }
    >
      <div className="entity-meta-bar">
        <span><strong>Pessoa:</strong> {pessoaId ?? 'Será vinculada automaticamente'}</span>
        <span><strong>Documento:</strong> {formatCpfCnpj(form.documento)}</span>
      </div>

      <div className="entity-tabs" role="tablist" aria-label="Abas de cadastro da testemunha">
        {tabs.map((tab) => {
          const disabled = !canAccessSubTabs && tab.key !== 'testemunha';

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
