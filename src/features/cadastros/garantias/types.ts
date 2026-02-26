export enum GarantiaTipoCategoria {
  Imovel = 1,
  Veiculo = 2,
  Recebiveis = 3,
  ContaVinculada = 4,
  FiancaAval = 5,
  CartaFianca = 6,
  Seguro = 7,
  AtivoFinanceiro = 8,
  Outros = 9,
}

export enum GarantiaStatusJuridico {
  Rascunho = 1,
  Formalizada = 2,
  Registrada = 3,
  Vigente = 4,
  Vencida = 5,
  Substituida = 6,
  Cancelada = 7,
}

export enum GarantiaPrioridadeGrau {
  Primeiro = 1,
  Segundo = 2,
  Terceiro = 3,
  Quarto = 4,
  QuintoOuMais = 5,
}

export enum GarantiaTipoParte {
  PessoaFisica = 1,
  PessoaJuridica = 2,
  Fiduciario = 3,
  Seguradora = 4,
  Banco = 5,
  Avalista = 6,
}

export enum GarantiaPapelParte {
  Proprietario = 1,
  Devedor = 2,
  Garantidor = 3,
  Beneficiario = 4,
  Credor = 5,
  Seguradora = 6,
  EmissorCarta = 7,
}

export enum GarantiaStatusDocumento {
  Pendente = 1,
  Valido = 2,
  Vencido = 3,
  Rejeitado = 4,
}

export enum GarantiaStatusAvaliacao {
  Rascunho = 1,
  Valida = 2,
  Vencida = 3,
  Reprovada = 4,
}

export enum GarantiaStatusRegistro {
  Pendente = 1,
  Registrado = 2,
  Vencido = 3,
  Cancelado = 4,
}

export enum GarantiaTipoVinculo {
  GuardaChuva = 1,
  Especifico = 2,
}

export enum GarantiaStatusVinculo {
  Ativo = 1,
  Suspenso = 2,
  Encerrado = 3,
}

export enum GarantiaTipoAlocacao {
  Percentual = 1,
  ValorFixo = 2,
}

export enum GarantiaStatusAlocacao {
  Ativa = 1,
  Encerrada = 2,
  Cancelada = 3,
}

export enum GarantiaTipoAlerta {
  VencimentoProximo = 1,
  AvaliacaoVencida = 2,
  DocumentoPendente = 3,
  DocumentoVencido = 4,
  GarantiaInsuficiente = 5,
}

export enum GarantiaSeveridadeAlerta {
  Info = 1,
  Media = 2,
  Alta = 3,
}

export enum GarantiaReferenciaTipoAlerta {
  Garantia = 1,
  Documento = 2,
  Avaliacao = 3,
  Registro = 4,
  Alocacao = 5,
}

export enum GarantiaStatusAlerta {
  Pendente = 1,
  Enviado = 2,
  Lido = 3,
  Resolvido = 4,
}

export type GarantiaTipoDto = {
  id: string;
  codigo: string;
  nome: string;
  categoria: GarantiaTipoCategoria;
  schemaCamposJson?: string | null;
  ativo: boolean;
};

export type GarantiaListDto = {
  id: string;
  tipoGarantiaId: string;
  tipoGarantiaCodigo: string;
  codigoInterno: string;
  titulo: string;
  statusJuridico: GarantiaStatusJuridico;
  valorAvaliacao: number;
  haircutPercentual: number;
  valorElegivel: number;
  valorAlocadoAtivo: number;
  valorElegivelDisponivel: number;
  validUntil?: string | null;
  alertasPendentes: number;
  createdAt: string;
};

export type GarantiaParteDto = {
  id: string;
  tipoParte: GarantiaTipoParte;
  nomeRazao: string;
  documento: string;
  ativo: boolean;
  dadosContatoJson?: string | null;
  dadosEnderecoJson?: string | null;
};

export type GarantiaParteVinculoDto = {
  id: string;
  parteId: string;
  nomeParte: string;
  documentoParte: string;
  papel: GarantiaPapelParte;
  participacaoPercentual?: number | null;
};

export type GarantiaDocumentoDto = {
  id: string;
  tipoDocumento: string;
  numero?: string | null;
  emissor?: string | null;
  emissaoEm?: string | null;
  validUntil?: string | null;
  statusDocumento: GarantiaStatusDocumento;
  arquivoRef?: string | null;
  hashArquivo?: string | null;
  metadataJson?: string | null;
  observacao?: string | null;
};

export type GarantiaAvaliacaoDto = {
  id: string;
  avaliadorParteId?: string | null;
  metodo: string;
  valorAvaliado: number;
  dataAvaliacao: string;
  validUntil?: string | null;
  haircutPercentual: number;
  valorElegivelCalculado: number;
  status: GarantiaStatusAvaliacao;
};

export type GarantiaRegistroGravameDto = {
  id: string;
  orgaoRegistro: string;
  numeroRegistro: string;
  dataRegistro: string;
  validUntil?: string | null;
  grau: GarantiaPrioridadeGrau;
  situacao: GarantiaStatusRegistro;
  detalhesJson?: string | null;
};

export type GarantiaVinculoDto = {
  id: string;
  cedenteId: string;
  cedenteNome: string;
  tipoVinculo: GarantiaTipoVinculo;
  limiteCobertura?: number | null;
  dataInicio: string;
  dataFim?: string | null;
  status: GarantiaStatusVinculo;
};

export type GarantiaAlocacaoDto = {
  id: string;
  operacaoId: string;
  operacaoNumeroControle: string;
  tipoAlocacao: GarantiaTipoAlocacao;
  percentualAlocado?: number | null;
  valorAlocado?: number | null;
  exposicaoReferencia: number;
  valorElegivelConsumido: number;
  status: GarantiaStatusAlocacao;
  dataAlocacao: string;
};

export type GarantiaHistoricoStatusDto = {
  id: string;
  statusAnterior?: GarantiaStatusJuridico | null;
  statusNovo: GarantiaStatusJuridico;
  motivo?: string | null;
  justificativa?: string | null;
  alteradoPorUserId?: string | null;
  alteradoPorNome?: string | null;
  anexosJson?: string | null;
  alteradoEm: string;
};

export type GarantiaAlertaDto = {
  id: string;
  garantiaId: string;
  tipoAlerta: GarantiaTipoAlerta;
  severidade: GarantiaSeveridadeAlerta;
  mensagem: string;
  referenciaTipo: GarantiaReferenciaTipoAlerta;
  referenciaId?: string | null;
  dispararEm: string;
  status: GarantiaStatusAlerta;
  canaisJson: string;
  resolvidoEm?: string | null;
};

export type GarantiaDetailsDto = {
  id: string;
  tipoGarantiaId: string;
  tipoGarantiaCodigo: string;
  codigoInterno: string;
  titulo: string;
  descricao?: string | null;
  dadosEspecificosJson: string;
  beneficiarioParteId?: string | null;
  credorParteId?: string | null;
  statusJuridico: GarantiaStatusJuridico;
  prioridadeGrau: GarantiaPrioridadeGrau;
  temOnus: boolean;
  onusDetalhes?: string | null;
  valorAvaliacao: number;
  dataAvaliacao: string;
  haircutPercentual: number;
  valorElegivel: number;
  valorAlocadoAtivo: number;
  valorElegivelDisponivel: number;
  validUntil?: string | null;
  moeda: string;
  ativa: boolean;
  partes: GarantiaParteVinculoDto[];
  documentos: GarantiaDocumentoDto[];
  avaliacoes: GarantiaAvaliacaoDto[];
  registros: GarantiaRegistroGravameDto[];
  vinculos: GarantiaVinculoDto[];
  alocacoes: GarantiaAlocacaoDto[];
  timelineStatus: GarantiaHistoricoStatusDto[];
  alertas: GarantiaAlertaDto[];
};

export type GarantiaFormPayload = {
  tipoGarantiaId: string;
  codigoInterno: string;
  titulo: string;
  descricao?: string | null;
  dadosEspecificosJson: string;
  beneficiarioParteId?: string | null;
  credorParteId?: string | null;
  statusJuridico: GarantiaStatusJuridico;
  prioridadeGrau: GarantiaPrioridadeGrau;
  temOnus: boolean;
  onusDetalhes?: string | null;
  valorAvaliacao: number;
  dataAvaliacao: string;
  haircutPercentual: number;
  validUntil?: string | null;
  moeda?: string | null;
  ativa: boolean;
};

export const garantiaStatusJuridicoLabel: Record<GarantiaStatusJuridico, string> = {
  [GarantiaStatusJuridico.Rascunho]: 'Rascunho',
  [GarantiaStatusJuridico.Formalizada]: 'Formalizada',
  [GarantiaStatusJuridico.Registrada]: 'Registrada',
  [GarantiaStatusJuridico.Vigente]: 'Vigente',
  [GarantiaStatusJuridico.Vencida]: 'Vencida',
  [GarantiaStatusJuridico.Substituida]: 'Substituída',
  [GarantiaStatusJuridico.Cancelada]: 'Cancelada',
};

export const garantiaPrioridadeLabel: Record<GarantiaPrioridadeGrau, string> = {
  [GarantiaPrioridadeGrau.Primeiro]: '1º Grau',
  [GarantiaPrioridadeGrau.Segundo]: '2º Grau',
  [GarantiaPrioridadeGrau.Terceiro]: '3º Grau',
  [GarantiaPrioridadeGrau.Quarto]: '4º Grau',
  [GarantiaPrioridadeGrau.QuintoOuMais]: '5º ou mais',
};

export const garantiaTipoParteLabel: Record<GarantiaTipoParte, string> = {
  [GarantiaTipoParte.PessoaFisica]: 'Pessoa Física',
  [GarantiaTipoParte.PessoaJuridica]: 'Pessoa Jurídica',
  [GarantiaTipoParte.Fiduciario]: 'Fiduciário',
  [GarantiaTipoParte.Seguradora]: 'Seguradora',
  [GarantiaTipoParte.Banco]: 'Banco',
  [GarantiaTipoParte.Avalista]: 'Avalista',
};

export const garantiaPapelParteLabel: Record<GarantiaPapelParte, string> = {
  [GarantiaPapelParte.Proprietario]: 'Proprietário',
  [GarantiaPapelParte.Devedor]: 'Devedor',
  [GarantiaPapelParte.Garantidor]: 'Garantidor',
  [GarantiaPapelParte.Beneficiario]: 'Beneficiário',
  [GarantiaPapelParte.Credor]: 'Credor',
  [GarantiaPapelParte.Seguradora]: 'Seguradora',
  [GarantiaPapelParte.EmissorCarta]: 'Emissor da Carta',
};

export const garantiaStatusDocumentoLabel: Record<GarantiaStatusDocumento, string> = {
  [GarantiaStatusDocumento.Pendente]: 'Pendente',
  [GarantiaStatusDocumento.Valido]: 'Válido',
  [GarantiaStatusDocumento.Vencido]: 'Vencido',
  [GarantiaStatusDocumento.Rejeitado]: 'Rejeitado',
};

export const garantiaStatusAvaliacaoLabel: Record<GarantiaStatusAvaliacao, string> = {
  [GarantiaStatusAvaliacao.Rascunho]: 'Rascunho',
  [GarantiaStatusAvaliacao.Valida]: 'Válida',
  [GarantiaStatusAvaliacao.Vencida]: 'Vencida',
  [GarantiaStatusAvaliacao.Reprovada]: 'Reprovada',
};

export const garantiaStatusRegistroLabel: Record<GarantiaStatusRegistro, string> = {
  [GarantiaStatusRegistro.Pendente]: 'Pendente',
  [GarantiaStatusRegistro.Registrado]: 'Registrado',
  [GarantiaStatusRegistro.Vencido]: 'Vencido',
  [GarantiaStatusRegistro.Cancelado]: 'Cancelado',
};

export const garantiaStatusVinculoLabel: Record<GarantiaStatusVinculo, string> = {
  [GarantiaStatusVinculo.Ativo]: 'Ativo',
  [GarantiaStatusVinculo.Suspenso]: 'Suspenso',
  [GarantiaStatusVinculo.Encerrado]: 'Encerrado',
};

export const garantiaTipoVinculoLabel: Record<GarantiaTipoVinculo, string> = {
  [GarantiaTipoVinculo.GuardaChuva]: 'Guarda-chuva',
  [GarantiaTipoVinculo.Especifico]: 'Específico',
};

export const garantiaStatusAlocacaoLabel: Record<GarantiaStatusAlocacao, string> = {
  [GarantiaStatusAlocacao.Ativa]: 'Ativa',
  [GarantiaStatusAlocacao.Encerrada]: 'Encerrada',
  [GarantiaStatusAlocacao.Cancelada]: 'Cancelada',
};

export const garantiaTipoAlocacaoLabel: Record<GarantiaTipoAlocacao, string> = {
  [GarantiaTipoAlocacao.Percentual]: 'Percentual',
  [GarantiaTipoAlocacao.ValorFixo]: 'Valor Fixo',
};

export const garantiaTipoAlertaLabel: Record<GarantiaTipoAlerta, string> = {
  [GarantiaTipoAlerta.VencimentoProximo]: 'Vencimento Próximo',
  [GarantiaTipoAlerta.AvaliacaoVencida]: 'Avaliação Vencida',
  [GarantiaTipoAlerta.DocumentoPendente]: 'Documento Pendente',
  [GarantiaTipoAlerta.DocumentoVencido]: 'Documento Vencido',
  [GarantiaTipoAlerta.GarantiaInsuficiente]: 'Garantia Insuficiente',
};

export const garantiaSeveridadeLabel: Record<GarantiaSeveridadeAlerta, string> = {
  [GarantiaSeveridadeAlerta.Info]: 'Info',
  [GarantiaSeveridadeAlerta.Media]: 'Média',
  [GarantiaSeveridadeAlerta.Alta]: 'Alta',
};

export const garantiaStatusAlertaLabel: Record<GarantiaStatusAlerta, string> = {
  [GarantiaStatusAlerta.Pendente]: 'Pendente',
  [GarantiaStatusAlerta.Enviado]: 'Enviado',
  [GarantiaStatusAlerta.Lido]: 'Lido',
  [GarantiaStatusAlerta.Resolvido]: 'Resolvido',
};
