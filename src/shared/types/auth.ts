export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

export type EmpresaContextItem = {
  id: string;
  nome: string;
  documento?: string | null;
};

export type EmpresaContextSnapshot = {
  empresasDisponiveis: EmpresaContextItem[];
  empresasSelecionadasIds: string[];
};

export enum SegmentoEmpresa {
  Fidc = 0,
  Securitizadora = 1,
  Factoring = 2,
  Outros = 3,
}

export type AuthMeResponse = {
  user: AuthUser;
  roles: string[];
  claims: string[];
  segmentoEmpresa: SegmentoEmpresa;
  contextoEmpresas: EmpresaContextSnapshot;
};
