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

type SacadoRow = {
  id: string;
  pessoaId: string;
  nome: string;
  documento: string;
  email?: string | null;
  telefone?: string | null;
  cidade?: string | null;
  uf?: string | null;
  ativo: boolean;
};

type AutoCreateResult = {
  sacadoId?: string;
  SacadoId?: string;
  mensagem?: string;
  Mensagem?: string;
};

const columns: Column<SacadoRow>[] = [
  { key: 'nome', label: 'Nome' },
  { key: 'documento', label: 'CPF/CNPJ', render: (row) => formatCpfCnpj(row.documento) },
  { key: 'email', label: 'E-mail' },
  { key: 'telefone', label: 'Telefone', render: (row) => formatPhone(row.telefone ?? '') },
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

export const SacadosPage = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<SacadoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [documentValue, setDocumentValue] = useState('');
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);

    try {
      const response = await http.get('/cadastros/sacados', {
        params: {
          page,
          pageSize,
          search: search || undefined,
        },
      });

      const paged = readPagedResponse<SacadoRow>(response.data);
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

  const removeSacado = async (row: SacadoRow) => {
    if (!window.confirm(`Excluir sacado '${row.nome}'?`)) {
      return;
    }

    try {
      await http.delete(`/cadastros/sacados/${row.id}`);
      toast.success('Sacado removido.');
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const onSubmitAutoCadastro = async (event: FormEvent) => {
    event.preventDefault();

    const documento = sanitizeDocument(documentValue);
    if (!isValidCpfCnpj(documento)) {
      toast.error('Informe um CPF/CNPJ válido.');
      return;
    }

    setCreating(true);
    try {
      const response = await http.post('/cadastros/sacados/auto-cadastro', { documento });
      const data = response.data as AutoCreateResult;
      const id = data.sacadoId ?? data.SacadoId;
      if (!id) {
        toast.error('Não foi possível criar o sacado.');
        return;
      }

      setDocumentModalOpen(false);
      setDocumentValue('');
      toast.success(data.mensagem ?? data.Mensagem ?? 'Sacado criado com sucesso.');
      navigate(`/cadastro/sacados/${id}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setCreating(false);
    }
  };

  return (
    <PageFrame
      title="Cadastro de Sacados"
      subtitle="Auto-cadastro por CPF/CNPJ e edição completa em tela cheia com abas."
      actions={<button className="btn-main" onClick={() => setDocumentModalOpen(true)}>Novo sacado</button>}
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
        onDelete={removeSacado}
        onEdit={(row) => navigate(`/cadastro/sacados/${row.id}`)}
        onDetails={(row) => navigate(`/cadastro/sacados/${row.id}`)}
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
            <h3>Novo Sacado</h3>
            <form onSubmit={onSubmitAutoCadastro}>
              <div className="form-grid">
                <label>
                  <span>CPF/CNPJ</span>
                  <input
                    type="text"
                    value={documentValue}
                    onChange={(event) => setDocumentValue(applyCpfCnpjMask(event.target.value))}
                    placeholder="Digite CPF ou CNPJ"
                    autoFocus
                    required
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


