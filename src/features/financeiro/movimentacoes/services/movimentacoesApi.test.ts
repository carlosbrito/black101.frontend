import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getMovimentacaoHistory,
  listCedenteOptions,
  listContaOptions,
  listPlanoContaOptions,
  reopenMovimentacoesBatch,
  settleMovimentacoesBatch,
} from './movimentacoesApi';

const getMock = vi.fn();
const postMock = vi.fn();

vi.mock('../../../../shared/api/http', () => ({
  http: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
  },
}));

describe('movimentacoesApi', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
  });

  it('mapeia contas, plano de contas e cedentes para options simples', async () => {
    getMock
      .mockResolvedValueOnce({ data: [{ id: '1', descricao: 'Conta XPTO' }] })
      .mockResolvedValueOnce({ data: [{ id: '2', descricao: 'Plano ABC' }] })
      .mockResolvedValueOnce({ data: [{ id: '3', pessoa: { nome: 'Cedente XPTO' } }] });

    await expect(listContaOptions()).resolves.toEqual([{ value: '1', label: 'Conta XPTO' }]);
    await expect(listPlanoContaOptions()).resolves.toEqual([{ value: '2', label: 'Plano ABC' }]);
    await expect(listCedenteOptions()).resolves.toEqual([{ value: '3', label: 'Cedente XPTO' }]);
  });

  it('normaliza o historico no formato da feature', async () => {
    getMock.mockResolvedValueOnce({
      data: {
        items: [
          { id: 'h1', acao: 'Criacao', dateCreated: '2026-03-18', userEmail: 'user@test.com' },
        ],
      },
    });

    await expect(getMovimentacaoHistory('mov-1')).resolves.toEqual([
      { id: 'h1', acao: 'Criacao', time: '2026-03-18', user: 'user@test.com' },
    ]);
  });

  it('envia os payloads de baixa e reabertura em lote para os endpoints do legado', async () => {
    postMock.mockResolvedValue({ data: null });

    await settleMovimentacoesBatch({ ids: ['1'], desconto: 1, juros: 2, multa: 3, dataPagamento: '2026-03-18' });
    await reopenMovimentacoesBatch({ ids: ['1'] });

    expect(postMock).toHaveBeenNthCalledWith(1, '/MovimentoFinanceiro/baixaLote', {
      ids: ['1'],
      desconto: 1,
      juros: 2,
      multa: 3,
      dataPagamento: '2026-03-18',
    });
    expect(postMock).toHaveBeenNthCalledWith(2, '/MovimentoFinanceiro/abrirBaixaLote', { ids: ['1'] });
  });
});
