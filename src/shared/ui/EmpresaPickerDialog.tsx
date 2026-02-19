import { useEffect, useMemo, useState } from 'react';

type EmpresaOption = {
  id: string;
  nome: string;
};

type Props = {
  open: boolean;
  options: EmpresaOption[];
  onClose: () => void;
  onConfirm: (empresaId: string) => void;
  title?: string;
};

export const EmpresaPickerDialog = ({ open, options, onClose, onConfirm, title }: Props) => {
  const [selected, setSelected] = useState('');

  const normalizedOptions = useMemo(
    () => options.filter((item) => item.id && item.nome),
    [options],
  );

  useEffect(() => {
    if (!open) {
      setSelected('');
      return;
    }

    setSelected((current) => {
      if (current && normalizedOptions.some((item) => item.id === current)) {
        return current;
      }

      return normalizedOptions[0]?.id ?? '';
    });
  }, [normalizedOptions, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <h3>{title ?? 'Escolha a empresa de contexto'}</h3>
        <p>Mais de uma empresa está ativa no contexto. Selecione uma para concluir o cadastro.</p>

        <div className="form-grid">
          <label>
            Empresa
            <select value={selected} onChange={(event) => setSelected(event.target.value)}>
              {normalizedOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-muted" onClick={onClose}>Cancelar</button>
          <button
            type="button"
            className="btn-main"
            disabled={!selected}
            onClick={() => onConfirm(selected)}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};
