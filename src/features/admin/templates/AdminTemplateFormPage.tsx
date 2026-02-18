import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getErrorMessage, http } from '../../../shared/api/http';
import { PageFrame } from '../../../shared/ui/PageFrame';
import type { PagedResponse } from '../../../shared/types/paging';
import {
  EXPOSED_TEMPLATE_TYPE_IDS,
  TEMPLATE_FORMATO_LABEL,
  TEMPLATE_STATUS_LABEL,
  type EmpresaItem,
  type TemplateCatalogItem,
  type TemplateDetail,
  type TemplateHistoricoItem,
} from './templateTypes';
import '../../cadastros/cadastro.css';
import '../../cadastros/administradoras/entity-form.css';

type TabKey = 'template' | 'historico';

const isValidWordFileName = (name: string): boolean => {
  const lower = name.toLowerCase();
  return lower.endsWith('.doc') || lower.endsWith('.docx');
};

const formatDateTime = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(parsed);
};

const parseFileName = (header: string | null, fallbackName: string): string => {
  if (!header) return fallbackName;

  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);

  const quotedMatch = /filename="?([^";]+)"?/i.exec(header);
  if (quotedMatch?.[1]) return quotedMatch[1];

  return fallbackName;
};

export const AdminTemplateFormPage = () => {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const templateId = params.id;
  const isEdit = !!templateId;

  const [loading, setLoading] = useState<boolean>(isEdit);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('template');

  const [empresas, setEmpresas] = useState<EmpresaItem[]>([]);
  const [tipos, setTipos] = useState<TemplateCatalogItem[]>([]);

  const [empresaId, setEmpresaId] = useState('');
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('');
  const [formato, setFormato] = useState<0 | 1>(0);
  const [status, setStatus] = useState<0 | 1>(0);
  const [html, setHtml] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [possuiArquivoWord, setPossuiArquivoWord] = useState(false);
  const [nomeArquivoWord, setNomeArquivoWord] = useState<string | null>(null);

  const [historicoPaged, setHistoricoPaged] = useState<PagedResponse<TemplateHistoricoItem>>({
    items: [],
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 1,
  });

  const tiposVisiveis = useMemo(() => {
    if (!EXPOSED_TEMPLATE_TYPE_IDS || EXPOSED_TEMPLATE_TYPE_IDS.length === 0) return tipos;
    const allow = new Set(EXPOSED_TEMPLATE_TYPE_IDS);
    return tipos.filter((item) => allow.has(item.id));
  }, [tipos]);

  const loadHistorico = async (id: string, page = 1) => {
    const response = await http.get<PagedResponse<TemplateHistoricoItem>>(`/admin/templates/${id}/historico`, {
      params: { page, pageSize: historicoPaged.pageSize, sortBy: 'createdAt', sortDir: 'desc' },
    });
    setHistoricoPaged(response.data);
  };

  const applyTemplate = (detail: TemplateDetail) => {
    setEmpresaId(detail.empresaId);
    setNome(detail.nome);
    setTipo(String(detail.tipo));
    setFormato(detail.formato);
    setStatus(detail.status);
    setHtml(detail.html ?? '');
    setPossuiArquivoWord(detail.possuiArquivoWord);
    setNomeArquivoWord(detail.nomeArquivoWord ?? null);
  };

  const loadTemplate = async (id: string) => {
    const response = await http.get<TemplateDetail>(`/admin/templates/${id}`);
    applyTemplate(response.data);
    await loadHistorico(id, 1);
  };

  useEffect(() => {
    const bootstrap = async () => {
      setLoading(true);
      try {
        const [empresasResponse, tiposResponse] = await Promise.all([
          http.get<PagedResponse<EmpresaItem>>('/cadastros/empresas', {
            params: { page: 1, pageSize: 200, sortBy: 'nome', sortDir: 'asc' },
          }),
          http.get<TemplateCatalogItem[]>('/admin/templates/catalogo/tipos'),
        ]);

        setEmpresas(empresasResponse.data.items.filter((item) => item.ativo));
        setTipos(tiposResponse.data);

        if (templateId) {
          await loadTemplate(templateId);
        }
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, [templateId]);

  const validate = (): boolean => {
    if (!empresaId.trim()) {
      toast.error('Empresa/Fundo é obrigatório.');
      return false;
    }

    if (!nome.trim()) {
      toast.error('Nome do template é obrigatório.');
      return false;
    }

    if (!tipo.trim()) {
      toast.error('Tipo de template é obrigatório.');
      return false;
    }

    if (formato === 0 && !html.trim()) {
      toast.error('Conteúdo HTML é obrigatório para templates HTML.');
      return false;
    }

    if (formato === 1) {
      if (file && !isValidWordFileName(file.name)) {
        toast.error('Arquivo Word deve possuir extensão .doc ou .docx.');
        return false;
      }

      if (!file && !possuiArquivoWord) {
        toast.error('Arquivo Word é obrigatório para templates DOCX.');
        return false;
      }
    }

    return true;
  };

  const onSave = async (event: FormEvent) => {
    event.preventDefault();

    if (!validate()) return;

    const tipoValue = Number(tipo);
    if (!Number.isInteger(tipoValue)) {
      toast.error('Tipo de template inválido.');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('Nome', nome.trim());
      formData.append('Tipo', String(tipoValue));
      formData.append('Formato', String(formato));

      if (!isEdit) {
        formData.append('EmpresaId', empresaId);
      }

      if (formato === 0) {
        formData.append('Html', html.trim());
      }

      if (formato === 1 && file) {
        formData.append('ArquivoWord', file);
      }

      if (isEdit && templateId) {
        await http.put(`/admin/templates/${templateId}`, formData);
        toast.success('Template atualizado.');
        await loadTemplate(templateId);
      } else {
        const response = await http.post<{ id: string }>('/admin/templates', formData);
        toast.success('Template criado.');
        navigate(`/admin/templates/${response.data.id}`, { replace: true });
      }

      setFile(null);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const onToggleStatus = async () => {
    if (!templateId) return;

    try {
      if (status === 0) {
        await http.put(`/admin/templates/${templateId}/deactivate`);
        toast.success('Template inativado.');
      } else {
        await http.put(`/admin/templates/${templateId}/activate`);
        toast.success('Template ativado.');
      }

      await loadTemplate(templateId);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const onDownload = async () => {
    if (!templateId || !nomeArquivoWord) return;

    try {
      const response = await http.get(`/admin/templates/${templateId}/download`, { responseType: 'blob' });
      const fileName = parseFileName(response.headers['content-disposition'] ?? null, nomeArquivoWord);
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const canAccessHistorico = isEdit && !!templateId;

  return (
    <PageFrame
      title={isEdit ? `Template: ${nome || 'Editar'}` : 'Novo Template'}
      subtitle="Módulo administrativo de templates com paridade de regras do legado."
      actions={
        <button className="btn-muted" onClick={() => navigate('/admin/templates')}>
          Voltar para listagem
        </button>
      }
    >
      {isEdit ? (
        <div className="entity-meta-bar">
          <span><strong>ID:</strong> {templateId}</span>
          <span><strong>Status:</strong> {TEMPLATE_STATUS_LABEL[status]}</span>
          <span><strong>Formato:</strong> {TEMPLATE_FORMATO_LABEL[formato]}</span>
        </div>
      ) : null}

      <div className="entity-tabs" role="tablist" aria-label="Abas do template">
        <button
          type="button"
          role="tab"
          className={`entity-tab-btn ${activeTab === 'template' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('template')}
          aria-selected={activeTab === 'template'}
        >
          Template
        </button>
        <button
          type="button"
          role="tab"
          className={`entity-tab-btn ${activeTab === 'historico' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('historico')}
          disabled={!canAccessHistorico}
          aria-selected={activeTab === 'historico'}
        >
          Histórico
        </button>
      </div>

      {loading ? (
        <div className="entity-loading">Carregando template...</div>
      ) : activeTab === 'historico' && canAccessHistorico && templateId ? (
        <section className="entity-card entity-form-stack">
          <header>
            <h3>Histórico de auditoria</h3>
          </header>
          <div className="entity-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ação</th>
                  <th>Usuário</th>
                  <th>Data</th>
                  <th>TraceId</th>
                </tr>
              </thead>
              <tbody>
                {historicoPaged.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.acao}</td>
                    <td>{item.userEmail || '-'}</td>
                    <td>{formatDateTime(item.createdAt)}</td>
                    <td className="trace-id-cell" title={item.traceId}>{item.traceId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pager">
            <span>{historicoPaged.totalItems} evento(s)</span>
            <div>
              <button
                disabled={historicoPaged.page <= 1}
                onClick={() => void loadHistorico(templateId, historicoPaged.page - 1)}
              >
                Anterior
              </button>
              <span>{historicoPaged.page} de {historicoPaged.totalPages}</span>
              <button
                disabled={historicoPaged.page >= historicoPaged.totalPages}
                onClick={() => void loadHistorico(templateId, historicoPaged.page + 1)}
              >
                Próxima
              </button>
            </div>
          </div>
        </section>
      ) : (
        <form className="entity-form-stack" onSubmit={onSave}>
          <section className="entity-card">
            <header>
              <h3>Dados do template</h3>
              <p>HTML não exige upload. DOCX exige arquivo Word.</p>
            </header>
            <div className="entity-grid cols-3">
              <label>
                <span>Empresa/Fundo</span>
                <select
                  value={empresaId}
                  onChange={(event) => setEmpresaId(event.target.value)}
                  disabled={isEdit}
                  required
                >
                  <option value="">Selecione...</option>
                  {empresas.map((empresa) => (
                    <option key={empresa.id} value={empresa.id}>
                      {empresa.nome}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Nome</span>
                <input value={nome} onChange={(event) => setNome(event.target.value)} required />
              </label>

              <label>
                <span>Tipo</span>
                <select value={tipo} onChange={(event) => setTipo(event.target.value)} required>
                  <option value="">Selecione...</option>
                  {tiposVisiveis.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nome}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Formato</span>
                <select value={formato} onChange={(event) => setFormato(Number(event.target.value) as 0 | 1)}>
                  <option value={0}>HTML</option>
                  <option value={1}>DOCX</option>
                </select>
              </label>

              {isEdit ? (
                <label>
                  <span>Status</span>
                  <input value={TEMPLATE_STATUS_LABEL[status]} readOnly />
                </label>
              ) : null}

              {formato === 1 ? (
                <label className="span-all">
                  <span>Arquivo Word (.doc/.docx)</span>
                  <input
                    type="file"
                    accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  />
                </label>
              ) : (
                <label className="span-all">
                  <span>Conteúdo HTML</span>
                  <textarea
                    rows={14}
                    value={html}
                    onChange={(event) => setHtml(event.target.value)}
                    placeholder="<html>...</html>"
                    required={formato === 0}
                  />
                </label>
              )}
            </div>
          </section>

          {formato === 1 && nomeArquivoWord ? (
            <section className="entity-card">
              <header>
                <h3>Arquivo atual</h3>
              </header>
              <div className="entity-actions" style={{ justifyContent: 'space-between' }}>
                <span>{nomeArquivoWord}</span>
                <button type="button" className="btn-muted" onClick={onDownload}>
                  Download do arquivo
                </button>
              </div>
            </section>
          ) : null}

          <div className="entity-actions">
            <button type="button" className="btn-muted" onClick={() => navigate('/admin/templates')}>
              Cancelar
            </button>
            {isEdit ? (
              <button type="button" className="btn-muted" onClick={onToggleStatus}>
                {status === 0 ? 'Inativar' : 'Ativar'}
              </button>
            ) : null}
            <button type="submit" className="btn-main" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      )}
    </PageFrame>
  );
};
