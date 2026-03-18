import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MovimentacoesFeaturePage } from './MovimentacoesFeaturePage';

const listMovimentacoesMock = vi.fn();
const listAccountBalancesMock = vi.fn();

vi.mock('../../../../app/auth/AuthContext', () => ({
  useAuth: () => ({
    claims: ['E_MFI', 'R_MFI', 'R_MFI_LOTE', 'E_MFI_BLT', 'W_RCT'],
  }),
}));

vi.mock('../services/movimentacoesApi', () => ({
  listMovimentacoes: (...args: unknown[]) => listMovimentacoesMock(...args),
  listMovimentacoesAccountBalances: (...args: unknown[]) => listAccountBalancesMock(...args),
  listContaOptions: vi.fn().mockResolvedValue([]),
  listPlanoContaOptions: vi.fn().mockResolvedValue([]),
  listCedenteOptions: vi.fn().mockResolvedValue([]),
  getMovimentacaoById: vi.fn(),
  createMovimentacao: vi.fn(),
  updateMovimentacao: vi.fn(),
  deleteMovimentacao: vi.fn(),
  deleteMovimentacoesBatch: vi.fn(),
  settleMovimentacoesBatch: vi.fn(),
  reopenMovimentacoesBatch: vi.fn(),
  getMovimentacaoHistory: vi.fn().mockResolvedValue([]),
  exportMovimentacoesExcel: vi.fn(),
  generateMovimentacoesAccountingReport: vi.fn(),
  uploadMovimentacoesImport: vi.fn(),
  listMovimentacoesImportPreview: vi.fn().mockResolvedValue([]),
  confirmMovimentacoesImport: vi.fn(),
}));

describe('MovimentacoesFeaturePage', () => {
  beforeEach(() => {
    listMovimentacoesMock.mockResolvedValue({
      items: [
        {
          id: '1',
          tipoMovimento: 0,
          pagamentoEfetuado: false,
          valorDespesa: 1250.45,
          valorRecebimento: 0,
          valorPago: 0,
          totalizador: 2200,
          descricao: '',
          fornecededor: '',
          cedente: null,
          planoDeConta: { descricao: 'Despesa Operacional' },
          conta: { descricao: '', banco: { codigo: 341 }, agencia: '1234', numeroConta: '9999-1' },
          contaDestino: null,
          dataMovimento: '2026-03-18T00:00:00',
          dateCreated: '2026-03-18T10:00:00',
        },
      ],
      page: 0,
      pageSize: 100,
      totalItems: 1,
    });

    listAccountBalancesMock.mockResolvedValue([
      {
        id: 'saldo-1',
        title: 'Conta cobrança',
        subtitle: '341 - AG. 1234 - CC. 9999-1',
        amount: 25000.75,
      },
    ]);
  });

  it('carrega cards e tabela ao abrir a rota', async () => {
    render(<MovimentacoesFeaturePage />);

    expect(screen.getByText('Carregando movimentações...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Conta cobrança')).toBeInTheDocument();
    });

    expect(screen.getByText('Despesa Operacional')).toBeInTheDocument();
    expect(screen.getByText('Débito')).toBeInTheDocument();
    expect(listMovimentacoesMock).toHaveBeenCalledTimes(1);
    expect(listAccountBalancesMock).toHaveBeenCalledTimes(1);
  });

  it('permite atualizar manualmente os dados da tela', async () => {
    render(<MovimentacoesFeaturePage />);

    await waitFor(() => {
      expect(screen.getByText('Conta cobrança')).toBeInTheDocument();
    });

    const listCallsBeforeRefresh = listMovimentacoesMock.mock.calls.length;
    const balanceCallsBeforeRefresh = listAccountBalancesMock.mock.calls.length;

    fireEvent.click(screen.getByRole('button', { name: 'Atualizar' }));

    await waitFor(() => {
      expect(listMovimentacoesMock.mock.calls.length).toBe(listCallsBeforeRefresh + 1);
      expect(listAccountBalancesMock.mock.calls.length).toBe(balanceCallsBeforeRefresh + 1);
    });
  });
});
