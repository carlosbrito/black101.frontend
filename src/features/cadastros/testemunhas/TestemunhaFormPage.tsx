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

type TabKey = 'testemunha' | 'complemento' | 'anexos' | 'observacoes' | 'historico';

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

type TestemunhaDto = {
  id: string;
  status?: number;
  pessoa?: PessoaDto;
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

const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';
const statusFromActive = (ativo: boolean) => (ativo ? 0 : 1);

export const TestemunhaFormPage = () => {
  const params = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
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
        if (testemunhaId) {
          const response = await http.get<TestemunhaDto>(`/api/testemunha/get/unique/${testemunhaId}`);
          const testemunha = response.data;
          applyPessoaOnForm(testemunha.pessoa, Number(testemunha.status ?? 0) === 0);
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
  }, [searchParams, testemunhaId]);

  useEffect(() => {
    if (!testemunhaId || activeTab !== 'historico') return;
    void loadHistorico(testemunhaId, historicoPaged.page);
  }, [activeTab, historicoPaged.page, testemunhaId]); // eslint-disable-line react-hooks/exhaustive-deps

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
      throw new Error('Não foi possível criar a pessoa da testemunha.');
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

      if (testemunhaId) {
        await http.put('/api/testemunha/update', {
          id: testemunhaId,
          status: statusFromActive(form.ativo),
        });
        toast.success('Testemunha atualizada.');
      } else {
        const response = await http.post('/api/testemunha/register', { pessoaId: resolvedPessoaId });
        const created = response.data as Record<string, unknown>;
        const createdId = String(created.id ?? created.Id ?? response.data ?? '');
        if (!createdId) {
          throw new Error('Não foi possível criar a testemunha.');
        }

        if (!form.ativo) {
          await http.put('/api/testemunha/update', {
            id: createdId,
            status: statusFromActive(false),
          });
        }

        toast.success('Testemunha criada.');
        navigate(`/cadastro/testemunhas/${createdId}`, { replace: true });
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const currentTitle = useMemo(
    () => (isEdit ? `Testemunha: ${form.nome || 'Editar'}` : 'Nova Testemunha'),
    [form.nome, isEdit],
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
