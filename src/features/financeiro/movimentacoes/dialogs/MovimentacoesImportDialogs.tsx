import { useState } from 'react';
import type { MovimentacaoImportPreviewItem, MovimentacaoOption } from '../types';

export const MovimentacoesImportDialog = ({
  open,
  contaOptions,
  loading,
  onClose,
  onSubmit,
}: {
  open: boolean;
  contaOptions: MovimentacaoOption[];
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: { contaId: string; file: File | null }) => Promise<void>;
}) => {
  const [contaId, setContaId] = useState('');
  const [file, setFile] = useState<File | null>(null);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <h3>Importar movimentação financeira</h3>
        <div className="form-grid">
          <label>
            Conta
            <select value={contaId} onChange={(event) => setContaId(event.target.value)}>
              <option value="">Selecione</option>
              {contaOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label>
            Arquivo
            <input type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          </label>
        </div>
        <div className="modal-actions">
          <button className="btn-muted" type="button" onClick={onClose}>Cancelar</button>
          <button className="btn-main" type="button" disabled={loading} onClick={() => void onSubmit({ contaId, file })}>
            {loading ? 'Enviando...' : 'Continuar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const MovimentacoesImportReviewDialog = ({
  open,
  items,
  contaId,
  contaOptions,
  planoContaOptions,
  loading,
  onClose,
  onSubmit,
}: {
  open: boolean;
  items: MovimentacaoImportPreviewItem[];
  contaId: string;
  contaOptions: MovimentacaoOption[];
  planoContaOptions: MovimentacaoOption[];
  loading: boolean;
  onClose: () => void;
  onSubmit: (items: MovimentacaoImportPreviewItem[]) => Promise<void>;
}) => {
  const [localItems, setLocalItems] = useState(items);

  if (!open) return null;

  const transferenciaOptions = [{ value: 'Não Selecionado', label: 'Não Selecionado' }, ...contaOptions.filter((item) => item.value !== contaId)];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card movimentacoes-modal-wide" onClick={(event) => event.stopPropagation()}>
        <h3>Conferir importação</h3>
        <div className="movimentacoes-import-grid">
          {localItems.map((item) => (
            <div key={item.id} className="movimentacoes-import-row">
              <div>
                <strong>{item.data}</strong>
                <p>{item.historico}</p>
                <small>{item.docto}</small>
              </div>
              <div>
                <span>Crédito: {item.credito.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                <span>Débito: {item.debito.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
              <select
                value={item.planoContaId}
                onChange={(event) =>
                  setLocalItems((current) => current.map((currentItem) => currentItem.id === item.id ? { ...currentItem, planoContaId: event.target.value } : currentItem))
                }
              >
                <option value="">Plano de contas</option>
                {planoContaOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <select
                value={item.transferenciaContaId}
                onChange={(event) =>
                  setLocalItems((current) =>
                    current.map((currentItem) =>
                      currentItem.id === item.id
                        ? {
                          ...currentItem,
                          transferenciaContaId: event.target.value,
                          baixa: event.target.value !== 'Não Selecionado' ? true : currentItem.baixa,
                        }
                        : currentItem,
                    ),
                  )
                }
              >
                {transferenciaOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={item.baixa}
                  disabled={item.transferenciaContaId !== 'Não Selecionado'}
                  onChange={(event) =>
                    setLocalItems((current) => current.map((currentItem) => currentItem.id === item.id ? { ...currentItem, baixa: event.target.checked } : currentItem))
                  }
                />
                Baixa
              </label>
            </div>
          ))}
        </div>
        <div className="modal-actions">
          <button className="btn-muted" type="button" onClick={onClose}>Cancelar</button>
          <button className="btn-main" type="button" disabled={loading} onClick={() => void onSubmit(localItems)}>
            {loading ? 'Importando...' : 'Importar selecionados'}
          </button>
        </div>
      </div>
    </div>
  );
};
