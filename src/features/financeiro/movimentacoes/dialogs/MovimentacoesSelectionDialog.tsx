export const MovimentacoesSelectionDialog = ({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (type: 'Debito' | 'Credito' | 'Transferencia') => void;
}) => {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <h3>Nova movimentação</h3>
        <p>Escolha o tipo de movimentação para abrir o formulário correspondente.</p>
        <div className="modal-actions">
          <button className="btn-muted" type="button" onClick={() => onSelect('Debito')}>Débito</button>
          <button className="btn-muted" type="button" onClick={() => onSelect('Credito')}>Crédito</button>
          <button className="btn-muted" type="button" onClick={() => onSelect('Transferencia')}>Transferência</button>
        </div>
      </div>
    </div>
  );
};
