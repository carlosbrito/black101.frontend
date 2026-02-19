import type { PagedResponse } from '../../shared/types/paging';

export type PessoaEnderecoInput = {
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  principal: boolean;
  cobranca?: boolean;
};

export type PessoaContatoInput = {
  nome: string;
  email: string;
  telefone1: string;
  telefone2?: string | null;
  tipoContato?: number | null;
};

export type PessoaQsaInput = {
  nome: string;
  documento: string;
  qualificacao?: string | null;
  percentual?: number | null;
};

export type PessoaDto = {
  id: string;
  nome: string;
  cnpjCpf: string;
  documentoNormalizado: string;
  tipoPessoa: string;
  email?: string | null;
  telefone?: string | null;
  cidade?: string | null;
  uf?: string | null;
  observacoesGerais?: string | null;
  ativo: boolean;
  enderecos: PessoaEnderecoInput[];
  contatos: PessoaContatoInput[];
  qsas: PessoaQsaInput[];
};

export type PessoaFormState = {
  nome: string;
  cnpjCpf: string;
  email: string;
  telefone: string;
  cidade: string;
  uf: string;
  observacoesGerais: string;
  ativo: boolean;
  enderecos: PessoaEnderecoInput[];
  contatos: PessoaContatoInput[];
  qsas: PessoaQsaInput[];
};

export type CadastroArquivoDto = {
  id: string;
  nomeArquivo: string;
  contentType: string;
  tamanhoBytes: number;
  createdAt: string;
};

export type CadastroObservacaoDto = {
  id: string;
  texto: string;
  autorEmail?: string | null;
  createdAt: string;
};

export type HistoricoItemDto = {
  id: string;
  acao: string;
  entidade: string;
  entidadeId?: string | null;
  userEmail?: string | null;
  traceId: string;
  payloadJson?: string | null;
  createdAt: string;
};

const asRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object') {
    return {};
  }

  return value as Record<string, unknown>;
};

export const readPagedResponse = <T>(value: unknown): PagedResponse<T> => {
  const data = asRecord(value);

  return {
    items: (data.items as T[] | undefined) ?? [],
    page: Number(data.page ?? 1),
    pageSize: Number(data.pageSize ?? 10),
    totalItems: Number(data.totalItems ?? 0),
    totalPages: Number(data.totalPages ?? 1),
  };
};

export const emptyToNull = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

export const sanitizeDocument = (value: string): string => value.replace(/\D/g, '');

const allDigitsEqual = (value: string): boolean => /^(\d)\1+$/.test(value);

export const sanitizePhone = (value: string): string => value.replace(/\D/g, '');

const normalizePhoneDigits = (value: string): string => {
  const digits = sanitizePhone(value);

  if (digits.length > 11 && digits.startsWith('55')) {
    return digits.slice(2, 13);
  }

  return digits.slice(0, 11);
};

export const formatCpfCnpj = (value: string): string => {
  const digits = sanitizeDocument(value);

  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }

  return value;
};

export const applyCpfCnpjMask = (value: string): string => {
  const digits = sanitizeDocument(value).slice(0, 14);

  if (digits.length <= 11) {
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }

  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
};

export const applyPhoneMask = (value: string): string => {
  const digits = normalizePhoneDigits(value);

  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

export const applyCepMask = (value: string): string => {
  const digits = sanitizeDocument(value).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

export const isValidCpf = (value: string): boolean => {
  const cpf = sanitizeDocument(value);

  if (cpf.length !== 11 || allDigitsEqual(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i += 1) {
    sum += Number(cpf[i]) * (10 - i);
  }

  let check = (sum * 10) % 11;
  if (check === 10) check = 0;
  if (check !== Number(cpf[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i += 1) {
    sum += Number(cpf[i]) * (11 - i);
  }

  check = (sum * 10) % 11;
  if (check === 10) check = 0;
  return check === Number(cpf[10]);
};

export const isValidCnpj = (value: string): boolean => {
  const cnpj = sanitizeDocument(value);

  if (cnpj.length !== 14 || allDigitsEqual(cnpj)) return false;

  const calc = (base: string, factors: number[]) => {
    const sum = base.split('').reduce((acc, char, index) => acc + Number(char) * factors[index], 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const firstDigit = calc(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const secondDigit = calc(cnpj.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);

  return firstDigit === Number(cnpj[12]) && secondDigit === Number(cnpj[13]);
};

export const isValidCpfCnpj = (value: string): boolean => {
  const digits = sanitizeDocument(value);

  if (digits.length === 11) return isValidCpf(digits);
  if (digits.length === 14) return isValidCnpj(digits);
  return false;
};

export const isValidPhone = (value: string): boolean => {
  const digits = normalizePhoneDigits(value);

  if (digits.length !== 10 && digits.length !== 11) return false;
  if (allDigitsEqual(digits)) return false;

  const areaCode = Number(digits.slice(0, 2));
  if (areaCode < 11 || areaCode > 99) return false;

  const firstLocalDigit = Number(digits[2]);
  if (digits.length === 11 && firstLocalDigit !== 9) return false;
  if (digits.length === 10 && firstLocalDigit < 2) return false;

  return true;
};

export const formatPhone = (value: string): string => applyPhoneMask(value);

export const formatDateTime = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(parsed);
};

export const buildPessoaPayload = (form: PessoaFormState) => ({
  nome: form.nome.trim(),
  cnpjCpf: form.cnpjCpf.trim(),
  email: emptyToNull(form.email),
  telefone: emptyToNull(form.telefone),
  cidade: emptyToNull(form.cidade),
  uf: emptyToNull(form.uf),
  observacoesGerais: emptyToNull(form.observacoesGerais),
  enderecos: form.enderecos,
  contatos: form.contatos,
  qsas: form.qsas,
});

export const defaultPessoaFormState: PessoaFormState = {
  nome: '',
  cnpjCpf: '',
  email: '',
  telefone: '',
  cidade: '',
  uf: '',
  observacoesGerais: '',
  ativo: true,
  enderecos: [],
  contatos: [],
  qsas: [],
};
