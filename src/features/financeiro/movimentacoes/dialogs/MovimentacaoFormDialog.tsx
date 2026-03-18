import { useState } from 'react';
import type { MovimentacaoFormState, MovimentacaoOption } from '../types';

export const MovimentacaoFormDialog = ({
  open,
  title,
  form,
  contaOptions,
  planoContaOptions,
  cedenteOptions,
  disabled,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  form: MovimentacaoFormState;
  contaOptions: MovimentacaoOption[];
  planoContaOptions: MovimentacaoOption[];
  cedenteOptions: MovimentacaoOption[];
  disabled: boolean;
  onClose: () => void;
  onSubmit: (form: MovimentacaoFormState) => Promise<void>;
}) => {
  const [state, setState] = useState(form);

  if (!open) {
    return null;
  }

  const isTransfer = state.tipo === 'Transferencia';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card movimentacoes-modal-wide" onClick={(event) => event.stopPropagation()}>
        <h3>{title}</h3>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void onSubmit(state);
          }}
        >
          <div className="form-grid">
            <label>
              Conta
              <select value={state.contaId} onChange={(event) => setState((current) => ({ ...current, contaId: event.target.value }))}>
                <option value="">Selecione</option>
                {contaOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            {isTransfer ? (
              <label>
                Conta destino
                <select value={state.contaDestinoId} onChange={(event) => setState((current) => ({ ...current, contaDestinoId: event.target.value }))}>
                  <option value="">Selecione</option>
                  {contaOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            ) : (
              <label>
                Plano de contas
                <select value={state.planoDeContaId} onChange={(event) => setState((current) => ({ ...current, planoDeContaId: event.target.value }))}>
                  <option value="">Selecione</option>
                  {planoContaOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            )}
            {!isTransfer ? (
              <label>
                Cedente
                <select value={state.cedenteId} onChange={(event) => setState((current) => ({ ...current, cedenteId: event.target.value }))}>
                  <option value="">Selecione</option>
                  {cedenteOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            ) : null}
            <label>
              Valor
              <input type="number" step="0.01" value={state.valor} onChange={(event) => setState((current) => ({ ...current, valor: event.target.value }))} />
            </label>
            {!isTransfer ? (
              <label>
                Valor pago
                <input type="number" step="0.01" value={state.valorPago} onChange={(event) => setState((current) => ({ ...current, valorPago: event.target.value }))} />
              </label>
            ) : null}
            <label>
              Data movimento
              <input type="date" value={state.dataMovimento} onChange={(event) => setState((current) => ({ ...current, dataMovimento: event.target.value }))} />
            </label>
            <label>
              Data pagamento
              <input type="date" value={state.dataPagamento} onChange={(event) => setState((current) => ({ ...current, dataPagamento: event.target.value }))} />
            </label>
            {!isTransfer ? (
              <label>
                Data vencimento
                <input type="date" value={state.dataVencimento} onChange={(event) => setState((current) => ({ ...current, dataVencimento: event.target.value }))} />
              </label>
            ) : null}
            {!isTransfer ? (
              <label>
                Número referência
                <input value={state.numeroReferencia} onChange={(event) => setState((current) => ({ ...current, numeroReferencia: event.target.value }))} />
              </label>
            ) : null}
            {!isTransfer ? (
              <label>
                Destino/Origem
                <input value={state.fornecededor} onChange={(event) => setState((current) => ({ ...current, fornecededor: event.target.value }))} />
              </label>
            ) : null}
            <label className="movimentacoes-form-full">
              Descrição
              <input value={state.descricao} onChange={(event) => setState((current) => ({ ...current, descricao: event.target.value }))} />
            </label>
            {!isTransfer ? (
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={state.pagamentoEfetuado}
                  onChange={(event) => setState((current) => ({ ...current, pagamentoEfetuado: event.target.checked }))}
                />
                Pagamento efetuado
              </label>
            ) : null}
          </div>
          <div className="modal-actions">
            <button className="btn-muted" type="button" onClick={onClose} disabled={disabled}>Cancelar</button>
            <button className="btn-main" type="submit" disabled={disabled}>{disabled ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
