export const MovimentacoesBatchDeleteDialog = ({
  open,
  count,
  loading,
  onClose,
  onConfirm,
}: {
  open: boolean;
  count: number;
  loading: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) => {
  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <h3>Remover registros</h3>
        <p>{count} item(ns) selecionado(s).</p>
        <textarea id="batch-delete-reason" className="movimentacoes-textarea" placeholder="Observação da exclusão" />
        <div className="modal-actions">
          <button className="btn-muted" type="button" onClick={onClose}>Cancelar</button>
          <button
            className="btn-main"
            type="button"
            disabled={loading}
            onClick={() => void onConfirm((document.getElementById('batch-delete-reason') as HTMLTextAreaElement).value)}
          >
            {loading ? 'Removendo...' : 'Remover'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const MovimentacoesBatchSettlementDialog = ({
  open,
  title,
  loading,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  loading: boolean;
  onClose: () => void;
  onConfirm: (payload: { desconto: number; juros: number; multa: number; dataPagamento: string }) => Promise<void>;
}) => {
  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <h3>{title}</h3>
        <div className="form-grid">
          <label>
            Data pagamento
            <input id="batch-data-pagamento" type="date" />
          </label>
          <label>
            Desconto
            <input id="batch-desconto" type="number" step="0.01" defaultValue="0" />
          </label>
          <label>
            Juros
            <input id="batch-juros" type="number" step="0.01" defaultValue="0" />
          </label>
          <label>
            Multa
            <input id="batch-multa" type="number" step="0.01" defaultValue="0" />
          </label>
        </div>
        <div className="modal-actions">
          <button className="btn-muted" type="button" onClick={onClose}>Cancelar</button>
          <button
            className="btn-main"
            type="button"
            disabled={loading}
            onClick={() =>
              void onConfirm({
                dataPagamento: (document.getElementById('batch-data-pagamento') as HTMLInputElement).value,
                desconto: Number((document.getElementById('batch-desconto') as HTMLInputElement).value || 0),
                juros: Number((document.getElementById('batch-juros') as HTMLInputElement).value || 0),
                multa: Number((document.getElementById('batch-multa') as HTMLInputElement).value || 0),
              })
            }
          >
            {loading ? 'Processando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const MovimentacoesBatchReopenDialog = ({
  open,
  loading,
  onClose,
  onConfirm,
}: {
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) => {
  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <h3>Reabrir movimentações</h3>
        <p>Essa ação reabre todas as movimentações selecionadas.</p>
        <div className="modal-actions">
          <button className="btn-muted" type="button" onClick={onClose}>Cancelar</button>
          <button className="btn-main" type="button" disabled={loading} onClick={() => void onConfirm()}>
            {loading ? 'Processando...' : 'Reabrir'}
          </button>
        </div>
      </div>
    </div>
  );
};
