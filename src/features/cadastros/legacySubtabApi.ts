import { http } from '../../shared/api/http';
import type { PagedResponse } from '../../shared/types/paging';
import type {
  CadastroArquivoDto,
  CadastroObservacaoDto,
  HistoricoItemDto,
} from './cadastroCommon';
import { readPagedResponse } from './cadastroCommon';

export const enum LegacyAssociationType {
  ADMINISTRADORA = 4,
  CEDENTE = 9,
  SACADO = 10,
  FIDC = 11,
  PRESTADOR = 62,
  FORNECEDOR = 73,
  EMITENTE = 75,
  BANCARIZADOR = 76,
  INVESTIDOR = 53,
}

export const listLegacyAttachments = async (associationId: string, associacao: LegacyAssociationType) => {
  const response = await http.get('/api/documento/get/list', {
    params: { id: associationId, associacao },
  });
  return readPagedResponse<CadastroArquivoDto>(response.data).items;
};

export const uploadLegacyAttachment = async (
  associationId: string,
  associacao: LegacyAssociationType,
  file: File,
  name?: string,
  tipo = 9,
) => {
  const formData = new FormData();
  formData.append('arquivo', file);
  formData.append('associacaoId', associationId);
  formData.append('associacao', String(associacao));
  formData.append('tipo', String(tipo));
  formData.append('nome', (name ?? file.name.replace(/\.[^.]+$/, '')).toUpperCase());
  await http.post('/api/documento/register', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const removeLegacyAttachment = async (id: string) => {
  await http.delete(`/api/documento/remove/${id}`);
};

export const getLegacyAttachmentDownloadUrl = async (id: string, associacao: LegacyAssociationType) => {
  const response = await http.get<{ urlArquivo?: string }>('/api/documento/get/url/' + id, {
    params: { associacao },
  });
  return response.data?.urlArquivo ?? null;
};

export const listLegacyObservations = async (associationId: string, associacao: LegacyAssociationType) => {
  const response = await http.get('/api/observacao/get/list', {
    params: { id: associationId, associacao },
  });
  return readPagedResponse<CadastroObservacaoDto>(response.data).items;
};

export const createLegacyObservation = async (payload: {
  associationId: string;
  associacao: LegacyAssociationType;
  titulo: string;
  observacao: string;
  cedenteId?: string;
  notificaEmail?: boolean;
}) => {
  await http.post('/api/observacao/register', {
    associacaoId: payload.associationId,
    associacao: payload.associacao,
    titulo: payload.titulo,
    observacao: payload.observacao,
    cedenteId: payload.cedenteId ?? '',
    notificaEmail: Boolean(payload.notificaEmail),
  });
};

export const removeLegacyObservation = async (id: string) => {
  await http.delete(`/api/observacao/remove/${id}`);
};

export const listLegacyHistory = async (
  associationId: string,
  associacao: LegacyAssociationType,
  page = 1,
  pageSize = 20,
): Promise<PagedResponse<HistoricoItemDto>> => {
  const response = await http.get('/api/historico/get/list', {
    params: {
      id: associationId,
      associacao,
      page,
      size: pageSize,
      orderBy: 'desc',
      sort: 'dateCreated',
    },
  });

  return readPagedResponse<HistoricoItemDto>(response.data);
};

export const listLegacyRepresentatives = async (
  entityApi: 'administradora' | 'cedente' | 'sacado',
  id: string,
  cnpjCpf?: string,
): Promise<unknown[]> => {
  const path = entityApi === 'cedente'
    ? `/api/${entityApi}/get/list/representante`
    : `/api/${entityApi}/get/representante`;
  const response = await http.get(path, {
    params: {
      id,
      ...(cnpjCpf ? { cnpjCpf } : {}),
    },
  });
  return readPagedResponse<unknown>(response.data).items;
};

export const createLegacyRepresentative = async (
  entityApi: 'administradora' | 'cedente' | 'sacado',
  payload: Record<string, unknown>,
) => {
  if (entityApi === 'cedente') {
    await http.post(`/api/${entityApi}/representante`, payload);
    return;
  }

  await http.post('/api/representante/associacao', payload);
};

export const updateLegacyRepresentative = async (
  entityApi: 'administradora' | 'cedente' | 'sacado',
  payload: Record<string, unknown>,
) => {
  await http.put(`/api/${entityApi}/representante/update`, payload);
};

export const removeLegacyRepresentative = async (
  entityApi: 'administradora' | 'cedente' | 'sacado',
  id: string,
) => {
  await http.delete(`/api/${entityApi}/representante/remove/${id}`);
};

export const listLegacyAccounts = async (
  associationId: string,
  associacao: LegacyAssociationType,
): Promise<unknown[]> => {
  const response = await http.get('/api/conta/get', {
    params: {
      id: associationId,
      associacao,
    },
  });
  return readPagedResponse<unknown>(response.data).items;
};
