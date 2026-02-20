export type ListMethod = 'get' | 'post';
export type RemoveMethod = 'delete' | 'post';

export type BasicoEntityApi = {
  key: string;
  basePath: string;
  listMethod: ListMethod;
  listPath: string;
  searchParam: string;
  uniquePath: string;
  registerPath: string;
  updatePath?: string;
  removeMethod: RemoveMethod;
  removePath: string;
  removeBody?: (id: string) => Record<string, unknown>;
  supportsStatus: boolean;
};

const replaceId = (path: string, id: string) => path.replace('{id}', id);

export const buildEntityPath = (api: BasicoEntityApi, path: string, id?: string) => {
  const resolved = id ? replaceId(path, id) : path;
  return `${api.basePath}${resolved}`;
};

export const basicoEntityApis: Record<string, BasicoEntityApi> = {
  consultora: {
    key: 'consultora',
    basePath: '/api/consultora',
    listMethod: 'get',
    listPath: '/get/list',
    searchParam: 'keyword',
    uniquePath: '/get/unique/{id}',
    registerPath: '/register',
    updatePath: '/update',
    removeMethod: 'delete',
    removePath: '/remove/{id}',
    supportsStatus: true,
  },
  custodiante: {
    key: 'custodiante',
    basePath: '/api/custodiante',
    listMethod: 'get',
    listPath: '/get/list',
    searchParam: 'keyword',
    uniquePath: '/get/unique/{id}',
    registerPath: '/register',
    updatePath: '/update',
    removeMethod: 'delete',
    removePath: '/remove/{id}',
    supportsStatus: true,
  },
  gestora: {
    key: 'gestora',
    basePath: '/api/gestora',
    listMethod: 'get',
    listPath: '/get/list',
    searchParam: 'keyword',
    uniquePath: '/get/unique/{id}',
    registerPath: '/register',
    updatePath: '/update',
    removeMethod: 'delete',
    removePath: '/remove/{id}',
    supportsStatus: true,
  },
  fornecedor: {
    key: 'fornecedor',
    basePath: '/api/fornecedor',
    listMethod: 'get',
    listPath: '/get/list',
    searchParam: 'keyword',
    uniquePath: '/get/unique/{id}',
    registerPath: '/register',
    updatePath: '/update',
    removeMethod: 'delete',
    removePath: '/remove/{id}',
    supportsStatus: true,
  },
  emitente: {
    key: 'emitente',
    basePath: '/api/emitente',
    listMethod: 'post',
    listPath: '/get/list',
    searchParam: 'keyword',
    uniquePath: '/get/unique/{id}',
    registerPath: '/register',
    removeMethod: 'delete',
    removePath: '/remove/{id}',
    supportsStatus: false,
  },
  investidor: {
    key: 'investidor',
    basePath: '/api/investidor',
    listMethod: 'get',
    listPath: '/get/list',
    searchParam: 'keyword',
    uniquePath: '/get/unique/{id}',
    registerPath: '/register',
    removeMethod: 'delete',
    removePath: '/remove/{id}',
    supportsStatus: false,
  },
  prestador: {
    key: 'prestador',
    basePath: '/api/prestadorservico',
    listMethod: 'get',
    listPath: '/get/list',
    searchParam: 'keyword',
    uniquePath: '/get/unique/{id}',
    registerPath: '/register',
    removeMethod: 'post',
    removePath: '/remove',
    removeBody: (id) => ({ prestadorServicoId: id }),
    supportsStatus: false,
  },
};
