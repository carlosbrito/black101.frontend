export type AuthUser = {
  id: string;
  name: string;
  email: string;
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
};
