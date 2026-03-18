import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getErrorMessage, http } from '../../../shared/api/http';
import { DataTable } from '../../../shared/ui/DataTable';
import type { Column } from '../../../shared/ui/DataTable';
import { PageFrame } from '../../../shared/ui/PageFrame';
import { applyCpfCnpjMask, formatCpfCnpj, isValidCpfCnpj, readPagedResponse, sanitizeDocument } from '../cadastroCommon';
import '../cadastro.css';
import './cedentes-landing.css';
import './cedente-premium.css';

type CedenteRow = {
  id: string;
  pessoaId: string;
  nome: string;
  cnpjCpf: string;
  status: string;
  cidade?: string | null;
  uf?: string | null;
  ativo: boolean;
};

type CedenteApiRow = {
  id: string;
  status?: number | string;
  pessoa?: {
    id?: string;
    nome?: string;
    cnpjCpf?: string;
    contatos?: Array<{
      email?: string | null;
      telefone1?: string | null;
      telefone2?: string | null;
    }>;
    enderecos?: Array<{
      cidade?: string | null;
      estado?: string | null;
    }>;
  };
};

type LandingMetric = {
  label: string;
  value: string;
  description: string;
  tone: 'primary' | 'success' | 'warning';
};

const columns: Column<CedenteRow>[] = [
  { key: 'nome', label: 'Nome' },
  { key: 'cnpjCpf', label: 'CPF/CNPJ', render: (row) => formatCpfCnpj(row.cnpjCpf) },
  { key: 'status', label: 'Status' },
  { key: 'cidade', label: 'Cidade' },
  { key: 'uf', label: 'UF' },
  {
    key: 'ativo',
    label: 'Situação',
    render: (row) => (
      <span style={{ color: row.ativo ? 'var(--ok)' : 'var(--danger)', fontWeight: 700 }}>
        {row.ativo ? 'Ativo' : 'Inativo'}
      </span>
    ),
  },
];

const landingMetrics: LandingMetric[] = [
  {
    label: 'Cedentes ativos',
    value: '248',
    description: 'Base operacional apta para acompanhamento e gestão diária do módulo.',
    tone: 'primary',
  },
  {
    label: 'Aguardando aprovação',
    value: '19',
    description: 'Cadastros pendentes de análise antes da liberação completa do fluxo.',
    tone: 'success',
  },
  {
    label: 'Contratos próximos do vencimento',
    value: '14',
    description: 'Sinalização preventiva para contratos que exigem ação em curto prazo.',
    tone: 'warning',
  },
];

const fetchCedentesPage = async (page: number, pageSize: number, search: string) => {
  const response = await http.post('/api/cedente/get/list', {
    page,
    pageSize,
    keyword: search || undefined,
  });

  const paged = readPagedResponse<CedenteApiRow>(response.data);
  return {
    ...paged,
    items: paged.items.map((item) => {
      const endereco = item.pessoa?.enderecos?.[0];
      const rawStatus = item.status;
      const numericStatus = typeof rawStatus === 'number' ? rawStatus : null;
      const status = typeof rawStatus === 'string'
        ? rawStatus
        : numericStatus === 0
          ? 'Ativo'
          : numericStatus === 1
            ? 'Inativo'
            : '-';

      return {
        id: item.id,
        pessoaId: item.pessoa?.id ?? '',
        nome: item.pessoa?.nome ?? '',
        cnpjCpf: item.pessoa?.cnpjCpf ?? '',
        status,
        cidade: endereco?.cidade ?? '',
        uf: endereco?.estado ?? '',
        ativo: numericStatus === null ? status.toUpperCase() !== 'INATIVO' : numericStatus === 0,
      } satisfies CedenteRow;
    }),
  };
};

const normalizeLookupValue = (value: string) => value.trim().toLowerCase();

const isExactCedenteMatch = (row: CedenteRow, search: string) => {
  const normalizedSearch = normalizeLookupValue(search);
  const normalizedDocument = sanitizeDocument(search);

  return normalizeLookupValue(row.nome) === normalizedSearch || sanitizeDocument(row.cnpjCpf) === normalizedDocument;
};

const CedentesLanding = ({
  query,
  searching,
  onQueryChange,
  onSubmit,
  onSkip,
  onNewCedente,
}: {
  query: string;
  searching: boolean;
  onQueryChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onSkip: () => void;
  onNewCedente: () => void;
}) => (
  <section className="cedentes-landing" data-testid="cedentes-landing">
    <div className="cedentes-landing__hero" data-testid="cedentes-landing-panel">
      <div className="cedentes-landing__badge">Portal Black101</div>
      <div className="cedentes-landing__grid" aria-hidden="true" />
      <div className="cedentes-landing__mark" aria-hidden="true">
        <span />
        <span />
      </div>

      <div className="cedentes-landing__content">
        <div className="cedentes-landing__copy">
          <div className="cedentes-landing__eyebrow">
            <span className="cedentes-landing__eyebrow-pill">Console premium</span>
            <span className="cedentes-landing__eyebrow-copy">Cadastro, aprovação e acompanhamento em uma única entrada.</span>
          </div>
          <h2>
            Gestão centralizada
            <br />
            para <span>módulo de cedentes</span>
          </h2>
          <p>
            Visualize indicadores-chave, localize rapidamente um cedente específico e entre na operação
            detalhada sem passar direto pela listagem tradicional.
          </p>
          <div className="cedentes-landing__highlights">
            <span>Leitura rápida de status</span>
            <span>Busca direta por nome ou CNPJ</span>
            <span>Abertura imediata do fluxo operacional</span>
          </div>
        </div>

        <form className="cedentes-landing__search" onSubmit={onSubmit}>
          <div className="cedentes-landing__search-topline">
            <strong>Painel de acesso rápido</strong>
            <span>Entre na listagem ou pule direto para um cadastro específico.</span>
          </div>
          <label htmlFor="cedentes-landing-query">Pesquisar cedente por nome ou CNPJ</label>
          <div className="cedentes-landing__search-row">
            <input
              id="cedentes-landing-query"
              placeholder="Digite o nome ou CNPJ do cedente"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
            />
            <button type="submit" className="btn-main" disabled={searching}>
              {searching ? 'Buscando...' : 'Pesquisar'}
            </button>
          </div>
          <div className="cedentes-landing__search-foot">
            <div>
              <strong>Modo recomendado</strong>
              <span>Use a busca para abrir um cadastro único ou siga para a visão completa.</span>
            </div>
          </div>
          <div className="cedentes-landing__actions">
            <button type="button" className="btn-muted" onClick={onSkip}>
              Ir para listagem
            </button>
            <button type="button" className="btn-muted cedentes-landing__secondary" onClick={onNewCedente}>
              Novo cedente
            </button>
          </div>
        </form>
      </div>

      <div className="cedentes-landing__metrics">
        {landingMetrics.map((metric) => (
          <article key={metric.label} className={`cedentes-landing__metric cedentes-landing__metric--${metric.tone}`}>
            <div className="cedentes-landing__metric-icon" aria-hidden="true" />
            <strong>{metric.label}</strong>
            <span>{metric.value}</span>
            <p>{metric.description}</p>
          </article>
        ))}
      </div>
    </div>
  </section>
);

const CedentesListSection = ({
  initialSearch,
  onBackToLanding,
  onNewCedente,
}: {
  initialSearch: string;
  onBackToLanding: () => void;
  onNewCedente: () => void;
}) => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<CedenteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    setSearch(initialSearch);
    setPage(1);
  }, [initialSearch]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);

      try {
        const paged = await fetchCedentesPage(page, pageSize, search);
        if (cancelled) {
          return;
        }

        setRows(paged.items);
        setTotalItems(paged.totalItems);
        setTotalPages(paged.totalPages);
      } catch (error) {
        if (!cancelled) {
          toast.error(getErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [page, pageSize, search]);

  const pagesLabel = useMemo(() => `${page} de ${totalPages}`, [page, totalPages]);

  const removeCedente = async (row: CedenteRow) => {
    if (!window.confirm(`Excluir cedente '${row.nome}'?`)) {
      return;
    }

    try {
      await http.delete(`/api/cedente/remove/${row.id}`);
      toast.success('Cedente removido.');

      const paged = await fetchCedentesPage(page, pageSize, search);
      setRows(paged.items);
      setTotalItems(paged.totalItems);
      setTotalPages(paged.totalPages);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <>
      <div className="cedentes-module-toolbar" data-testid="cedentes-list-toolbar">
        <div className="cedentes-module-toolbar__summary">
          <div>
            <span className="cedentes-module-toolbar__eyebrow">Operação ativa</span>
            <strong>Base completa de cedentes</strong>
            <p>Filtre rapidamente a carteira, revise situações críticas e entre no detalhe sem trocar de contexto.</p>
          </div>
          <div className="cedentes-module-toolbar__badges" aria-hidden="true">
            <span>Busca viva</span>
            <span>Fluxo legado</span>
            <span>Cadastro premium</span>
          </div>
        </div>
        <div className="toolbar cedentes-module-toolbar__controls">
          <div className="cedentes-module-toolbar__field">
            <span>Busca operacional</span>
            <input
              placeholder="Buscar por nome, CPF/CNPJ, e-mail"
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
            />
          </div>
          <div className="cedentes-module-toolbar__actions">
            <button className="btn-muted" type="button" onClick={onBackToLanding}>
              Voltar para página principal
            </button>
            <button className="btn-main" type="button" onClick={onNewCedente}>
              Novo cedente
            </button>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        onDelete={removeCedente}
        onEdit={(row) => navigate(`/cadastro/cedentes/${row.id}`)}
        onDetails={(row) => navigate(`/cadastro/cedentes/${row.id}`)}
      />

      <div className="pager">
        <span>{totalItems} registro(s)</span>
        <div>
          <button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Anterior</button>
          <span>{pagesLabel}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Próxima</button>
        </div>
        <select
          value={pageSize}
          onChange={(event) => {
            setPageSize(Number(event.target.value));
            setPage(1);
          }}
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={30}>30</option>
        </select>
      </div>
    </>
  );
};

export const CedentesPage = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'landing' | 'list'>('landing');
  const [landingQuery, setLandingQuery] = useState('');
  const [listSearch, setListSearch] = useState('');
  const [searchingLanding, setSearchingLanding] = useState(false);
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [documento, setDocumento] = useState('');
  const [creating, setCreating] = useState(false);

  const openList = (searchValue = '') => {
    setListSearch(searchValue);
    setMode('list');
  };

  const createByDocumento = async (event: FormEvent) => {
    event.preventDefault();
    const doc = sanitizeDocument(documento);
    if (!isValidCpfCnpj(doc)) {
      toast.error('Informe um CPF/CNPJ válido.');
      return;
    }

    setCreating(true);
    try {
      setDocumentModalOpen(false);
      setDocumento('');
      navigate(`/cadastro/cedentes/novo?documento=${doc}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setCreating(false);
    }
  };

  const handleLandingSearch = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = landingQuery.trim();
    if (!trimmed) {
      openList('');
      return;
    }

    setSearchingLanding(true);
    try {
      const paged = await fetchCedentesPage(1, 20, trimmed);
      const exactMatches = paged.items.filter((row) => isExactCedenteMatch(row, trimmed));

      if (exactMatches.length === 1 && paged.totalItems === 1) {
        navigate(`/cadastro/cedentes/${exactMatches[0].id}`);
        return;
      }

      if (exactMatches.length === 1) {
        navigate(`/cadastro/cedentes/${exactMatches[0].id}`);
        return;
      }

      openList(trimmed);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSearchingLanding(false);
    }
  };

  return (
    <PageFrame
      title="Cadastro de Cedentes"
      subtitle={mode === 'landing' ? 'Entrada principal do módulo com indicadores e pesquisa rápida.' : 'Gestão completa de cedentes com filtro, paginação e ações.'}
      actions={mode === 'landing' ? <button className="btn-main" onClick={() => setDocumentModalOpen(true)}>Novo cedente</button> : null}
    >
      {mode === 'landing' ? (
        <CedentesLanding
          query={landingQuery}
          searching={searchingLanding}
          onQueryChange={setLandingQuery}
          onSubmit={handleLandingSearch}
          onSkip={() => openList()}
          onNewCedente={() => setDocumentModalOpen(true)}
        />
      ) : (
        <CedentesListSection
          initialSearch={listSearch}
          onBackToLanding={() => setMode('landing')}
          onNewCedente={() => setDocumentModalOpen(true)}
        />
      )}

      {documentModalOpen ? (
        <div className="modal-backdrop" onClick={() => setDocumentModalOpen(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>Novo Cedente</h3>
            <form onSubmit={createByDocumento}>
              <div className="form-grid">
                <label>
                  <span>CPF/CNPJ</span>
                  <input
                    value={documento}
                    onChange={(event) => setDocumento(applyCpfCnpjMask(event.target.value))}
                    placeholder="Digite o CPF ou CNPJ"
                    required
                    autoFocus
                  />
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-muted" onClick={() => setDocumentModalOpen(false)} disabled={creating}>
                  Fechar
                </button>
                <button type="submit" className="btn-main" disabled={creating}>
                  {creating ? 'Processando...' : 'Avançar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </PageFrame>
  );
};
