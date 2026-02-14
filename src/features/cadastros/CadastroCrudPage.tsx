import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import toast from 'react-hot-toast';
import { getErrorMessage, http } from '../../shared/api/http';
import type { PagedResponse } from '../../shared/types/paging';
import { DataTable } from '../../shared/ui/DataTable';
import type { Column } from '../../shared/ui/DataTable';
import { PageFrame } from '../../shared/ui/PageFrame';
import { applyCpfCnpjMask, applyPhoneMask, isValidCpfCnpj, isValidPhone } from './cadastroCommon';
import './cadastro.css';

type FieldDef = {
  name: string;
  label: string;
  type?: 'text' | 'email';
  mask?: 'cpfCnpj' | 'phone';
  required?: boolean;
};

type CrudRecord = { id: string; [key: string]: string | boolean | number | null | undefined };

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
}: {
  title: string;
  subtitle: string;
  endpoint: string;
  columns: Column<CrudRecord>[];
  fields: FieldDef[];
  defaultValues: Record<string, string | boolean>;
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
  const [form, setForm] = useState<Record<string, string | boolean>>(defaultValues);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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

  const openCreate = () => {
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
