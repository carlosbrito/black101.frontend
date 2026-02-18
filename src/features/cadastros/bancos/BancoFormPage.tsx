import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getErrorMessage, http } from '../../../shared/api/http';
import { PageFrame } from '../../../shared/ui/PageFrame';
import { formatDateTime, readPagedResponse, type HistoricoItemDto } from '../cadastroCommon';
import '../cadastro.css';
import '../administradoras/entity-form.css';

type TabKey = 'banco' | 'layoutExtrato' | 'historico';

type BancoDto = {
  id: string;
  nome: string;
  codigo: string;
  ativo: boolean;
};

type BancoFormState = {
  nome: string;
  codigo: string;
  ativo: boolean;
};

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'banco', label: 'Banco' },
  { key: 'layoutExtrato', label: 'Layout de Extrato' },
  { key: 'historico', label: 'Histórico' },
];

export const BancoFormPage = () => {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const bancoId = params.id;
  const isEdit = !!bancoId;

  const [loading, setLoading] = useState<boolean>(isEdit);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('banco');
  const [form, setForm] = useState<BancoFormState>({
    nome: '',
    codigo: '',
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
          entity: 'Banco',
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
      if (!bancoId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await http.get(`/cadastros/bancos/${bancoId}`);
        const banco = response.data as BancoDto;
        setForm({
          nome: banco.nome ?? '',
          codigo: banco.codigo ?? '',
          ativo: banco.ativo,
        });
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!bancoId || activeTab !== 'historico') return;
    void loadHistorico(bancoId, historicoPaged.page);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const ensureValidForm = () => {
    if (!form.nome.trim()) {
      toast.error('Informe o nome do banco.');
      return false;
    }

    if (!form.codigo.trim()) {
      toast.error('Informe o código do banco.');
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
        codigo: form.codigo.trim(),
        ativo: form.ativo,
      };

      if (bancoId) {
        await http.put(`/cadastros/bancos/${bancoId}`, payload);
        toast.success('Banco atualizado.');
      } else {
        const response = await http.post('/cadastros/bancos', payload);
        const created = response.data as { id: string };
        toast.success('Banco criado.');
        navigate(`/cadastro/bancos/${created.id}`, { replace: true });
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const currentTitle = useMemo(
    () => (isEdit ? `Banco: ${form.nome || 'Editar'}` : 'Novo Banco'),
    [isEdit, form.nome],
  );

  const changeTab = (key: TabKey) => {
    if (!canAccessSubTabs && key !== 'banco') {
      toast('Salve o banco para liberar as abas complementares.');
      return;
    }

    setActiveTab(key);
  };

  const renderBancoTab = () => (
    <form className="entity-form-stack" onSubmit={onSave}>
      <section className="entity-card">
        <header>
          <h3>Dados do Banco</h3>
          <p>Estrutura de tela cheia para manter o padrão visual dos demais cadastros.</p>
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
            <span>Código</span>
            <input
              maxLength={10}
              value={form.codigo}
              onChange={(event) => setForm((current) => ({ ...current, codigo: event.target.value.replace(/\D/g, '') }))}
              required
            />
          </label>
          <label className="checkbox-inline">
            <input
              type="checkbox"
              checked={form.ativo}
              onChange={(event) => setForm((current) => ({ ...current, ativo: event.target.checked }))}
            />
            <span>Banco ativo</span>
          </label>
        </div>
      </section>

      <div className="entity-actions">
        <button type="button" className="btn-muted" onClick={() => navigate('/cadastro/bancos')}>
          Voltar
        </button>
        <button type="submit" className="btn-main" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  );

  const renderLayoutExtratoTab = () => (
    <section className="entity-card">
      <header>
        <h3>Layout de Extrato</h3>
        <p>A aba já está disponível no novo sistema, espelhando o legado.</p>
      </header>
      <div className="entity-loading">
        Integração dos campos de layout de extrato em implementação.
      </div>
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

      {historicoPaged.items.length === 0 ? <div className="entity-loading">Sem eventos para este banco.</div> : null}
    </section>
  );

  const renderCurrentTab = () => {
    switch (activeTab) {
      case 'banco':
        return renderBancoTab();
      case 'layoutExtrato':
        return renderLayoutExtratoTab();
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
        <button className="btn-muted" onClick={() => navigate('/cadastro/bancos')}>
          Voltar para listagem
        </button>
      }
    >
      <div className="entity-meta-bar">
        <span><strong>Código:</strong> {form.codigo || 'Não definido'}</span>
        <span><strong>Status:</strong> {form.ativo ? 'Ativo' : 'Inativo'}</span>
      </div>

      <div className="entity-tabs" role="tablist" aria-label="Abas de cadastro do banco">
        {tabs.map((tab) => {
          const disabled = !canAccessSubTabs && tab.key !== 'banco';

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


