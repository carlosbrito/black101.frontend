import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getErrorMessage, http } from '../../../shared/api/http';
import { DataTable } from '../../../shared/ui/DataTable';
import type { Column } from '../../../shared/ui/DataTable';
import { PageFrame } from '../../../shared/ui/PageFrame';
import { applyCpfCnpjMask, formatCpfCnpj, formatPhone, isValidCpfCnpj, readPagedResponse, sanitizeDocument } from '../cadastroCommon';
import '../cadastro.css';

type AgenteRow = {
  id: string;
  pessoaId: string;
  nome: string;
  documento: string;
  email: string;
  telefone?: string | null;
  ativo: boolean;
};

type AgenteApiRow = {
  id: string;
  status?: number;
  pessoa?: {
    id?: string;
    nome?: string;
    cnpjCpf?: string;
    contatos?: Array<{
      email?: string | null;
      telefone1?: string | null;
      telefone2?: string | null;
    }>;
  };
};

const columns: Column<AgenteRow>[] = [
  { key: 'nome', label: 'Nome' },
  { key: 'documento', label: 'CPF/CNPJ', render: (row) => formatCpfCnpj(row.documento) },
  { key: 'email', label: 'E-mail' },
  { key: 'telefone', label: 'Telefone', render: (row) => formatPhone(row.telefone ?? '') },
  {
    key: 'ativo',
    label: 'Status',
    render: (row) => (
      <span style={{ color: row.ativo ? 'var(--ok)' : 'var(--danger)', fontWeight: 700 }}>
        {row.ativo ? 'Ativo' : 'Inativo'}
      </span>
    ),
  },
];

export const AgentesPage = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<AgenteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [documento, setDocumento] = useState('');
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);

    try {
      const response = await http.get('/api/agente/get/list', {
        params: {
          page,
          pageSize,
          keyword: search || undefined,
        },
      });

      const paged = readPagedResponse<AgenteApiRow>(response.data);
      setRows(paged.items.map((item) => {
        const contato = item.pessoa?.contatos?.[0];
        return {
          id: item.id,
          pessoaId: item.pessoa?.id ?? '',
          nome: item.pessoa?.nome ?? '',
          documento: item.pessoa?.cnpjCpf ?? '',
          email: contato?.email ?? '',
          telefone: contato?.telefone1 ?? contato?.telefone2 ?? '',
          ativo: Number(item.status ?? 0) === 0,
        };
      }));
      setTotalItems(paged.totalItems);
      setTotalPages(paged.totalPages);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pagesLabel = useMemo(() => `${page} de ${totalPages}`, [page, totalPages]);

  const removeAgente = async (row: AgenteRow) => {
    if (!window.confirm(`Excluir agente '${row.nome}'?`)) {
      return;
    }

    try {
      await http.delete(`/api/agente/remove/${row.id}`);
      toast.success('Agente removido.');
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
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
      navigate(`/cadastro/agentes/novo?documento=${doc}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setCreating(false);
    }
  };

  return (
    <PageFrame
      title="Cadastro de Agentes"
      subtitle="Cadastro em tela cheia com abas no padrão do legado."
      actions={<button className="btn-main" onClick={() => setDocumentModalOpen(true)}>Novo agente</button>}
    >
      <div className="toolbar">
        <input
          placeholder="Buscar por nome, CPF/CNPJ ou e-mail"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              setPage(1);
              void load();
            }
          }}
        />
        <button
          className="btn-muted"
          onClick={() => {
            setPage(1);
            void load();
          }}
        >
          Filtrar
        </button>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        onDelete={removeAgente}
        onEdit={(row) => navigate(`/cadastro/agentes/${row.id}`)}
        onDetails={(row) => navigate(`/cadastro/agentes/${row.id}`)}
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

      {documentModalOpen ? (
        <div className="modal-backdrop" onClick={() => setDocumentModalOpen(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>Novo Agente</h3>
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


