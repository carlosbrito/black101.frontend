import type { MovimentacaoHistoryItem } from '../types';

export const MovimentacoesHistoryDialog = ({
  open,
  title,
  items,
  loading,
  onClose,
}: {
  open: boolean;
  title: string;
  items: MovimentacaoHistoryItem[];
  loading: boolean;
  onClose: () => void;
}) => {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card movimentacoes-modal-wide" onClick={(event) => event.stopPropagation()}>
        <h3>{title}</h3>
        {loading ? <p>Carregando histórico...</p> : null}
        {!loading ? (
          <ul className="movimentacoes-history-list">
            {items.map((item) => (
              <li key={item.id}>
                <strong>{item.acao}</strong>
                <span>{item.user}</span>
                <small>{item.time}</small>
              </li>
            ))}
            {items.length === 0 ? <li>Nenhum histórico encontrado.</li> : null}
          </ul>
        ) : null}
        <div className="modal-actions">
          <button className="btn-main" type="button" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
};
