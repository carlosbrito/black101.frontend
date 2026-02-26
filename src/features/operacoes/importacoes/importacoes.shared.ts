export type ImportacaoItem = {
  id: string;
  fidcId?: string | null;
  origem?: string | null;
  tipoArquivo?: string | null;
  tipoBanco?: string | null;
  tipoCnab?: string | null;
  modalidade?: string | null;
  cedenteId?: string | null;
  fileName?: string | null;
  fileHash?: string | null;
  status: string;
  errorSummary?: string | null;
  ultimoCodigoFalha?: string | null;
  tentativas?: number;
  ultimaTentativaEm?: string | null;
  correlationId?: string | null;
  ultimoMessageId?: string | null;
  createdAt?: string;
  completedAt?: string | null;
  userEmail?: string | null;
};

export type ImportacaoDetails = ImportacaoItem & {
  fileKey?: string | null;
  eventos: Array<{ id: string; status: string; message?: string | null; createdAt: string }>;
};

export type CedenteAtivoOption = {
  id: string;
  nome: string;
  cnpjCpf: string;
};

export type BancoOption = {
  id: string;
  nome: string;
  codigo: string;
};

export type FormState = {
  cedenteId: string;
  modalidade: string;
  tipoBanco: string;
  tipoCnab: string;
};

export type FormErrors = {
  cedenteId?: string;
  arquivo?: string;
};

export type ImportacaoExcelAnaliseErro = {
  lineNumber: number;
  column?: string | null;
  code: string;
  message: string;
  value?: string | null;
};

export type ImportacaoExcelAnaliseAviso = {
  lineNumber?: number | null;
  code: string;
  message: string;
};

export type ImportacaoExcelAnalise = {
  analysisId: string;
  fileName: string;
  fidcId?: string | null;
  cedenteId?: string | null;
  modalidade?: string | null;
  status: 'VALIDA' | 'INVALIDA' | 'VALIDA_COM_AVISOS';
  canImport: boolean;
  summary: {
    totalLinhas: number;
    linhasValidas: number;
    linhasComErro: number;
    avisos: number;
    duplicadosIgnorados: number;
  };
  errors: ImportacaoExcelAnaliseErro[];
  warnings: ImportacaoExcelAnaliseAviso[];
  createdAt: string;
  expiresAt: string;
};

export type ImportacaoListResponse = {
  items: ImportacaoItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type FetchDetailsOptions = {
  silent?: boolean;
};

export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const acceptedExtensions = new Set(['.rem', '.txt', '.cnab', '.xml', '.zip', '.xlsx']);
export const cnabTipoOptions = ['240', '400', 'Outro'] as const;

export const asRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object') return {};
  return value as Record<string, unknown>;
};

export const readField = <T,>(value: Record<string, unknown>, ...keys: string[]): T | undefined => {
  for (const key of keys) {
    const found = value[key];
    if (found !== undefined && found !== null) return found as T;
  }
  return undefined;
};

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const inferTipoArquivo = (fileName: string): 'CNAB' | 'XML' | 'ZIP' | 'EXCEL' => {
  const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
  if (ext === '.xml') return 'XML';
  if (ext === '.zip') return 'ZIP';
  if (ext === '.xlsx') return 'EXCEL';
  return 'CNAB';
};

export const mapImportacaoItem = (raw: unknown): ImportacaoItem => {
  const item = asRecord(raw);

  return {
    id: String(readField(item, 'id', 'Id') ?? ''),
    fidcId: readField(item, 'fidcId', 'FidcId') ? String(readField(item, 'fidcId', 'FidcId')) : null,
    origem: readField(item, 'origem', 'Origem') ? String(readField(item, 'origem', 'Origem')) : null,
    tipoArquivo: readField(item, 'tipoArquivo', 'TipoArquivo') ? String(readField(item, 'tipoArquivo', 'TipoArquivo')) : null,
    tipoBanco: readField(item, 'tipoBanco', 'TipoBanco') ? String(readField(item, 'tipoBanco', 'TipoBanco')) : null,
    tipoCnab: readField(item, 'tipoCnab', 'TipoCnab') ? String(readField(item, 'tipoCnab', 'TipoCnab')) : null,
    modalidade: readField(item, 'modalidade', 'Modalidade') ? String(readField(item, 'modalidade', 'Modalidade')) : null,
    cedenteId: readField(item, 'cedenteId', 'CedenteId') ? String(readField(item, 'cedenteId', 'CedenteId')) : null,
    fileName: readField(item, 'fileName', 'FileName') ? String(readField(item, 'fileName', 'FileName')) : null,
    fileHash: readField(item, 'fileHash', 'FileHash') ? String(readField(item, 'fileHash', 'FileHash')) : null,
    status: String(readField(item, 'status', 'Status') ?? 'PENDENTE'),
    errorSummary: readField(item, 'errorSummary', 'ErrorSummary') ? String(readField(item, 'errorSummary', 'ErrorSummary')) : null,
    ultimoCodigoFalha: readField(item, 'ultimoCodigoFalha', 'UltimoCodigoFalha')
      ? String(readField(item, 'ultimoCodigoFalha', 'UltimoCodigoFalha'))
      : null,
    tentativas: toNumber(readField(item, 'tentativas', 'Tentativas'), 0),
    ultimaTentativaEm: readField(item, 'ultimaTentativaEm', 'UltimaTentativaEm')
      ? String(readField(item, 'ultimaTentativaEm', 'UltimaTentativaEm'))
      : null,
    correlationId: readField(item, 'correlationId', 'CorrelationId')
      ? String(readField(item, 'correlationId', 'CorrelationId'))
      : null,
    ultimoMessageId: readField(item, 'ultimoMessageId', 'UltimoMessageId')
      ? String(readField(item, 'ultimoMessageId', 'UltimoMessageId'))
      : null,
    createdAt: String(readField(item, 'createdAt', 'CreatedAt') ?? ''),
    completedAt: readField(item, 'completedAt', 'CompletedAt')
      ? String(readField(item, 'completedAt', 'CompletedAt'))
      : null,
    userEmail: readField(item, 'userEmail', 'UserEmail') ? String(readField(item, 'userEmail', 'UserEmail')) : null,
  };
};

export const mapImportacaoDetails = (raw: unknown): ImportacaoDetails => {
  const details = asRecord(raw);
  const base = mapImportacaoItem(details);
  const rawEventos = readField<unknown[]>(details, 'eventos', 'Eventos') ?? [];

  return {
    ...base,
    fileKey: readField(details, 'fileKey', 'FileKey') ? String(readField(details, 'fileKey', 'FileKey')) : null,
    eventos: Array.isArray(rawEventos)
      ? rawEventos.map((evento) => {
        const item = asRecord(evento);
        return {
          id: String(readField(item, 'id', 'Id') ?? `${Date.now()}-${Math.random()}`),
          status: String(readField(item, 'status', 'Status') ?? 'EVENTO'),
          message: readField(item, 'message', 'Message') ? String(readField(item, 'message', 'Message')) : null,
          createdAt: String(readField(item, 'createdAt', 'CreatedAt') ?? ''),
        };
      })
      : [],
  };
};

export const mapImportacoesList = (raw: unknown): ImportacaoListResponse => {
  const payload = asRecord(raw);
  const rawItems = readField<unknown[]>(payload, 'items', 'Items') ?? [];
  const items = Array.isArray(rawItems) ? rawItems.map(mapImportacaoItem).filter((item) => item.id) : [];

  return {
    items,
    page: toNumber(readField(payload, 'page', 'Page'), 1),
    pageSize: toNumber(readField(payload, 'pageSize', 'PageSize'), 10),
    totalItems: toNumber(readField(payload, 'totalItems', 'TotalItems'), items.length),
    totalPages: toNumber(readField(payload, 'totalPages', 'TotalPages'), 1),
  };
};

export const statusClass = (status?: string) =>
  status === 'FINALIZADO_SUCESSO' ? 'pill success' : status === 'FINALIZADO_FALHA' ? 'pill danger' : 'pill warn';

export const mapImportacaoExcelAnalise = (raw: unknown): ImportacaoExcelAnalise => {
  const item = asRecord(raw);
  const summaryRaw = asRecord(readField(item, 'summary', 'Summary'));
  const rawErrors = readField<unknown[]>(item, 'errors', 'Errors') ?? [];
  const rawWarnings = readField<unknown[]>(item, 'warnings', 'Warnings') ?? [];

  return {
    analysisId: String(readField(item, 'analysisId', 'AnalysisId') ?? ''),
    fileName: String(readField(item, 'fileName', 'FileName') ?? ''),
    fidcId: readField(item, 'fidcId', 'FidcId') ? String(readField(item, 'fidcId', 'FidcId')) : null,
    cedenteId: readField(item, 'cedenteId', 'CedenteId') ? String(readField(item, 'cedenteId', 'CedenteId')) : null,
    modalidade: readField(item, 'modalidade', 'Modalidade') ? String(readField(item, 'modalidade', 'Modalidade')) : null,
    status: String(readField(item, 'status', 'Status') ?? 'INVALIDA') as ImportacaoExcelAnalise['status'],
    canImport: Boolean(readField(item, 'canImport', 'CanImport')),
    summary: {
      totalLinhas: toNumber(readField(summaryRaw, 'totalLinhas', 'TotalLinhas'), 0),
      linhasValidas: toNumber(readField(summaryRaw, 'linhasValidas', 'LinhasValidas'), 0),
      linhasComErro: toNumber(readField(summaryRaw, 'linhasComErro', 'LinhasComErro'), 0),
      avisos: toNumber(readField(summaryRaw, 'avisos', 'Avisos'), 0),
      duplicadosIgnorados: toNumber(readField(summaryRaw, 'duplicadosIgnorados', 'DuplicadosIgnorados'), 0),
    },
    errors: Array.isArray(rawErrors)
      ? rawErrors.map((rawError) => {
        const error = asRecord(rawError);
        return {
          lineNumber: toNumber(readField(error, 'lineNumber', 'LineNumber'), 0),
          column: readField(error, 'column', 'Column') ? String(readField(error, 'column', 'Column')) : null,
          code: String(readField(error, 'code', 'Code') ?? ''),
          message: String(readField(error, 'message', 'Message') ?? ''),
          value: readField(error, 'value', 'Value') ? String(readField(error, 'value', 'Value')) : null,
        };
      })
      : [],
    warnings: Array.isArray(rawWarnings)
      ? rawWarnings.map((rawWarning) => {
        const warning = asRecord(rawWarning);
        const line = readField(warning, 'lineNumber', 'LineNumber');
        return {
          lineNumber: line !== undefined && line !== null ? toNumber(line, 0) : null,
          code: String(readField(warning, 'code', 'Code') ?? ''),
          message: String(readField(warning, 'message', 'Message') ?? ''),
        };
      })
      : [],
    createdAt: String(readField(item, 'createdAt', 'CreatedAt') ?? ''),
    expiresAt: String(readField(item, 'expiresAt', 'ExpiresAt') ?? ''),
  };
};
