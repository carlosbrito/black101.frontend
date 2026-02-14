export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

export type AuthMeResponse = {
  user: AuthUser;
  roles: string[];
  claims: string[];
};
