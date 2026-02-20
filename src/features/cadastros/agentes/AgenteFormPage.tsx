import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
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

type PessoaContatoDto = {
  email?: string | null;
  telefone1?: string | null;
  telefone2?: string | null;
};

type PessoaDto = {
  id?: string;
  nome?: string;
  cnpjCpf?: string;
  contatos?: PessoaContatoDto[];
};

type AgenteDto = {
  id: string;
  status?: number;
  pessoa?: PessoaDto;
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

const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';

const statusFromActive = (ativo: boolean) => (ativo ? 0 : 1);

export const AgenteFormPage = () => {
  const params = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
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

  const applyPessoaOnForm = (pessoa: PessoaDto | undefined, ativo = true) => {
    const contato = pessoa?.contatos?.[0];
    setPessoaId(pessoa?.id ?? null);
    setForm((current) => ({
      ...current,
      nome: pessoa?.nome ?? '',
      documento: applyCpfCnpjMask(pessoa?.cnpjCpf ?? ''),
      email: contato?.email ?? '',
      telefone: applyPhoneMask(contato?.telefone1 ?? contato?.telefone2 ?? ''),
      ativo,
    }));
  };

  useEffect(() => {
    const bootstrap = async () => {
      setLoading(true);
      try {
        if (agenteId) {
          const response = await http.get<AgenteDto>(`/api/agente/get/unique/${agenteId}`);
          const agente = response.data;
          applyPessoaOnForm(agente.pessoa, Number(agente.status ?? 0) === 0);
          return;
        }

        const documento = sanitizeDocument(searchParams.get('documento') ?? '');
        if (!documento) {
          setLoading(false);
          return;
        }

        setForm((current) => ({ ...current, documento: applyCpfCnpjMask(documento) }));
        const pessoaResponse = await http.get<PessoaDto>(`/api/pessoa/get/cnpjcpf/${documento}`, {
          params: { enrichData: false, fazerConsultaPadrao: false, isToGetQSA: false },
        });
        const pessoa = pessoaResponse.data;

        if (pessoa?.id && pessoa.id !== EMPTY_GUID) {
          applyPessoaOnForm(pessoa, true);
        }
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, [agenteId, searchParams]);

  useEffect(() => {
    if (!agenteId || activeTab !== 'historico') return;
    void loadHistorico(agenteId, historicoPaged.page);
  }, [activeTab, agenteId, historicoPaged.page]); // eslint-disable-line react-hooks/exhaustive-deps

  const ensureValidForm = () => {
    if (!form.nome.trim()) {
      toast.error('Informe o nome do agente.');
      return false;
    }

    if (!isValidCpfCnpj(form.documento)) {
      toast.error('Informe um CPF/CNPJ válido.');
      return false;
    }

    if (form.email.trim() && !form.email.includes('@')) {
      toast.error('Informe um e-mail válido.');
      return false;
    }

    if (form.telefone.trim() && !isValidPhone(form.telefone)) {
      toast.error('Informe um telefone válido com DDD.');
      return false;
    }

    return true;
  };

  const upsertPessoa = async (): Promise<string> => {
    const documento = sanitizeDocument(form.documento);

    const pessoaByDocumentResponse = await http.get<PessoaDto>(`/api/pessoa/get/cnpjcpf/${documento}`, {
      params: { enrichData: false, fazerConsultaPadrao: false, isToGetQSA: false },
    });

    const found = pessoaByDocumentResponse.data;
    const foundId = found?.id && found.id !== EMPTY_GUID ? found.id : null;

    const payload = {
      nome: form.nome.trim(),
      cnpjCpf: documento,
      contatos: [
        {
          nome: form.nome.trim(),
          email: form.email.trim() || null,
          telefone1: sanitizeDocument(form.telefone) || null,
          telefone2: null,
          observacoes: null,
        },
      ],
    };

    if (foundId) {
      await http.put('/api/pessoa/update', { id: foundId, ...payload });
      return foundId;
    }

    const createResponse = await http.post('/api/pessoa/register', payload);
    const created = createResponse.data as Record<string, unknown>;
    const createdId = String(created.id ?? created.Id ?? '');

    if (!createdId) {
      throw new Error('Não foi possível criar a pessoa do agente.');
    }

    return createdId;
  };

  const onSave = async (event: FormEvent) => {
    event.preventDefault();

    if (!ensureValidForm()) {
      return;
    }

    setSaving(true);

    try {
      const resolvedPessoaId = await upsertPessoa();
      setPessoaId(resolvedPessoaId);

      if (agenteId) {
        await http.put('/api/agente/update', {
          id: agenteId,
          status: statusFromActive(form.ativo),
        });
        toast.success('Agente atualizado.');
      } else {
        const response = await http.post('/api/agente/register', { pessoaId: resolvedPessoaId });
        const created = response.data as Record<string, unknown>;
        const createdId = String(created.id ?? created.Id ?? response.data ?? '');
        if (!createdId) {
          throw new Error('Não foi possível criar o agente.');
        }

        if (!form.ativo) {
          await http.put('/api/agente/update', {
            id: createdId,
            status: statusFromActive(false),
          });
        }

        toast.success('Agente criado.');
        navigate(`/cadastro/agentes/${createdId}`, { replace: true });
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
