export enum DebentureStatusEmissao {
  Rascunho = 1,
  Ativa = 2,
  Encerrada = 3,
}

export enum DebentureIndiceTipo {
  Cdi = 1,
  Fixo = 2,
}

export enum DebentureStatusVenda {
  Ativa = 1,
  Resgatada = 2,
  Cancelada = 3,
}

export enum DebentureTipoResgate {
  Parcial = 1,
  Total = 2,
}

export enum DebentureModoResgate {
  Quantidade = 1,
  Monetario = 2,
}

export enum DebentureStatusResgate {
  Solicitado = 1,
  Aprovado = 2,
  Reprovado = 3,
  Cancelado = 4,
}

export type DebentureSerieDto = {
  id: string;
  debentureEmissaoId: string;
  codigoSerie: string;
  indice: DebentureIndiceTipo;
  taxa: number;
  quantidade: number;
  quantidadeDisponivel: number;
  valorUnitario: number;
  dataVencimento: string;
  ativa: boolean;
};

export type DebentureEmissaoListDto = {
  id: string;
  numeroEmissao: string;
  nomeEmissao: string;
  dataEmissao: string;
  valorTotal: number;
  valorPu: number;
  quantidadeTotal: number;
  status: DebentureStatusEmissao;
  seriesCount: number;
};

export type DebentureEmissaoDetailsDto = DebentureEmissaoListDto & {
  observacoes?: string | null;
  series: DebentureSerieDto[];
};

export type DebentureVendaDto = {
  id: string;
  debentureEmissaoId: string;
  debentureSerieId: string;
  investidorNome: string;
  investidorDocumento: string;
  quantidadeVendida: number;
  quantidadeResgatada: number;
  valorUnitario: number;
  valorTotal: number;
  valorRendimentoAtual: number;
  valorIrAtual: number;
  valorIofAtual: number;
  dataVenda: string;
  dataHoraUltimaAtualizacao: string;
  status: DebentureStatusVenda;
  comprovanteNumero?: string | null;
  comprovanteEnviadoCertificadora: boolean;
};

export type DebentureResgateDto = {
  id: string;
  debentureVendaId: string;
  modoResgate: DebentureModoResgate;
  tipoResgate: DebentureTipoResgate;
  quantidadeResgatada: number;
  valorResgateMonetario: number;
  valorRendimento: number;
  valorIr: number;
  valorIof: number;
  dataSolicitacao: string;
  status: DebentureStatusResgate;
  comprovanteNumero?: string | null;
  comprovanteEnviadoCertificadora: boolean;
  observacoes?: string | null;
};

export type DebentureComprovanteDto = {
  id: string;
  numero: string;
  tipo: string;
  enviadoCertificadora: boolean;
};

export type DebentureJobDto = {
  jobId: string;
  tipo: string;
  status: string;
  mensagem: string;
};

export const debentureStatusEmissaoLabel: Record<number, string> = {
  [DebentureStatusEmissao.Rascunho]: 'Rascunho',
  [DebentureStatusEmissao.Ativa]: 'Ativa',
  [DebentureStatusEmissao.Encerrada]: 'Encerrada',
};

export const debentureStatusVendaLabel: Record<number, string> = {
  [DebentureStatusVenda.Ativa]: 'Ativa',
  [DebentureStatusVenda.Resgatada]: 'Resgatada',
  [DebentureStatusVenda.Cancelada]: 'Cancelada',
};

export const debentureStatusResgateLabel: Record<number, string> = {
  [DebentureStatusResgate.Solicitado]: 'Solicitado',
  [DebentureStatusResgate.Aprovado]: 'Aprovado',
  [DebentureStatusResgate.Reprovado]: 'Reprovado',
  [DebentureStatusResgate.Cancelado]: 'Cancelado',
};

export const debentureIndiceTipoLabel: Record<number, string> = {
  [DebentureIndiceTipo.Cdi]: 'CDI',
  [DebentureIndiceTipo.Fixo]: 'Fixo',
};

export const debentureTipoResgateLabel: Record<number, string> = {
  [DebentureTipoResgate.Parcial]: 'Parcial',
  [DebentureTipoResgate.Total]: 'Total',
};

export const debentureModoResgateLabel: Record<number, string> = {
  [DebentureModoResgate.Quantidade]: 'Por Quantidade',
  [DebentureModoResgate.Monetario]: 'Por Resgate Monetário',
};
