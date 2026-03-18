import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageFrame } from '../../../../shared/ui/PageFrame';
import { getErrorMessage } from '../../../../shared/api/http';
import toast from 'react-hot-toast';
import { AccountBalanceCards } from '../components/AccountBalanceCards';
import { MovimentacoesTable } from '../components/MovimentacoesTable';
import { MovimentacoesToolbar } from '../components/MovimentacoesToolbar';
import { mapMovimentacaoListItem } from '../mappers/movimentacoesMappers';
import { listMovimentacoes, listMovimentacoesAccountBalances } from '../services/movimentacoesApi';
import type { MovimentacaoAccountBalanceCard, MovimentacaoDialogType, MovimentacaoListRow } from '../types';
import { createDefaultMovimentacoesFilters } from '../utils/defaultFilters';
import '../components/movimentacoes.css';

export const MovimentacoesFeaturePage = () => {
  const [activeDialog, setActiveDialog] = useState<MovimentacaoDialogType>('none');
  const filters = useMemo(() => createDefaultMovimentacoesFilters(), []);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<MovimentacaoListRow[]>([]);
  const [cards, setCards] = useState<MovimentacaoAccountBalanceCard[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const [listResponse, cardsResponse] = await Promise.all([
        listMovimentacoes(filters),
        listMovimentacoesAccountBalances(filters),
      ]);

      setRows(listResponse.items.map(mapMovimentacaoListItem));
      setCards(cardsResponse);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return (
    <PageFrame
      title="Movimentações Financeiras"
      subtitle="Migração em andamento do módulo legado com a mesma regra de negócio."
    >
      <MovimentacoesToolbar onCreate={() => setActiveDialog('selection')} onRefresh={() => void loadData()} />
      {loading ? <p>Carregando movimentações...</p> : null}
      <AccountBalanceCards cards={cards} loading={loading} />
      <MovimentacoesTable rows={rows} loading={loading} />
      <p>Período atual: {filters.start} até {filters.end}</p>
      <p>Dialog ativo: {activeDialog}</p>
    </PageFrame>
  );
};
