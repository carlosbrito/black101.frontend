import { describe, expect, it } from 'vitest';
import { createDefaultMovimentacoesFilters } from './defaultFilters';

describe('createDefaultMovimentacoesFilters', () => {
  it('cria o filtro inicial do dia atual com ordenacao padrao e pagina inicial', () => {
    const result = createDefaultMovimentacoesFilters(new Date('2026-03-18T15:45:12.000Z'));

    expect(result.start).toBe('2026-03-18');
    expect(result.end).toBe('2026-03-18');
    expect(result.sort).toBe('dataMovimento');
    expect(result.orderBy).toBe('desc');
    expect(result.page).toBe(0);
    expect(result.pageSize).toBe(100);
  });
});
