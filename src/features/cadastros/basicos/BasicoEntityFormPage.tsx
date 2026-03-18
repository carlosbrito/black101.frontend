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
  isValidCpfCnpj,
  isValidPhone,
  sanitizeDocument,
} from '../cadastroCommon';
import type { BasicoEntityApi } from './entityApi';
import { buildEntityPath } from './entityApi';
import '../cadastro.css';
import '../administradoras/entity-form.css';

type TabKey = 'cadastro' | 'complemento' | 'anexos' | 'observacoes' | 'historico';

type BasicoDto = {
  id: string;
  status?: number;
  pessoa?: {
    id?: string;
    nome?: string;
    cnpjCpf?: string;
    cidade?: string | null;
    uf?: string | null;
    contatos?: Array<{
      email?: string | null;
      telefone1?: string | null;
      telefone2?: string | null;
    }>;
  };
  dadosPrestador?: {
    nome?: string;
    cnpjCpf?: string;
  };
  contatos?: Array<{
    email?: string | null;
    telefone1?: string | null;
    telefone2?: string | null;
  }>;
  pessoaId?: string;
};

type BasicoFormState = {
  nome: string;
  documento: string;
  email: string;
  telefone: string;
  cidade: string;
  uf: string;
  ativo: boolean;
};

type Props = {
  title: string;
  api: BasicoEntityApi;
  listRoute: string;
  singularLabel: string;
};

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'cadastro', label: 'Cadastro' },
  { key: 'complemento', label: 'Complemento' },
  { key: 'anexos', label: 'Anexos' },
  { key: 'observacoes', label: 'Observações' },
  { key: 'historico', label: 'Histórico' },
];

const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';

const statusFromActive = (ativo: boolean) => (ativo ? 0 : 1);

export const BasicoEntityFormPage = ({ title, api, listRoute, singularLabel }: Props) => {
  const params = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const cadastroId = params.id;
  const isEdit = !!cadastroId;

  const [loading, setLoading] = useState<boolean>(isEdit);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('cadastro');
  const [form, setForm] = useState<BasicoFormState>({
    nome: '',
    documento: '',
    email: '',
    telefone: '',
    cidade: '',
    uf: '',
    ativo: true,
  });
  const [pessoaId, setPessoaId] = useState<string | null>(null);
  const isPrestador = api.key === 'prestador';

  const canAccessSubTabs = isEdit;

  const applyPessoaOnForm = (item: BasicoDto) => {
    const pessoa = item.pessoa ?? {
      id: item.pessoaId,
      nome: item.dadosPrestador?.nome,
      cnpjCpf: item.dadosPrestador?.cnpjCpf,
      contatos: item.contatos,
    };
    const contato = pessoa?.contatos?.[0];
    setPessoaId(pessoa?.id ?? item.pessoaId ?? null);
    setForm({
      nome: pessoa?.nome ?? '',
      documento: applyCpfCnpjMask(pessoa?.cnpjCpf ?? ''),
      email: contato?.email ?? '',
      telefone: applyPhoneMask(contato?.telefone1 ?? contato?.telefone2 ?? ''),
      cidade: pessoa?.cidade ?? '',
      uf: pessoa?.uf ?? '',
      ativo: api.supportsStatus ? Number(item.status ?? 0) === 0 : true,
    });
  };

  useEffect(() => {
    const bootstrap = async () => {
      setLoading(true);
      try {
        if (cadastroId) {
          const response = await http.get<BasicoDto>(buildEntityPath(api, api.uniquePath, cadastroId));
          applyPessoaOnForm(response.data);
          return;
        }

        const documento = sanitizeDocument(searchParams.get('documento') ?? '');
        if (!documento) return;

        setForm((current) => ({ ...current, documento: applyCpfCnpjMask(documento) }));
        const pessoaResponse = await http.get<{ id?: string; nome?: string; cnpjCpf?: string }>(`/api/pessoa/get/cnpjcpf/${documento}`, {
          params: { enrichData: false, fazerConsultaPadrao: false, isToGetQSA: false },
        });
        const pessoa = pessoaResponse.data;
        if (pessoa?.id && pessoa.id !== EMPTY_GUID) {
          setPessoaId(pessoa.id);
          setForm((current) => ({
            ...current,
            nome: pessoa.nome ?? current.nome,
            documento: applyCpfCnpjMask(pessoa.cnpjCpf ?? current.documento),
          }));
        }
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, [api, cadastroId, searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const ensureValidForm = () => {
    if (!form.nome.trim()) {
      toast.error(`Informe o nome de ${singularLabel.toLowerCase()}.`);
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

  const upsertPessoa = async () => {
    const documento = sanitizeDocument(form.documento);
    const pessoaByDocumentResponse = await http.get<{ id?: string }>(`/api/pessoa/get/cnpjcpf/${documento}`, {
      params: { enrichData: false, fazerConsultaPadrao: false, isToGetQSA: false },
    });
    const found = pessoaByDocumentResponse.data;
    const foundId = found?.id && found.id !== EMPTY_GUID ? found.id : null;

    const payload = {
      nome: form.nome.trim(),
      cnpjCpf: documento,
      cidade: form.cidade.trim() || null,
      uf: form.uf.trim() || null,
      contatos: [{
        nome: form.nome.trim(),
        email: form.email.trim() || null,
        telefone1: sanitizeDocument(form.telefone) || null,
        telefone2: null,
      }],
    };

    if (foundId) {
      await http.put('/api/pessoa/update', { id: foundId, ...payload });
      return foundId;
    }

    const createResponse = await http.post('/api/pessoa/register', payload);
    const created = createResponse.data as Record<string, unknown>;
    const createdId = String(created.id ?? created.Id ?? '');
    if (!createdId) {
      throw new Error(`Não foi possível criar a pessoa de ${singularLabel.toLowerCase()}.`);
    }

    return createdId;
  };

  const onSave = async (event: FormEvent) => {
    event.preventDefault();

    if (!ensureValidForm()) return;

    setSaving(true);
    try {
      const resolvedPessoaId = await upsertPessoa();
      setPessoaId(resolvedPessoaId);

      if (cadastroId) {
        if (api.updatePath) {
          await http.put(buildEntityPath(api, api.updatePath), {
            id: cadastroId,
            ...(api.supportsStatus ? { status: statusFromActive(form.ativo) } : {}),
          });
        }
        toast.success(`${singularLabel} atualizado(a).`);
        return;
      }

      const response = isPrestador
        ? await http.post(buildEntityPath(api, api.registerPath), (() => {
          const data = new FormData();
          data.append('cnpjCpf', sanitizeDocument(form.documento));
          return data;
        })())
        : await http.post(buildEntityPath(api, api.registerPath), { pessoaId: resolvedPessoaId });
      const created = response.data as Record<string, unknown>;
      const createdId = String(created.id ?? created.Id ?? response.data ?? '');
      if (!createdId && !isPrestador) {
        throw new Error(`Não foi possível criar ${singularLabel.toLowerCase()}.`);
      }

      if (api.supportsStatus && api.updatePath && !form.ativo) {
        await http.put(buildEntityPath(api, api.updatePath), { id: createdId, status: statusFromActive(false) });
      }

      toast.success(`${singularLabel} criado(a).`);
      navigate(createdId ? `${listRoute}/${createdId}` : listRoute, { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const currentTitle = useMemo(
    () => (isEdit ? `${title}: ${form.nome || 'Editar'}` : `Novo(a) ${singularLabel}`),
    [isEdit, title, form.nome, singularLabel],
  );

  const changeTab = (key: TabKey) => {
    if (!canAccessSubTabs && key !== 'cadastro') {
      toast(`Salve ${singularLabel.toLowerCase()} para liberar as abas complementares.`);
      return;
    }

    setActiveTab(key);
  };

  const renderCadastroTab = () => (
    <form className="entity-form-stack" onSubmit={onSave}>
      <section className="entity-card">
        <header>
          <h3>Dados Cadastrais</h3>
          <p>Cadastro principal em tela inteira com conceito de abas do legado.</p>
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
              disabled={!api.supportsStatus}
            />
            <span>{api.supportsStatus ? 'Registro ativo' : 'Ativo (somente visual)'}</span>
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
          <label>
            <span>Cidade</span>
            <input
              value={form.cidade}
              onChange={(event) => setForm((current) => ({ ...current, cidade: event.target.value }))}
            />
          </label>
          <label>
            <span>UF</span>
            <input
              maxLength={2}
              value={form.uf}
              onChange={(event) => setForm((current) => ({ ...current, uf: event.target.value.toUpperCase() }))}
            />
          </label>
        </div>
      </section>

      <div className="entity-actions">
        <button type="button" className="btn-muted" onClick={() => navigate(listRoute)}>
          Voltar
        </button>
        <button type="submit" className="btn-main" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  );

  const renderComplementoTab = () => (
    <section className="entity-card">
      <header>
        <h3>Complemento</h3>
        <p>Estrutura preservada para evolução incremental sem bloquear o cadastro principal.</p>
      </header>
      <div className="entity-loading">Aba pronta para conexão com endpoints específicos.</div>
    </section>
  );

  const renderAnexosTab = () => (
    <section className="entity-card">
      <header>
        <h3>Anexos</h3>
        <p>Fluxo principal migrado; integração de anexos será adicionada por entidade quando aplicável.</p>
      </header>
      <div className="entity-loading">Sem endpoint genérico para anexos nesta entidade.</div>
    </section>
  );

  const renderObservacoesTab = () => (
    <section className="entity-card">
      <header>
        <h3>Observações</h3>
        <p>Aba mantida para paridade visual do legado.</p>
      </header>
      <div className="entity-loading">Sem endpoint genérico para observações nesta entidade.</div>
    </section>
  );

  const renderHistoricoTab = () => (
    <section className="entity-card">
      <header>
        <h3>Histórico de Auditoria</h3>
        <p>Histórico detalhado por entidade será conectado em etapa específica.</p>
      </header>
      <div className="entity-loading">Aba disponível no layout para evolução incremental.</div>
    </section>
  );

  const renderCurrentTab = () => {
    switch (activeTab) {
      case 'cadastro':
        return renderCadastroTab();
      case 'complemento':
        return renderComplementoTab();
      case 'anexos':
        return renderAnexosTab();
      case 'observacoes':
        return renderObservacoesTab();
      case 'historico':
        return renderHistoricoTab();
      default:
        return null;
    }
  };

  return (
    <PageFrame
      title={currentTitle}
      subtitle={isEdit ? 'Edição completa em tela cheia com abas no padrão do legado.' : 'Cadastro em tela cheia com abas.'}
      actions={
        <button className="btn-muted" onClick={() => navigate(listRoute)}>
          Voltar para listagem
        </button>
      }
    >
      <div className="entity-meta-bar">
        <span><strong>ID:</strong> {cadastroId ?? 'novo'}</span>
        <span><strong>Pessoa:</strong> {pessoaId ?? 'será vinculada no salvamento'}</span>
        <span><strong>Documento:</strong> {formatCpfCnpj(form.documento)}</span>
      </div>

      <div className="entity-tabs" role="tablist" aria-label={`Abas de cadastro de ${singularLabel.toLowerCase()}`}>
        {tabs.map((tab) => {
          const disabled = !canAccessSubTabs && tab.key !== 'cadastro';

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


