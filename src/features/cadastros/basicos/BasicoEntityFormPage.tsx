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
  type CadastroArquivoDto,
  type CadastroObservacaoDto,
  type HistoricoItemDto,
} from '../cadastroCommon';
import '../cadastro.css';
import '../administradoras/entity-form.css';

type TabKey = 'cadastro' | 'complemento' | 'anexos' | 'observacoes' | 'historico';

type BasicoDto = {
  id: string;
  nome: string;
  codigo?: string | null;
  documento?: string | null;
  email?: string | null;
  telefone?: string | null;
  cidade?: string | null;
  uf?: string | null;
  ativo: boolean;
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
  endpoint: string;
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

export const BasicoEntityFormPage = ({ title, endpoint, listRoute, singularLabel }: Props) => {
  const params = useParams<{ id: string }>();
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

  const [anexosRows, setAnexosRows] = useState<CadastroArquivoDto[]>([]);
  const [anexoFile, setAnexoFile] = useState<File | null>(null);
  const [observacoesRows, setObservacoesRows] = useState<CadastroObservacaoDto[]>([]);
  const [textoObservacao, setTextoObservacao] = useState('');
  const [historicoPaged, setHistoricoPaged] = useState({
    items: [] as HistoricoItemDto[],
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 1,
  });

  const canAccessSubTabs = isEdit;

  const loadSubTabs = async (id: string) => {
    const [anexosRes, observacoesRes, historicoRes] = await Promise.all([
      http.get(`${endpoint}/${id}/anexos`),
      http.get(`${endpoint}/${id}/observacoes`),
      http.get(`${endpoint}/${id}/historico`, { params: { page: 1, pageSize: 20 } }),
    ]);

    setAnexosRows((anexosRes.data as CadastroArquivoDto[]) ?? []);
    setObservacoesRows((observacoesRes.data as CadastroObservacaoDto[]) ?? []);
    setHistoricoPaged(readPagedResponse<HistoricoItemDto>(historicoRes.data));
  };

  const loadHistorico = async (id: string, page: number) => {
    const historicoRes = await http.get(`${endpoint}/${id}/historico`, {
      params: {
        page,
        pageSize: historicoPaged.pageSize,
      },
    });

    setHistoricoPaged(readPagedResponse<HistoricoItemDto>(historicoRes.data));
  };
  useEffect(() => {
    const bootstrap = async () => {
      if (!cadastroId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await http.get(`${endpoint}/${cadastroId}`);
        const item = response.data as BasicoDto;

        setForm({
          nome: item.nome ?? '',
          documento: applyCpfCnpjMask(item.documento ?? ''),
          email: item.email ?? '',
          telefone: applyPhoneMask(item.telefone ?? ''),
          cidade: item.cidade ?? '',
          uf: item.uf ?? '',
          ativo: item.ativo,
        });

        await loadSubTabs(cadastroId);
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!cadastroId || activeTab !== 'historico') return;
    void loadHistorico(cadastroId, historicoPaged.page);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const ensureValidForm = () => {
    if (!form.nome.trim()) {
      toast.error(`Informe o nome de ${singularLabel.toLowerCase()}.`);
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
        cidade: form.cidade.trim() || null,
        uf: form.uf.trim() || null,
        ativo: form.ativo,
      };

      if (cadastroId) {
        await http.put(`${endpoint}/${cadastroId}`, payload);
        toast.success(`${singularLabel} atualizado(a).`);
      } else {
        const response = await http.post(endpoint, payload);
        const created = response.data as { id: string };
        toast.success(`${singularLabel} criado(a).`);
        navigate(`${listRoute}/${created.id}`, { replace: true });
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const addAnexo = async () => {
    if (!cadastroId || !anexoFile) {
      toast.error('Selecione um arquivo.');
      return;
    }

    try {
      const data = new FormData();
      data.append('file', anexoFile);
      await http.post(`${endpoint}/${cadastroId}/anexos`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setAnexoFile(null);
      await loadSubTabs(cadastroId);
      toast.success('Anexo incluído.');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const removeAnexo = async (anexoId: string) => {
    if (!cadastroId || !window.confirm('Remover anexo?')) return;

    try {
      await http.delete(`${endpoint}/${cadastroId}/anexos/${anexoId}`);
      await loadSubTabs(cadastroId);
      toast.success('Anexo removido.');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const addObservacao = async () => {
    if (!cadastroId || !textoObservacao.trim()) return;

    try {
      await http.post(`${endpoint}/${cadastroId}/observacoes`, { texto: textoObservacao.trim() });
      setTextoObservacao('');
      await loadSubTabs(cadastroId);
      toast.success('Observação adicionada.');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const removeObservacao = async (observacaoId: string) => {
    if (!cadastroId || !window.confirm('Remover observação?')) return;

    try {
      await http.delete(`${endpoint}/${cadastroId}/observacoes/${observacaoId}`);
      await loadSubTabs(cadastroId);
      toast.success('Observação removida.');
    } catch (error) {
      toast.error(getErrorMessage(error));
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
            />
            <span>Registro ativo</span>
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
        <p>Aba preparada para regras específicas do módulo legado desta entidade.</p>
      </header>
      <div className="entity-loading">Estrutura da aba pronta para integração incremental.</div>
    </section>
  );

  const renderAnexosTab = () => (
    <section className="entity-card entity-form-stack">
      <header>
        <h3>Anexos</h3>
      </header>
      <div className="entity-grid cols-3">
        <label>
          <span>Arquivo</span>
          <input type="file" onChange={(event) => setAnexoFile(event.target.files?.[0] ?? null)} />
        </label>
        <button type="button" className="btn-main" onClick={() => void addAnexo()}>Enviar anexo</button>
      </div>

      <section className="entity-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Arquivo</th>
              <th>Tipo</th>
              <th>Tamanho</th>
              <th>Data</th>
              <th className="col-actions">Ações</th>
            </tr>
          </thead>
          <tbody>
            {anexosRows.map((item) => (
              <tr key={item.id}>
                <td>{item.nomeArquivo}</td>
                <td>{item.contentType}</td>
                <td>{item.tamanhoBytes}</td>
                <td>{formatDateTime(item.createdAt)}</td>
                <td className="col-actions">
                  <div className="table-actions">
                    <button type="button" className="danger" onClick={() => void removeAnexo(item.id)}>
                      Remover
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {anexosRows.length === 0 ? (
              <tr>
                <td colSpan={5}>Nenhum anexo cadastrado.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </section>
  );

  const renderObservacoesTab = () => (
    <section className="entity-card entity-form-stack">
      <header>
        <h3>Observações</h3>
      </header>
      <div className="entity-grid cols-3">
        <label className="full-width">
          <span>Nova observação</span>
          <textarea value={textoObservacao} onChange={(event) => setTextoObservacao(event.target.value)} rows={4} />
        </label>
        <button type="button" className="btn-main" onClick={() => void addObservacao()}>Adicionar observação</button>
      </div>

      <section className="entity-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Autor</th>
              <th>Data</th>
              <th>Texto</th>
              <th className="col-actions">Ações</th>
            </tr>
          </thead>
          <tbody>
            {observacoesRows.map((item) => (
              <tr key={item.id}>
                <td>{item.autorEmail || '-'}</td>
                <td>{formatDateTime(item.createdAt)}</td>
                <td>{item.texto}</td>
                <td className="col-actions">
                  <div className="table-actions">
                    <button type="button" className="danger" onClick={() => void removeObservacao(item.id)}>
                      Remover
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {observacoesRows.length === 0 ? (
              <tr>
                <td colSpan={4}>Nenhuma observação cadastrada.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </section>
  );

  const renderHistoricoTab = () => (
    <section className="entity-card entity-form-stack">
      <header>
        <h3>Histórico de Auditoria</h3>
      </header>
      <section className="entity-table-wrap">
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
            {historicoPaged.items.length === 0 ? (
              <tr>
                <td colSpan={5}>Sem eventos para este cadastro.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
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


