import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getErrorMessage, http } from "../../../shared/api/http";
import type { PagedResponse } from "../../../shared/types/paging";
import { DataTable } from "../../../shared/ui/DataTable";
import type { Column } from "../../../shared/ui/DataTable";
import { PageFrame } from "../../../shared/ui/PageFrame";
import {
  EXPOSED_TEMPLATE_TYPE_IDS,
  TEMPLATE_FORMATO_LABEL,
  TEMPLATE_STATUS_LABEL,
  type EmpresaItem,
  type TemplateCatalogItem,
  type TemplateListItem,
} from "./templateTypes";
import "../../cadastros/cadastro.css";

export const AdminTemplatesListPage = () => {
  const navigate = useNavigate();

  const [rows, setRows] = useState<TemplateListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [empresaId, setEmpresaId] = useState("");
  const [tipo, setTipo] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [empresas, setEmpresas] = useState<EmpresaItem[]>([]);
  const [tipos, setTipos] = useState<TemplateCatalogItem[]>([]);
  const tiposVisiveis = useMemo(() => {
    if (!EXPOSED_TEMPLATE_TYPE_IDS || EXPOSED_TEMPLATE_TYPE_IDS.length === 0) return tipos;
    const allow = new Set(EXPOSED_TEMPLATE_TYPE_IDS);
    return tipos.filter((item) => allow.has(item.id));
  }, [tipos]);

  const columns = useMemo<Column<TemplateListItem>[]>(
    () => [
      { key: "nome", label: "Nome" },
      { key: "empresaNome", label: "Empresa/Fundo" },
      { key: "tipo", label: "Tipo", render: (row) => tipos.find((x) => x.id === row.tipo)?.nome ?? String(row.tipo) },
      { key: "formato", label: "Formato", render: (row) => TEMPLATE_FORMATO_LABEL[row.formato] },
      { key: "status", label: "Status", render: (row) => TEMPLATE_STATUS_LABEL[row.status] },
      { key: "createdAt", label: "Cadastro", render: (row) => formatDate(row.createdAt) },
    ],
    [tipos],
  );

  const list = async () => {
    setLoading(true);
    try {
      const response = await http.get<PagedResponse<TemplateListItem>>("/admin/templates", {
        params: {
          page,
          pageSize,
          search: search || undefined,
          empresaId: empresaId || undefined,
          tipo: tipo || undefined,
          status: status || undefined,
          sortBy: "createdAt",
          sortDir: "desc",
        },
      });

      setRows(response.data.items);
      setTotalPages(response.data.totalPages);
      setTotalItems(response.data.totalItems);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const deleteTemplate = async (row: TemplateListItem) => {
    if (!window.confirm(`Remover template '${row.nome}'?`)) return;
    try {
      await http.delete(`/admin/templates/${row.id}`);
      toast.success("Template removido.");
      await list();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  useEffect(() => {
    void list();
  }, [page, pageSize]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const [empresasResponse, tiposResponse] = await Promise.all([
          http.get<PagedResponse<EmpresaItem>>("/cadastros/empresas", { params: { page: 1, pageSize: 200, sortBy: "nome", sortDir: "asc" } }),
          http.get<TemplateCatalogItem[]>("/admin/templates/catalogo/tipos"),
        ]);

        setEmpresas(empresasResponse.data.items.filter((x) => x.ativo));
        setTipos(tiposResponse.data);
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    };

    void bootstrap();
  }, []);

  return (
    <PageFrame
      title="Administrativo - Templates"
      subtitle="Gestão completa de templates (HTML e DOCX) com vínculo por empresa/fundo."
      actions={<button className="btn-main" onClick={() => navigate("/admin/templates/novo")}>Novo template</button>}
    >
      <div className="toolbar">
        <input
          placeholder="Buscar por nome"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              setPage(1);
              void list();
            }
          }}
        />

        <select value={empresaId} onChange={(event) => setEmpresaId(event.target.value)}>
          <option value="">Empresa/Fundo</option>
          {empresas.map((empresa) => (
            <option key={empresa.id} value={empresa.id}>
              {empresa.nome}
            </option>
          ))}
        </select>

        <select value={tipo} onChange={(event) => setTipo(event.target.value)}>
          <option value="">Tipo</option>
          {tiposVisiveis.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nome}
            </option>
          ))}
        </select>

        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Status</option>
          <option value="0">Ativo</option>
          <option value="1">Inativo</option>
        </select>

        <button
          className="btn-muted"
          onClick={() => {
            setPage(1);
            void list();
          }}
        >
          Filtrar
        </button>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        onDetails={(row) => navigate(`/admin/templates/${row.id}`)}
        onEdit={(row) => navigate(`/admin/templates/${row.id}`)}
        onDelete={(row) => void deleteTemplate(row)}
      />

      <div className="pager">
        <span>{totalItems} registro(s)</span>
        <div>
          <button disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Anterior</button>
          <span>{page} de {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>Próxima</button>
        </div>
        <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={30}>30</option>
        </select>
      </div>
    </PageFrame>
  );
};

const formatDate = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(parsed);
};
