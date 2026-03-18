import type { MovimentacoesFilters } from '../types';

const formatDate = (date: Date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const createDefaultMovimentacoesFilters = (referenceDate = new Date()): MovimentacoesFilters => {
  const normalizedDate = new Date(referenceDate);

  return {
    start: formatDate(normalizedDate),
    end: formatDate(normalizedDate),
    sort: 'dataMovimento',
    orderBy: 'desc',
    page: 0,
    pageSize: 100,
    tipo: null,
    status: null,
    contaId: null,
    planoDeConta: null,
    cedente: null,
    keyword: null,
  };
};
