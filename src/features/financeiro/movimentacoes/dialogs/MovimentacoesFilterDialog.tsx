import type { MovimentacoesFilters } from '../types';

export const MovimentacoesFilterDialog = ({
  open,
  initialValues,
  onClose,
  onApply,
  onReset,
}: {
  open: boolean;
  initialValues: MovimentacoesFilters;
  onClose: () => void;
  onApply: (values: MovimentacoesFilters) => void;
  onReset: () => void;
}) => {
  if (!open) {
    return null;
  }

  const form = { ...initialValues };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <h3>Filtrar movimentações</h3>
        <div className="form-grid">
          <label>
            Data inicial
            <input id="mov-start" type="date" defaultValue={form.start} />
          </label>
          <label>
            Data final
            <input id="mov-end" type="date" defaultValue={form.end} />
          </label>
          <label>
            Tipo
            <select id="mov-tipo" defaultValue={form.tipo ?? ''}>
              <option value="">Todos</option>
              <option value="0">Débito</option>
              <option value="1">Crédito</option>
              <option value="2">Transferência</option>
            </select>
          </label>
          <label>
            Status
            <select id="mov-status" defaultValue={form.status ?? ''}>
              <option value="">Todos</option>
              <option value="Aberto">Aberto</option>
              <option value="Baixado">Baixado</option>
            </select>
          </label>
          <label>
            Conta
            <input id="mov-conta" defaultValue={form.contaId ?? ''} placeholder="Conta ID" />
          </label>
          <label>
            Plano de contas
            <input id="mov-plano" defaultValue={form.planoDeConta ?? ''} placeholder="Plano de contas" />
          </label>
          <label>
            Cedente
            <input id="mov-cedente" defaultValue={form.cedente ?? ''} placeholder="Cedente" />
          </label>
          <label>
            Busca livre
            <input id="mov-keyword" defaultValue={form.keyword ?? ''} placeholder="Descrição, documento, fornecedor..." />
          </label>
        </div>
        <div className="modal-actions">
          <button className="btn-muted" type="button" onClick={onReset}>Limpar</button>
          <button className="btn-muted" type="button" onClick={onClose}>Cancelar</button>
          <button
            className="btn-main"
            type="button"
            onClick={() =>
              onApply({
                ...initialValues,
                start: (document.getElementById('mov-start') as HTMLInputElement).value,
                end: (document.getElementById('mov-end') as HTMLInputElement).value,
                tipo: (document.getElementById('mov-tipo') as HTMLSelectElement).value || null,
                status: (document.getElementById('mov-status') as HTMLSelectElement).value || null,
                contaId: (document.getElementById('mov-conta') as HTMLInputElement).value || null,
                planoDeConta: (document.getElementById('mov-plano') as HTMLInputElement).value || null,
                cedente: (document.getElementById('mov-cedente') as HTMLInputElement).value || null,
                keyword: (document.getElementById('mov-keyword') as HTMLInputElement).value || null,
                page: 0,
              })
            }
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
};
