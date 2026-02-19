import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../../app/auth/AuthContext';
import { CONTEXTO_EMPRESA_HEADER, getErrorMessage, http, requiresEmpresaChoice } from '../../../shared/api/http';
import { DataTable } from '../../../shared/ui/DataTable';
import type { Column } from '../../../shared/ui/DataTable';
import { EmpresaPickerDialog } from '../../../shared/ui/EmpresaPickerDialog';
import { PageFrame } from '../../../shared/ui/PageFrame';
import { applyCpfCnpjMask, formatCpfCnpj, isValidCpfCnpj, readPagedResponse, sanitizeDocument } from '../cadastroCommon';
import '../cadastro.css';

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

export const CedentesPage = () => {
  const { contextEmpresas, selectedEmpresaIds } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<CedenteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [documento, setDocumento] = useState('');
  const [creating, setCreating] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerCallback, setPickerCallback] = useState<((empresaId: string) => Promise<void>) | null>(null);

  const load = async () => {
    setLoading(true);

    try {
      const response = await http.get('/cadastros/cedentes', {
        params: {
          page,
          pageSize,
          search: search || undefined,
        },
      });

      const paged = readPagedResponse<CedenteRow>(response.data);
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

  const removeCedente = async (row: CedenteRow) => {
    if (!window.confirm(`Excluir cedente '${row.nome}'?`)) {
      return;
    }

    try {
      await http.delete(`/cadastros/cedentes/${row.id}`);
      toast.success('Cedente removido.');
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
      const send = async (empresaId?: string) => {
        const response = await http.post('/cadastros/cedentes/auto-cadastro', { documento: doc }, {
          headers: empresaId ? { [CONTEXTO_EMPRESA_HEADER]: empresaId } : undefined,
        });
        return response.data as Record<string, unknown>;
      };

      try {
        const data = await send();
        const id = String(data.cedenteId ?? data.CedenteId ?? '');
        if (!id) {
          toast.error('Não foi possível criar o cedente.');
          return;
        }

        const message = String(data.mensagem ?? data.Mensagem ?? '');
        if (message) toast.success(message);
        setDocumentModalOpen(false);
        setDocumento('');
        await load();
        navigate(`/cadastro/cedentes/${id}`);
      } catch (error) {
        if (!requiresEmpresaChoice(error) || selectedEmpresaIds.length <= 1) {
          throw error;
        }

        setPickerOpen(true);
        setPickerCallback(() => async (empresaId: string) => {
          const data = await send(empresaId);
          const id = String(data.cedenteId ?? data.CedenteId ?? '');
          if (!id) {
            throw new Error('Não foi possível criar o cedente.');
          }

          const message = String(data.mensagem ?? data.Mensagem ?? '');
          if (message) toast.success(message);
          setDocumentModalOpen(false);
          setDocumento('');
          await load();
          navigate(`/cadastro/cedentes/${id}`);
        });
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setCreating(false);
    }
  };

  return (
    <PageFrame
      title="Cadastro de Cedentes"
      subtitle="Módulo completo com abas equivalentes ao legado."
      actions={<button className="btn-main" onClick={() => setDocumentModalOpen(true)}>Novo cedente</button>}
    >
      <div className="toolbar">
        <input
          placeholder="Buscar por nome, CPF/CNPJ, e-mail"
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
      <EmpresaPickerDialog
        open={pickerOpen}
        options={contextEmpresas.filter((item) => selectedEmpresaIds.includes(item.id)).map((item) => ({ id: item.id, nome: item.nome }))}
        onClose={() => {
          setPickerOpen(false);
          setPickerCallback(null);
        }}
        onConfirm={(empresaId) => {
          const callback = pickerCallback;
          setPickerOpen(false);
          setPickerCallback(null);
          if (!callback) {
            return;
          }

          void callback(empresaId).catch((error) => {
            toast.error(getErrorMessage(error));
          });
        }}
      />
    </PageFrame>
  );
};


