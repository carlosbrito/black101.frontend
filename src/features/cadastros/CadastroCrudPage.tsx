import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import toast from 'react-hot-toast';
import { getErrorMessage, http } from '../../shared/api/http';
import type { PagedResponse } from '../../shared/types/paging';
import { DataTable } from '../../shared/ui/DataTable';
import type { Column } from '../../shared/ui/DataTable';
import { PageFrame } from '../../shared/ui/PageFrame';
import { applyCpfCnpjMask, applyPhoneMask, isValidCpfCnpj, isValidPhone, sanitizeDocument } from './cadastroCommon';
import './cadastro.css';

type FieldDef = {
  name: string;
  label: string;
  type?: 'text' | 'email';
  mask?: 'cpfCnpj' | 'phone';
  required?: boolean;
};

type CrudRecord = { id: string; [key: string]: string | boolean | number | null | undefined };
type AutoCreateResult = { id: string; status?: string; message?: string };
type FormValue = string | boolean;
type LookupData = Record<string, FormValue>;
type ExtraListItem = { id: string; [key: string]: string | number | boolean | null | undefined };
type PagedLikeResponse<T> = { items?: T[]; Items?: T[]; page?: number; Page?: number; totalPages?: number; TotalPages?: number };

const toBool = (value: unknown) => value === true || value === 'true' || value === 1;

const normalizeRows = (items: unknown[]): CrudRecord[] => {
  return items.map((item) => {
    const row = item as Record<string, unknown>;
    const normalized: CrudRecord = { id: String(row.id ?? row.Id ?? '') };

    Object.entries(row).forEach(([key, value]) => {
      const camelKey = key.length > 0 ? key[0].toLowerCase() + key.slice(1) : key;
      normalized[camelKey] = value as string | boolean | number | null | undefined;
    });

    return normalized;
  });
};

export const CadastroCrudPage = ({
  title,
  subtitle,
  endpoint,
  columns,
  fields,
  defaultValues,
  withExtras = false,
  onDocumentoLookup,
  createMode = 'default',
  documentModalTitle = 'Novo registro',
  documentFieldLabel = 'CPF/CNPJ',
  onAutoCreateByDocumento,
}: {
  title: string;
  subtitle: string;
  endpoint: string;
  columns: Column<CrudRecord>[];
  fields: FieldDef[];
  defaultValues: Record<string, FormValue>;
  withExtras?: boolean;
  onDocumentoLookup?: (doc: string) => Promise<LookupData | null>;
  createMode?: 'default' | 'documentOnly';
  documentModalTitle?: string;
  documentFieldLabel?: string;
  onAutoCreateByDocumento?: (documento: string) => Promise<AutoCreateResult | null>;
}) => {
  const [rows, setRows] = useState<CrudRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [current, setCurrent] = useState<CrudRecord | null>(null);
  const [form, setForm] = useState<Record<string, FormValue>>(defaultValues);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [anexos, setAnexos] = useState<ExtraListItem[]>([]);
  const [obs, setObs] = useState<ExtraListItem[]>([]);
  const [historico, setHistorico] = useState<ExtraListItem[]>([]);
  const [historicoPage, setHistoricoPage] = useState(1);
  const [historicoTotalPages, setHistoricoTotalPages] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [obsText, setObsText] = useState('');
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [documentValue, setDocumentValue] = useState('');
  const [documentSubmitting, setDocumentSubmitting] = useState(false);

  const applyFieldMask = (field: FieldDef, value: string): string => {
    if (field.mask === 'cpfCnpj') return applyCpfCnpjMask(value);
    if (field.mask === 'phone') return applyPhoneMask(value);
    return value;
  };

  const validateForm = (): boolean => {
    const nextErrors: Record<string, string> = {};

    fields.forEach((field) => {
      const value = String(form[field.name] ?? '');
      const trimmed = value.trim();
      const required = field.required ?? true;

      if (required && !trimmed) {
        nextErrors[field.name] = `Informe ${field.label.toLowerCase()}.`;
        return;
      }

      if (!trimmed) {
        return;
      }

      if (field.mask === 'cpfCnpj' && !isValidCpfCnpj(trimmed)) {
        nextErrors[field.name] = `${field.label} inválido.`;
      }

      if (field.mask === 'phone' && !isValidPhone(trimmed)) {
        nextErrors[field.name] = `${field.label} inválido.`;
      }
    });

    setFieldErrors(nextErrors);
    const firstError = Object.values(nextErrors)[0];

    if (firstError) {
      toast.error(firstError);
      return false;
    }

    return true;
  };

  const list = async () => {
    setLoading(true);
    try {
      const response = await http.get<PagedResponse<CrudRecord>>(endpoint, {
        params: {
          page,
          pageSize,
          search: search || undefined,
        },
      });

      const data = response.data as unknown as Record<string, unknown>;
      const itemsRaw = (data.items ?? data.Items ?? []) as unknown[];
      const loaded = normalizeRows(itemsRaw);
      setRows(loaded);
      setTotalPages(Number(data.totalPages ?? data.TotalPages ?? 1));
      setTotalItems(Number(data.totalItems ?? data.TotalItems ?? loaded.length));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void list();
  }, [page, pageSize]);

  const openEditById = async (id: string) => {
    const response = await http.get(`${endpoint}/${id}`);
    const normalized = normalizeRows([response.data as unknown]);
    const row = normalized[0];
    if (!row) {
      throw new Error('Registro não encontrado para edição.');
    }

    openEdit(row);
  };

  const openCreate = () => {
    if (createMode === 'documentOnly') {
      setDocumentValue('');
      setDocumentModalOpen(true);
      return;
    }

    setCurrent(null);
    setReadOnly(false);
    setForm({ ...defaultValues });
    setFieldErrors({});
    setModalOpen(true);
  };

  const openEdit = (row: CrudRecord) => {
    setCurrent(row);
    setReadOnly(false);
    const next = { ...defaultValues };
    Object.keys(defaultValues).forEach((key) => {
      next[key] = (row[key] as string | boolean) ?? defaultValues[key];
    });
    setForm(next);
    setFieldErrors({});
    setModalOpen(true);
    if (withExtras) {
      void loadExtras(row.id, 1);
    }
  };

  const openDetails = (row: CrudRecord) => {
    openEdit(row);
    setReadOnly(true);
  };

  const onDelete = async (row: CrudRecord) => {
    if (!window.confirm(`Excluir registro '${row.nome ?? row.name ?? row.id}'?`)) return;

    try {
      await http.delete(`${endpoint}/${row.id}`);
      toast.success('Registro removido.');
      await list();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;

    try {
      if (current) {
        await http.put(`${endpoint}/${current.id}`, form);
        toast.success('Registro atualizado.');
      } else {
        await http.post(endpoint, form);
        toast.success('Registro criado.');
      }

      setModalOpen(false);
      await list();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const onSubmitDocumentOnly = async (event: FormEvent) => {
    event.preventDefault();

    const raw = sanitizeDocument(documentValue);
    if (!isValidCpfCnpj(raw)) {
      toast.error('Informe um CPF/CNPJ válido.');
      return;
    }

    if (!onAutoCreateByDocumento) {
      toast.error('Fluxo de auto-cadastro não configurado.');
      return;
    }

    setDocumentSubmitting(true);
    try {
      const result = await onAutoCreateByDocumento(raw);
      if (!result?.id) {
        return;
      }

      setDocumentModalOpen(false);
      setDocumentValue('');
      if (result.message) {
        toast.success(result.message);
      }

      await list();
      await openEditById(result.id);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setDocumentSubmitting(false);
    }
  };

  const loadExtras = async (id: string, pageHist: number) => {
    try {
      const [anx, ob, hist] = await Promise.all([
        http.get(`${endpoint}/${id}/anexos`),
        http.get(`${endpoint}/${id}/observacoes`),
        http.get(`${endpoint}/${id}/historico`, { params: { page: pageHist, pageSize: 10 } }),
      ]);
      const anexosPayload = Array.isArray(anx.data) ? (anx.data as ExtraListItem[]) : [];
      const obsPayload = Array.isArray(ob.data) ? (ob.data as ExtraListItem[]) : [];
      const historyPayload = hist.data as PagedLikeResponse<ExtraListItem>;
      setAnexos(anexosPayload);
      setObs(obsPayload);
      setHistorico(historyPayload.items ?? historyPayload.Items ?? []);
      setHistoricoPage(Number(historyPayload.page ?? historyPayload.Page ?? 1));
      setHistoricoTotalPages(Number(historyPayload.totalPages ?? historyPayload.TotalPages ?? 1));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const uploadAnexo = async (file: File) => {
    if (!current) return;
    setUploading(true);
    try {
      const data = new FormData();
      data.append('file', file);
      await http.post(`${endpoint}/${current.id}/anexos`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Anexo incluído.');
      await loadExtras(current.id, historicoPage);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setUploading(false);
    }
  };

  const deleteAnexo = async (anexoId: string) => {
    if (!current) return;
    if (!window.confirm('Remover anexo?')) return;
    try {
      await http.delete(`${endpoint}/${current.id}/anexos/${anexoId}`);
      toast.success('Anexo removido.');
      await loadExtras(current.id, historicoPage);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const addObs = async () => {
    if (!current || !obsText.trim()) return;
    try {
      await http.post(`${endpoint}/${current.id}/observacoes`, { texto: obsText.trim() });
      setObsText('');
      await loadExtras(current.id, historicoPage);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const deleteObs = async (obsId: string) => {
    if (!current) return;
    if (!window.confirm('Remover observação?')) return;
    try {
      await http.delete(`${endpoint}/${current.id}/observacoes/${obsId}`);
      await loadExtras(current.id, historicoPage);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const pages = useMemo(() => `${page} de ${totalPages}`, [page, totalPages]);

  return (
    <PageFrame
      title={title}
      subtitle={subtitle}
      actions={<button className="btn-main" onClick={openCreate}>Novo</button>}
    >
      <div className="toolbar">
        <input
          placeholder="Buscar"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              setPage(1);
              void list();
            }
          }}
        />
        <button className="btn-muted" onClick={() => { setPage(1); void list(); }}>Filtrar</button>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        onDelete={onDelete}
        onDetails={openDetails}
        onEdit={openEdit}
      />

      <div className="pager">
        <span>{totalItems} registro(s)</span>
        <div>
          <button disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>Anterior</button>
          <span>{pages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((x) => x + 1)}>Próxima</button>
        </div>
        <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={30}>30</option>
        </select>
      </div>

      {documentModalOpen ? (
        <div className="modal-backdrop" onClick={() => setDocumentModalOpen(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>{documentModalTitle}</h3>
            <form onSubmit={onSubmitDocumentOnly}>
              <div className="form-grid">
                <label>
                  <span>{documentFieldLabel}</span>
                  <input
                    type="text"
                    value={documentValue}
                    onChange={(event) => setDocumentValue(applyCpfCnpjMask(event.target.value))}
                    placeholder="Digite CPF ou CNPJ"
                    required
                    autoFocus
                  />
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-muted" onClick={() => setDocumentModalOpen(false)} disabled={documentSubmitting}>
                  Fechar
                </button>
                <button type="submit" className="btn-main" disabled={documentSubmitting}>
                  {documentSubmitting ? 'Processando...' : 'Avançar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {modalOpen ? (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>{readOnly ? 'Detalhes' : current ? 'Editar registro' : 'Novo registro'}</h3>
            <form onSubmit={onSubmit}>
              <div className="form-grid">
                {fields.map((field) => (
                  <label key={field.name}>
                    <span>{field.label}</span>
                    <input
                      type={field.type ?? 'text'}
                      value={String(form[field.name] ?? '')}
                      disabled={readOnly}
                      onChange={(event) => {
                        const maskedValue = applyFieldMask(field, event.target.value);
                        setForm((prev) => ({ ...prev, [field.name]: maskedValue }));
                        setFieldErrors((prev) => ({ ...prev, [field.name]: '' }));
                      }}
                      required={field.required ?? true}
                    />
                    {field.mask === 'cpfCnpj' && onDocumentoLookup ? (
                      <button
                        type="button"
                        className="btn-muted"
                        onClick={() => {
                          const raw = sanitizeDocument(String(form[field.name] ?? ''));
                          if (raw.length !== 14) {
                            toast.error('Informe um CNPJ válido para buscar na Receita.');
                            return;
                          }
                          onDocumentoLookup(raw)
                            ?.then((data) => {
                              if (!data) {
                                toast.error('CNPJ não encontrado.');
                                return;
                              }
                              setForm((prev) => ({ ...prev, ...data }));
                            })
                            .catch((error) => toast.error(getErrorMessage(error)));
                        }}
                      >
                        Buscar CNPJ
                      </button>
                    ) : null}
                    {fieldErrors[field.name] ? <small className="form-error">{fieldErrors[field.name]}</small> : null}
                  </label>
                ))}

                {'ativo' in form ? (
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={toBool(form.ativo)}
                      disabled={readOnly}
                      onChange={(event) => setForm((prev) => ({ ...prev, ativo: event.target.checked }))}
                    />
                    <span>Ativo</span>
                  </label>
                ) : null}
              </div>

              {withExtras && current ? (
                <div className="extras">
                  <h4>Anexos</h4>
                  <div className="extras-row">
                    <input
                      type="file"
                      disabled={uploading || readOnly}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadAnexo(file);
                      }}
                    />
                  </div>
                  <ul className="extras-list">
                    {anexos.map((a) => (
                      <li key={a.id}>
                        <span>{String(a.nomeArquivo ?? a.NomeArquivo ?? '')}</span>
                        {!readOnly ? (
                          <button type="button" className="btn-muted" onClick={() => void deleteAnexo(a.id)}>
                            Remover
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>

                  <h4>Observações</h4>
                  <div className="extras-row">
                    <textarea
                      placeholder="Adicionar observação"
                      disabled={readOnly}
                      value={obsText}
                      onChange={(e) => setObsText(e.target.value)}
                    />
                    {!readOnly ? (
                      <button type="button" className="btn-main" onClick={() => void addObs()}>
                        Incluir
                      </button>
                    ) : null}
                  </div>
                  <ul className="extras-list">
                    {obs.map((o) => (
                      <li key={o.id}>
                        <div>
                          <strong>{String(o.autorEmail ?? o.AutorEmail ?? '---')}</strong> —{' '}
                          {new Date(String(o.createdAt ?? o.CreatedAt ?? '')).toLocaleString()}
                        </div>
                        <div>{String(o.texto ?? o.Texto ?? '')}</div>
                        {!readOnly ? (
                          <button type="button" className="btn-muted" onClick={() => void deleteObs(o.id)}>
                            Remover
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>

                  <h4>Histórico</h4>
                  <ul className="extras-list">
                    {historico.map((h) => (
                      <li key={h.id}>
                        <div>
                          <strong>{String(h.acao ?? h.Acao ?? '')}</strong> — {String(h.entidade ?? h.Entidade ?? '')} ({String(h.userEmail ?? h.UserEmail ?? '---')})
                        </div>
                        <div>{new Date(String(h.createdAt ?? h.CreatedAt ?? '')).toLocaleString()} — {String(h.payloadJson ?? h.PayloadJson ?? '')}</div>
                      </li>
                    ))}
                  </ul>
                  <div className="pager">
                    <button disabled={historicoPage <= 1} onClick={() => { const p = historicoPage - 1; setHistoricoPage(p); void loadExtras(current.id, p); }}>Anterior</button>
                    <span>{historicoPage} / {historicoTotalPages}</span>
                    <button disabled={historicoPage >= historicoTotalPages} onClick={() => { const p = historicoPage + 1; setHistoricoPage(p); void loadExtras(current.id, p); }}>Próxima</button>
                  </div>
                </div>
              ) : null}

              <div className="modal-actions">
                <button type="button" className="btn-muted" onClick={() => setModalOpen(false)}>Fechar</button>
                {!readOnly ? <button type="submit" className="btn-main">Salvar</button> : null}
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </PageFrame>
  );
};
