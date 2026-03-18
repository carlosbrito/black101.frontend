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

type AdministradoraRow = {
  id: string;
  pessoaId: string;
  nome: string;
  cnpjCpf: string;
  cidade?: string | null;
  uf?: string | null;
  ativo: boolean;
};

type AdministradoraApiRow = {
  id: string;
  status?: number;
  dateCreated?: string;
  pessoa?: {
    id?: string;
    nome?: string;
    cnpjCpf?: string;
    enderecos?: Array<{
      cidade?: string | null;
      estado?: string | null;
    }>;
  };
};

const columns: Column<AdministradoraRow>[] = [
  { key: 'nome', label: 'Nome' },
  { key: 'cnpjCpf', label: 'CPF/CNPJ', render: (row) => formatCpfCnpj(row.cnpjCpf) },
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

export const AdministradorasPage = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<AdministradoraRow[]>([]);
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
      const response = await http.get('/api/administradora/get/list', {
        params: {
          page,
          pageSize,
          keyword: search || undefined,
        },
      });

      const paged = readPagedResponse<AdministradoraApiRow>(response.data);
      setRows(
        paged.items.map((item) => ({
          id: item.id,
          pessoaId: item.pessoa?.id ?? '',
          nome: item.pessoa?.nome ?? '',
          cnpjCpf: item.pessoa?.cnpjCpf ?? '',
          cidade: item.pessoa?.enderecos?.[0]?.cidade ?? '',
          uf: item.pessoa?.enderecos?.[0]?.estado ?? '',
          ativo: Number(item.status ?? 0) === 0,
        })),
      );
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

  const removeAdministradora = async (row: AdministradoraRow) => {
    if (!window.confirm(`Excluir administradora '${row.nome}'?`)) {
      return;
    }

    try {
      await http.delete(`/api/administradora/remove/${row.id}`);
      toast.success('Administradora removida.');
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
      navigate(`/cadastro/administradoras/novo?documento=${doc}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setCreating(false);
    }
  };

  return (
    <PageFrame
      title="Cadastro de Administradoras"
      subtitle="Fluxo completo em página cheia, com abas e vínculo em Pessoa."
      actions={<button className="btn-main" onClick={() => setDocumentModalOpen(true)}>Nova administradora</button>}
    >
      <div className="toolbar">
        <input
          placeholder="Buscar por nome, CPF/CNPJ"
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
        onDelete={removeAdministradora}
        onEdit={(row) => navigate(`/cadastro/administradoras/${row.id}`)}
        onDetails={(row) => navigate(`/cadastro/administradoras/${row.id}`)}
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
            <h3>Nova Administradora</h3>
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


