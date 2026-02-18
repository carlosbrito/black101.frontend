export type TemplateCatalogItem = {
  id: number;
  nome: string;
};

export type TemplateStatus = 0 | 1;
export type TemplateFormato = 0 | 1;

export type TemplateListItem = {
  id: string;
  empresaId: string;
  empresaNome: string;
  nome: string;
  tipo: number;
  formato: TemplateFormato;
  status: TemplateStatus;
  createdAt: string;
  updatedAt?: string | null;
};

export type TemplateDetail = {
  id: string;
  empresaId: string;
  empresaNome: string;
  nome: string;
  tipo: number;
  formato: TemplateFormato;
  status: TemplateStatus;
  html?: string | null;
  nomeArquivoWord?: string | null;
  possuiArquivoWord: boolean;
  createdAt: string;
  updatedAt?: string | null;
};

export type TemplateHistoricoItem = {
  id: string;
  acao: string;
  entidade: string;
  userEmail?: string | null;
  traceId: string;
  payloadJson?: string | null;
  createdAt: string;
};

export type EmpresaItem = {
  id: string;
  nome: string;
  ativo: boolean;
};

export const TEMPLATE_STATUS_LABEL: Record<TemplateStatus, string> = {
  0: "Ativo",
  1: "Inativo",
};

export const TEMPLATE_FORMATO_LABEL: Record<TemplateFormato, string> = {
  0: "HTML",
  1: "DOCX",
};

// Defina IDs para restringir catálogo na UI sem alterar backend.
export const EXPOSED_TEMPLATE_TYPE_IDS: number[] | null = null;
