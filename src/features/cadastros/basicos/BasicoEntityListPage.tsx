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

type BasicoRow = {
  id: string;
  nome: string;
  documento?: string | null;
  email?: string | null;
  telefone?: string | null;
  cidade?: string | null;
  uf?: string | null;
  ativo: boolean;
};

type Props = {
  title: string;
  subtitle: string;
  endpoint: string;
  routeBase: string;
  createLabel: string;
  allowAutoCadastro?: boolean;
};

const columns: Column<BasicoRow>[] = [
  { key: 'nome', label: 'Nome' },
  { key: 'documento', label: 'CPF/CNPJ', render: (row) => (row.documento ? formatCpfCnpj(row.documento) : '-') },
  { key: 'email', label: 'E-mail' },
  { key: 'telefone', label: 'Telefone', render: (row) => (row.telefone ? formatPhone(row.telefone) : '-') },
  { key: 'cidade', label: 'Cidade' },
  { key: 'uf', label: 'UF' },
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

export const BasicoEntityListPage = ({
  title,
  subtitle,
  endpoint,
  routeBase,
  createLabel,
  allowAutoCadastro = true,
}: Props) => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<BasicoRow[]>([]);
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
      const response = await http.get(endpoint, {
        params: {
          page,
          pageSize,
          search: search || undefined,
        },
      });

      const paged = readPagedResponse<BasicoRow>(response.data);
      setRows(paged.items);
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

  const removeItem = async (row: BasicoRow) => {
    if (!window.confirm(`Excluir registro '${row.nome}'?`)) {
      return;
    }

    try {
      await http.delete(`${endpoint}/${row.id}`);
      toast.success('Registro removido.');
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
      const response = await http.post(`${endpoint}/auto-cadastro`, { documento: doc });
      const data = response.data as Record<string, unknown>;
      const id = String(data.id ?? data.Id ?? '');
      if (!id) {
        toast.error('Não foi possível criar o registro.');
        return;
      }

      const message = String(data.mensagem ?? data.Mensagem ?? '');
      if (message) toast.success(message);
      setDocumentModalOpen(false);
      setDocumento('');
      await load();
      navigate(`${routeBase}/${id}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setCreating(false);
    }
  };

  return (
    <PageFrame
      title={title}
      subtitle={subtitle}
      actions={
        <button className="btn-main" onClick={() => (allowAutoCadastro ? setDocumentModalOpen(true) : navigate(`${routeBase}/novo`))}>
          {createLabel}
        </button>
      }
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
        onDelete={removeItem}
        onEdit={(row) => navigate(`${routeBase}/${row.id}`)}
        onDetails={(row) => navigate(`${routeBase}/${row.id}`)}
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

      {allowAutoCadastro && documentModalOpen ? (
        <div className="modal-backdrop" onClick={() => setDocumentModalOpen(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>{createLabel}</h3>
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


