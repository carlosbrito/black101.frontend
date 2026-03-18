import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../../app/auth/AuthContext';
import { getErrorMessage } from '../../../../shared/api/http';
import { PageFrame } from '../../../../shared/ui/PageFrame';
import { AccountBalanceCards } from '../components/AccountBalanceCards';
import { MovimentacoesTable } from '../components/MovimentacoesTable';
import { MovimentacoesToolbar } from '../components/MovimentacoesToolbar';
import { mapMovimentacaoListItem } from '../mappers/movimentacoesMappers';
import {
  createMovimentacao,
  confirmMovimentacoesImport,
  deleteMovimentacao,
  deleteMovimentacoesBatch,
  exportMovimentacoesExcel,
  generateMovimentacoesAccountingReport,
  getMovimentacaoById,
  getMovimentacaoHistory,
  listCedenteOptions,
  listContaOptions,
  listMovimentacoes,
  listMovimentacoesAccountBalances,
  listMovimentacoesImportPreview,
  listPlanoContaOptions,
  reopenMovimentacoesBatch,
  settleMovimentacoesBatch,
  uploadMovimentacoesImport,
  updateMovimentacao,
} from '../services/movimentacoesApi';
import type {
  MovimentacaoAccountBalanceCard,
  MovimentacaoFormState,
  MovimentacaoImportPreviewItem,
  MovimentacaoListRow,
  MovimentacaoOption,
  MovimentacoesFilters,
  MovimentacoesPermissions,
} from '../types';
import { validateBatchReopenSelection, validateBatchSettlementSelection } from '../utils/batchRules';
import { createDefaultMovimentacoesFilters } from '../utils/defaultFilters';
import { buildBatchSettlementPayload, buildMovimentacaoFormData } from '../utils/formPayloads';
import { resolveMovimentacoesPermissions } from '../utils/permissions';
import { MovimentacaoFormDialog } from '../dialogs/MovimentacaoFormDialog';
import { MovimentacoesBatchDeleteDialog, MovimentacoesBatchReopenDialog, MovimentacoesBatchSettlementDialog } from '../dialogs/MovimentacoesBatchDialogs';
import { MovimentacoesFilterDialog } from '../dialogs/MovimentacoesFilterDialog';
import { MovimentacoesHistoryDialog } from '../dialogs/MovimentacoesHistoryDialog';
import { MovimentacoesImportDialog, MovimentacoesImportReviewDialog } from '../dialogs/MovimentacoesImportDialogs';
import { MovimentacoesSelectionDialog } from '../dialogs/MovimentacoesSelectionDialog';
import '../../../cadastros/cadastro.css';
import '../components/movimentacoes.css';

const createEmptyForm = (tipo: MovimentacaoFormState['tipo']): MovimentacaoFormState => ({
  tipo,
  contaId: '',
  contaDestinoId: '',
  planoDeContaId: '',
  cedenteId: '',
  descricao: '',
  fornecededor: '',
  valor: '',
  valorPago: '',
  numeroReferencia: '',
  dataMovimento: new Date().toISOString().slice(0, 10),
  dataPagamento: new Date().toISOString().slice(0, 10),
  dataVencimento: new Date().toISOString().slice(0, 10),
  pagamentoEfetuado: false,
});

const mapApiItemToForm = (row: MovimentacaoListRow, tipo: MovimentacaoFormState['tipo']): MovimentacaoFormState => ({
  id: row.id,
  tipo,
  contaId: String(row.source.conta?.id ?? ''),
  contaDestinoId: String(row.source.contaDestino?.id ?? ''),
  planoDeContaId: String(row.source.planoDeConta?.id ?? ''),
  cedenteId: String(row.source.cedente?.id ?? ''),
  descricao: row.source.descricao ?? '',
  fornecededor: row.source.fornecededor ?? '',
  valor: String(row.originalValue || ''),
  valorPago: String(row.source.valorPago ?? ''),
  numeroReferencia: row.source.numeroReferencia ?? '',
  dataMovimento: row.source.dataMovimento?.slice(0, 10) ?? '',
  dataPagamento: row.source.dataPagamento?.slice(0, 10) ?? row.source.dataMovimento?.slice(0, 10) ?? '',
  dataVencimento: row.source.dataVencimento?.slice(0, 10) ?? row.source.dataMovimento?.slice(0, 10) ?? '',
  pagamentoEfetuado: Boolean(row.source.pagamentoEfetuado),
});

const resolveTipoFromCode = (code: number): MovimentacaoFormState['tipo'] => {
  if (code === 1) return 'Credito';
  if (code === 2) return 'Transferencia';
  return 'Debito';
};

export const MovimentacoesFeaturePage = () => {
  const { claims } = useAuth();
  const permissions = useMemo<MovimentacoesPermissions>(() => resolveMovimentacoesPermissions(claims), [claims]);
  const [filters, setFilters] = useState<MovimentacoesFilters>(() => createDefaultMovimentacoesFilters());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rows, setRows] = useState<MovimentacaoListRow[]>([]);
  const [cards, setCards] = useState<MovimentacaoAccountBalanceCard[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [contaOptions, setContaOptions] = useState<MovimentacaoOption[]>([]);
  const [planoContaOptions, setPlanoContaOptions] = useState<MovimentacaoOption[]>([]);
  const [cedenteOptions, setCedenteOptions] = useState<MovimentacaoOption[]>([]);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [selectionDialogOpen, setSelectionDialogOpen] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  const [batchSettlementDialogOpen, setBatchSettlementDialogOpen] = useState(false);
  const [batchReopenDialogOpen, setBatchReopenDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importReviewDialogOpen, setImportReviewDialogOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyItems, setHistoryItems] = useState<Array<{ id: string; acao: string; time: string; user: string }>>([]);
  const [historyTitle, setHistoryTitle] = useState('Histórico da movimentação');
  const [formState, setFormState] = useState<MovimentacaoFormState>(createEmptyForm('Debito'));
  const [importContaId, setImportContaId] = useState('');
  const [importPreviewItems, setImportPreviewItems] = useState<MovimentacaoImportPreviewItem[]>([]);

  const selectedRows = useMemo(() => rows.filter((row) => selectedIds.includes(row.id)), [rows, selectedIds]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [listResponse, cardsResponse] = await Promise.all([
        listMovimentacoes(filters),
        listMovimentacoesAccountBalances(filters),
      ]);

      setRows(listResponse.items.map(mapMovimentacaoListItem));
      setCards(cardsResponse);
      setSelectedIds([]);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [contas, planos, cedentes] = await Promise.all([
          listContaOptions(),
          listPlanoContaOptions(),
          listCedenteOptions(),
        ]);
        setContaOptions(contas);
        setPlanoContaOptions(planos);
        setCedenteOptions(cedentes);
      } catch {
        // opções auxiliares podem falhar sem bloquear a tela principal
      }
    };

    void loadOptions();
  }, []);

  const toggleRow = (row: MovimentacaoListRow) => {
    setSelectedIds((current) => (current.includes(row.id) ? current.filter((id) => id !== row.id) : [...current, row.id]));
  };

  const toggleAll = (checked: boolean) => {
    setSelectedIds(checked ? rows.map((row) => row.id) : []);
  };

  const openCreateForm = (tipo: MovimentacaoFormState['tipo']) => {
    setSelectionDialogOpen(false);
    setFormState(createEmptyForm(tipo));
    setFormDialogOpen(true);
  };

  const openEditForm = async (row: MovimentacaoListRow) => {
    const tipo = resolveTipoFromCode(row.tipoCode);
    setSubmitting(true);
    try {
      const fresh = await getMovimentacaoById(row.id);
      const freshRow = mapMovimentacaoListItem(fresh);
      setFormState(mapApiItemToForm(freshRow, tipo));
      setFormDialogOpen(true);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitForm = async (state: MovimentacaoFormState) => {
    setSubmitting(true);
    try {
      const formData = buildMovimentacaoFormData(state.tipo, {
        valor: Number(state.valor || 0),
        valorPago: Number(state.valorPago || 0),
        planoDeContaId: state.planoDeContaId,
        contaId: state.contaId,
        contaDestinoId: state.contaDestinoId,
        cedenteId: state.cedenteId,
        pagamentoEfetuado: state.pagamentoEfetuado,
        numeroReferencia: state.numeroReferencia,
        dataPagamento: state.dataPagamento,
        dataVencimento: state.dataVencimento,
        dataMovimento: state.dataMovimento,
        descricao: state.descricao,
        fornecededor: state.fornecededor,
      });

      if (state.id) {
        formData.set('id', state.id);
        await updateMovimentacao(formData);
        toast.success('Movimentação atualizada.');
      } else {
        await createMovimentacao(formData);
        toast.success('Movimentação criada.');
      }

      setFormDialogOpen(false);
      await loadData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (row: MovimentacaoListRow) => {
    if (!window.confirm(`Excluir movimentação ${row.descricao || row.id}?`)) {
      return;
    }

    setSubmitting(true);
    try {
      await deleteMovimentacao(row.id);
      toast.success('Movimentação removida.');
      await loadData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const openHistory = async (row: MovimentacaoListRow) => {
    setHistoryDialogOpen(true);
    setHistoryLoading(true);
    setHistoryTitle(`Histórico de ${row.descricao || row.id}`);
    try {
      setHistoryItems(await getMovimentacaoHistory(row.id));
    } catch (error) {
      toast.error(getErrorMessage(error));
      setHistoryItems([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleBatchDelete = async (reason: string) => {
    setSubmitting(true);
    try {
      await deleteMovimentacoesBatch({ ids: selectedIds, observacao: reason });
      toast.success('Movimentações removidas em lote.');
      setBatchDeleteDialogOpen(false);
      await loadData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleBatchSettlement = async (payload: { desconto: number; juros: number; multa: number; dataPagamento: string }) => {
    const validation = validateBatchSettlementSelection(selectedRows);
    if (!validation.valid) {
      toast.error(validation.message);
      return;
    }

    setSubmitting(true);
    try {
      await settleMovimentacoesBatch(buildBatchSettlementPayload({ ids: selectedIds, ...payload }));
      toast.success('Baixa em lote concluída.');
      setBatchSettlementDialogOpen(false);
      await loadData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleBatchReopen = async () => {
    const validation = validateBatchReopenSelection(selectedRows);
    if (!validation.valid) {
      toast.error(validation.message);
      return;
    }

    setSubmitting(true);
    try {
      await reopenMovimentacoesBatch({ ids: selectedIds });
      toast.success('Reabertura em lote concluída.');
      setBatchReopenDialogOpen(false);
      await loadData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = async () => {
    try {
      await exportMovimentacoesExcel(filters);
      toast.success('Exportação solicitada.');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleReport = async () => {
    try {
      await generateMovimentacoesAccountingReport({ start: filters.start, end: filters.end });
      toast.success('Relatório contábil solicitado.');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleImportUpload = async (payload: { contaId: string; file: File | null }) => {
    if (!payload.contaId || !payload.file) {
      toast.error('Selecione a conta e o arquivo do extrato.');
      return;
    }

    setSubmitting(true);
    try {
      await uploadMovimentacoesImport({ contaId: payload.contaId, file: payload.file });
      const preview = await listMovimentacoesImportPreview();
      setImportContaId(payload.contaId);
      setImportPreviewItems(preview);
      setImportDialogOpen(false);
      setImportReviewDialogOpen(true);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleImportConfirm = async (items: MovimentacaoImportPreviewItem[]) => {
    setSubmitting(true);
    try {
      await confirmMovimentacoesImport({
        contaId: importContaId,
        movimentoFinanceiroExtratoPlanoContas: items.map((item) => ({
          id: item.id,
          planoContaId: item.planoContaId,
          transferenciaContaId: item.transferenciaContaId === 'Não Selecionado' ? null : item.transferenciaContaId,
          baixa: item.baixa,
        })),
      });
      toast.success('Importação concluída.');
      setImportReviewDialogOpen(false);
      await loadData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageFrame
      title="Movimentações Financeiras"
      subtitle="Migração do legado com filtros, operações individuais e ações em lote."
    >
      <MovimentacoesToolbar
        onCreate={() => setSelectionDialogOpen(true)}
        onImport={() => setImportDialogOpen(true)}
        onOpenFilters={() => setFilterDialogOpen(true)}
        onRefresh={() => void loadData()}
        onExport={handleExport}
        onGenerateReport={handleReport}
        onDeleteBatch={() => setBatchDeleteDialogOpen(true)}
        onSettleBatch={() => setBatchSettlementDialogOpen(true)}
        onReopenBatch={() => setBatchReopenDialogOpen(true)}
        selectedCount={selectedIds.length}
        canDeleteBatch={permissions.canDeleteBatch}
        canGenerateReport={permissions.canGenerateAccountingReport}
        canImport={permissions.canImport}
        canReopenBatch={permissions.canReopenBatch}
        canSettleBatch={permissions.canSettleBatch}
        canExport={permissions.canExport}
      />
      {loading ? <p>Carregando movimentações...</p> : null}
      <AccountBalanceCards cards={cards} loading={loading} />
      <MovimentacoesTable
        rows={rows}
        loading={loading}
        selectedIds={selectedIds}
        onToggleRow={toggleRow}
        onToggleAll={toggleAll}
        onEdit={openEditForm}
        onDelete={handleDelete}
        onHistory={openHistory}
      />
      <p>Período atual: {filters.start} até {filters.end}</p>

      <MovimentacoesFilterDialog
        open={filterDialogOpen}
        initialValues={filters}
        onClose={() => setFilterDialogOpen(false)}
        onReset={() => {
          setFilters(createDefaultMovimentacoesFilters());
          setFilterDialogOpen(false);
        }}
        onApply={(nextFilters) => {
          setFilters(nextFilters);
          setFilterDialogOpen(false);
        }}
      />

      <MovimentacoesSelectionDialog
        open={selectionDialogOpen}
        onClose={() => setSelectionDialogOpen(false)}
        onSelect={openCreateForm}
      />

      <MovimentacaoFormDialog
        key={`${formState.id ?? 'new'}-${formState.tipo}`}
        open={formDialogOpen}
        title={formState.id ? `Editar ${formState.tipo}` : `Nova ${formState.tipo}`}
        form={formState}
        contaOptions={contaOptions}
        planoContaOptions={planoContaOptions}
        cedenteOptions={cedenteOptions}
        disabled={submitting}
        onClose={() => setFormDialogOpen(false)}
        onSubmit={handleSubmitForm}
      />

      <MovimentacoesHistoryDialog
        open={historyDialogOpen}
        title={historyTitle}
        items={historyItems}
        loading={historyLoading}
        onClose={() => setHistoryDialogOpen(false)}
      />

      <MovimentacoesImportDialog
        open={importDialogOpen}
        contaOptions={contaOptions}
        loading={submitting}
        onClose={() => setImportDialogOpen(false)}
        onSubmit={handleImportUpload}
      />

      <MovimentacoesImportReviewDialog
        key={`import-${importContaId}-${importPreviewItems.length}`}
        open={importReviewDialogOpen}
        items={importPreviewItems}
        contaId={importContaId}
        contaOptions={contaOptions}
        planoContaOptions={planoContaOptions}
        loading={submitting}
        onClose={() => setImportReviewDialogOpen(false)}
        onSubmit={handleImportConfirm}
      />

      <MovimentacoesBatchDeleteDialog
        open={batchDeleteDialogOpen}
        count={selectedIds.length}
        loading={submitting}
        onClose={() => setBatchDeleteDialogOpen(false)}
        onConfirm={handleBatchDelete}
      />

      <MovimentacoesBatchSettlementDialog
        open={batchSettlementDialogOpen}
        title="Baixa em lote"
        loading={submitting}
        onClose={() => setBatchSettlementDialogOpen(false)}
        onConfirm={handleBatchSettlement}
      />

      <MovimentacoesBatchReopenDialog
        open={batchReopenDialogOpen}
        loading={submitting}
        onClose={() => setBatchReopenDialogOpen(false)}
        onConfirm={handleBatchReopen}
      />
    </PageFrame>
  );
};
