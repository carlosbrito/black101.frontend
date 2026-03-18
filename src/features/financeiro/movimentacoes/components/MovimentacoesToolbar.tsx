export const MovimentacoesToolbar = ({
  onRefresh,
  onCreate,
  onOpenFilters,
  onExport,
  onGenerateReport,
  onImport,
  onDeleteBatch,
  onSettleBatch,
  onReopenBatch,
  selectedCount,
  canGenerateReport,
  canImport,
  canDeleteBatch,
  canSettleBatch,
  canReopenBatch,
  canExport,
}: {
  onRefresh: () => void;
  onCreate: () => void;
  onOpenFilters: () => void;
  onExport: () => void;
  onGenerateReport: () => void;
  onImport: () => void;
  onDeleteBatch: () => void;
  onSettleBatch: () => void;
  onReopenBatch: () => void;
  selectedCount: number;
  canGenerateReport: boolean;
  canImport: boolean;
  canDeleteBatch: boolean;
  canSettleBatch: boolean;
  canReopenBatch: boolean;
  canExport: boolean;
}) => {
  return (
    <div className="toolbar">
      <button className="btn-main" onClick={onCreate}>Nova movimentação</button>
      {canImport ? <button className="btn-muted" onClick={onImport}>Importar</button> : null}
      <button className="btn-muted" onClick={onOpenFilters}>Filtros</button>
      <button className="btn-muted" onClick={onRefresh}>Atualizar</button>
      {canExport ? <button className="btn-muted" onClick={onExport}>Exportar Excel</button> : null}
      {canGenerateReport ? <button className="btn-muted" onClick={onGenerateReport}>Gerar relatório</button> : null}
      {canDeleteBatch ? <button className="btn-muted" onClick={onDeleteBatch} disabled={selectedCount === 0}>Excluir em lote</button> : null}
      {canSettleBatch ? <button className="btn-muted" onClick={onSettleBatch} disabled={selectedCount === 0}>Baixa em lote</button> : null}
      {canReopenBatch ? <button className="btn-muted" onClick={onReopenBatch} disabled={selectedCount === 0}>Reabertura em lote</button> : null}
    </div>
  );
};
