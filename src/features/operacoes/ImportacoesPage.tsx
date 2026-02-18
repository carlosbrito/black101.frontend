import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { getErrorMessage, http } from '../../shared/api/http';
import { PageFrame } from '../../shared/ui/PageFrame';
import { DataTable, type Column } from '../../shared/ui/DataTable';
import './operations/importacoes.css';

type ImportacaoItem = {
  id: string;
  fidcId?: string;
  fileName?: string;
  fileHash?: string;
  origem?: string;
  status: string;
  createdAt?: string;
  completedAt?: string;
  userEmail?: string;
  errorSummary?: string;
};

type ImportacaoDetails = ImportacaoItem & {
  eventos?: Array<{ status: string; message?: string; createdAt: string }>;
  mensagens?: string[];
  fileKey?: string;
};

const origens = ['Cnab', 'Xml', 'Zip', 'Excel'];
const tiposCnab = ['Cnab2xx', 'Cnab4xx', 'Cnab5xx'];

const isProcessing = (status?: string) =>
  status === 'PROCESSANDO' || status === 'VALIDADO' || status === 'PENDENTE';

export const ImportacoesPage = () => {
  const [rows, setRows] = useState<ImportacaoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState<ImportacaoDetails | null>(null);
  const [polling, setPolling] = useState<number | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [fileHash, setFileHash] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    fidcId: '',
    origem: 'Cnab',
    tipoBanco: '',
    tipoCnab: '',
    modalidade: '',
    cedenteId: '',
  });

  const columns: Column<ImportacaoItem>[] = useMemo(
    () => [
      { key: 'fileName', label: 'Arquivo' },
      { key: 'origem', label: 'Origem' },
      { key: 'status', label: 'Status' },
      { key: 'createdAt', label: 'Criado' },
      { key: 'completedAt', label: 'Concluído' },
      { key: 'userEmail', label: 'Usuário' },
    ],
    [],
  );

  const list = async () => {
    setLoading(true);
    try {
      const response = await http.get('/operacoes/importacoes', {
        params: { page, pageSize },
      });
      const data = response.data as any;
      const items = (data.items ?? data.Items ?? []) as ImportacaoItem[];
      setRows(items);
      setTotalPages(Number(data.totalPages ?? data.TotalPages ?? 1));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void list();
  }, [page, pageSize]);

  // Poll while there are items em processamento
  useEffect(() => {
    if (rows.some((r) => isProcessing(r.status))) {
      if (!polling) {
        const t = window.setInterval(() => void list(), 5000);
        setPolling(t);
      }
    } else if (polling) {
      window.clearInterval(polling);
      setPolling(null);
    }
    return () => {
      if (polling) window.clearInterval(polling);
    };
  }, [rows, polling]);

  const computeHash = async (f: File) => {
    const buffer = await f.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const bytes = Array.from(new Uint8Array(hashBuffer));
    return bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
  };

  const onFileChange = async (inputFile: File | null) => {
    setFile(inputFile);
    setFileHash('');
    if (!inputFile) return;
    try {
      const hash = await computeHash(inputFile);
      setFileHash(hash);
    } catch (error) {
      toast.error('Falha ao calcular hash do arquivo.');
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      toast.error('Selecione um arquivo.');
      return;
    }
    if (!form.fidcId) {
      toast.error('Selecione o FIDC.');
      return;
    }
    setSubmitting(true);
    try {
      const data = new FormData();
      data.append('arquivo', file);
      data.append('fidcId', form.fidcId);
      data.append('origem', form.origem);
      if (form.tipoBanco) data.append('tipoBanco', form.tipoBanco);
      if (form.tipoCnab) data.append('tipoCnab', form.tipoCnab);
      if (form.modalidade) data.append('modalidade', form.modalidade);
      if (form.cedenteId) data.append('cedenteId', form.cedenteId);
      if (fileHash) data.append('fileHash', fileHash);

      const response = await http.post('/operacoes/importacoes', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { importacaoId } = response.data as any;
      toast.success('Importação enviada para processamento.');
      setFile(null);
      setFileHash('');
      void list();
      if (importacaoId) {
        void openDetailsById(importacaoId);
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const openDetailsById = async (id: string) => {
    try {
      const response = await http.get(`/operacoes/importacoes/${id}`);
      setSelected(response.data as ImportacaoDetails);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const onDetails = (row: ImportacaoItem) => void openDetailsById(row.id);

  const onEdit = (row: ImportacaoItem) => onDetails(row);

  const onDelete = (_row: ImportacaoItem) => {
    toast('Excluir não suportado para importações.', { icon: 'ℹ️' });
  };

  const reprocessar = async (id: string) => {
    try {
      await http.post(`/operacoes/importacoes/${id}/reprocessar`);
      toast.success('Reprocessamento solicitado.');
      void openDetailsById(id);
      void list();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const statusClass = (status?: string) =>
    status === 'FINALIZADO_SUCESSO'
      ? 'pill success'
      : status === 'FINALIZADO_FALHA'
        ? 'pill danger'
        : 'pill warn';

  return (
    <PageFrame
      title="Importação de Operações"
      subtitle="Envie arquivos (CNAB, XML/ZIP, Excel) para processar operações de forma assíncrona."
    >
      <div className="import-grid">
        <section className="card upload-card">
          <header>
            <h3>Novo envio</h3>
            <p>Arquivo sobe para o S3 e é enfileirado no RabbitMQ para processamento.</p>
          </header>
          <form className="form-grid" onSubmit={submit}>
            <label>
              FIDC ID*
              <input
                value={form.fidcId}
                onChange={(e) => setForm((f) => ({ ...f, fidcId: e.target.value }))}
                placeholder="GUID do FIDC"
                required
              />
            </label>
            <label>
              Origem*
              <select
                value={form.origem}
                onChange={(e) => setForm((f) => ({ ...f, origem: e.target.value }))}
              >
                {origens.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Banco (CNAB)
              <input
                value={form.tipoBanco}
                onChange={(e) => setForm((f) => ({ ...f, tipoBanco: e.target.value }))}
                placeholder="237, 341, ..."
              />
            </label>
            <label>
              Layout CNAB
              <select
                value={form.tipoCnab}
                onChange={(e) => setForm((f) => ({ ...f, tipoCnab: e.target.value }))}
              >
                <option value="">Selecione (opcional)</option>
                {tiposCnab.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Modalidade
              <input
                value={form.modalidade}
                onChange={(e) => setForm((f) => ({ ...f, modalidade: e.target.value }))}
                placeholder="Ex.: Duplicata, CCB"
              />
            </label>
            <label>
              Cedente Id
              <input
                value={form.cedenteId}
                onChange={(e) => setForm((f) => ({ ...f, cedenteId: e.target.value }))}
                placeholder="Opcional"
              />
            </label>

            <label className="file-input">
              Arquivo*
              <input
                type="file"
                accept=".rem,.txt,.xml,.zip,.xlsx,.xls"
                onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
              />
              {file ? (
                <small>
                  {file.name} — {(file.size / 1024).toFixed(1)} KB
                  {fileHash ? ` — SHA256 ${fileHash.substring(0, 16)}…` : ' — calculando hash...'}
                </small>
              ) : (
                <small>Formatos: CNAB (.rem/.txt), XML/ZIP, Excel (.xlsx/.xls) — até 20MB</small>
              )}
            </label>

            <div className="actions-row">
              <button type="submit" className="btn-main" disabled={submitting}>
                {submitting ? 'Enviando...' : 'Enviar para processamento'}
              </button>
            </div>
          </form>
        </section>

        <section className="card list-card">
          <header>
            <div>
              <h3>Importações recentes</h3>
              <p>Atualiza automaticamente enquanto houver processamentos em andamento.</p>
            </div>
            <div className="pager">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Anterior
              </button>
              <span>
                {page} / {totalPages}
              </span>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Próxima
              </button>
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </header>

          <DataTable
            columns={columns}
            rows={rows}
            loading={loading}
            onEdit={onEdit}
            onDelete={onDelete}
            onDetails={onDetails}
          />
        </section>
      </div>

      {selected ? (
        <div className="drawer">
          <div className="drawer-card">
            <header>
              <div>
                <h3>Detalhes da importação</h3>
                <p>ID: {selected.id}</p>
              </div>
              <button className="btn-muted" onClick={() => setSelected(null)}>
                Fechar
              </button>
            </header>
            <div className="grid-2">
              <div>
                <div className={statusClass(selected.status)}>{selected.status}</div>
                <p><strong>Arquivo:</strong> {selected.fileName ?? selected.fileKey ?? '-'}</p>
                <p><strong>Hash:</strong> {selected.fileHash ?? '-'}</p>
                <p><strong>Origem:</strong> {selected.origem ?? '-'}</p>
                <p><strong>FIDC:</strong> {selected.fidcId ?? '-'}</p>
                <p><strong>Usuário:</strong> {selected.userEmail ?? '-'}</p>
                <p><strong>Criado:</strong> {selected.createdAt ?? '-'}</p>
                <p><strong>Concluído:</strong> {selected.completedAt ?? '-'}</p>
              </div>
              <div>
                <h4>Eventos</h4>
                <ul className="events">
                  {selected.eventos?.length
                    ? selected.eventos.map((ev, idx) => (
                      <li key={idx}>
                        <span className={statusClass(ev.status)}>{ev.status}</span>
                        <div>{ev.message ?? '-'}</div>
                        <small>{ev.createdAt}</small>
                      </li>
                    ))
                    : <li>Nenhum evento retornado.</li>}
                </ul>
                {selected.errorSummary ? (
                  <div className="error-box">
                    <strong>Erro:</strong> {selected.errorSummary}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="drawer-actions">
              <button className="btn-main" onClick={() => void reprocessar(selected.id)}>
                Reprocessar
              </button>
              <button className="btn-muted" onClick={() => void list()}>
                Atualizar lista
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PageFrame>
  );
};
