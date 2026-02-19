import { useMemo } from 'react';
import './data-table.css';

export type Column<T> = {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
  mobileLabel?: string;
  mobileHidden?: boolean;
  priority?: number;
};

export const DataTable = <T extends { id: string }>({
  columns,
  rows,
  loading,
  onEdit,
  onDelete,
  onDetails,
  renderActions,
  mobileMode = 'auto',
}: {
  columns: Column<T>[];
  rows: T[];
  loading: boolean;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  onDetails?: (row: T) => void;
  renderActions?: (row: T) => React.ReactNode;
  mobileMode?: 'auto' | 'scroll' | 'cards';
}) => {
  const hasActions = Boolean(onEdit || onDelete || onDetails || renderActions);
  const resolvedMobileMode =
    mobileMode === 'auto'
      ? columns.filter((column) => !column.mobileHidden).length <= 4
        ? 'cards'
        : 'scroll'
      : mobileMode;

  const mobileColumns = useMemo(
    () =>
      columns
        .filter((column) => !column.mobileHidden)
        .sort((left, right) => (left.priority ?? Number.MAX_SAFE_INTEGER) - (right.priority ?? Number.MAX_SAFE_INTEGER)),
    [columns],
  );

  return (
    <div className={`table-wrap table-wrap--mobile-${resolvedMobileMode}`}>
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={String(column.key)}>{column.label}</th>
            ))}
            {hasActions ? <th className="actions-col">Ações</th> : null}
          </tr>
        </thead>

        <tbody>
          {loading
            ? Array.from({ length: 8 }).map((_, idx) => (
              <tr key={idx}>
                {columns.map((col) => (
                  <td key={`${idx}-${String(col.key)}`}>
                    <div className="skeleton" />
                  </td>
                ))}
                {hasActions ? (
                  <td className="actions-col">
                    <div className="skeleton" />
                  </td>
                ) : null}
              </tr>
            ))
            : rows.map((row) => (
              <tr key={row.id}>
                {columns.map((column) => (
                  <td key={`${row.id}-${String(column.key)}`}>
                    {column.render ? column.render(row) : String(row[column.key as keyof T] ?? '')}
                  </td>
                ))}
                {hasActions ? (
                  <td className="actions-col">
                    <div className="actions">
                      {onDetails ? <button onClick={() => onDetails(row)}>Detalhes</button> : null}
                      {onEdit ? <button onClick={() => onEdit(row)}>Editar</button> : null}
                      {onDelete ? <button className="danger" onClick={() => onDelete(row)}>Excluir</button> : null}
                      {renderActions ? renderActions(row) : null}
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
        </tbody>
      </table>

      {resolvedMobileMode === 'cards' ? (
        <div className="table-mobile-cards">
          {loading
            ? Array.from({ length: 8 }).map((_, idx) => (
              <article key={`mobile-skeleton-${idx}`} className="table-mobile-card">
                {mobileColumns.map((column) => (
                  <div key={`${idx}-${String(column.key)}`} className="table-mobile-row">
                    <strong>{column.mobileLabel ?? column.label}</strong>
                    <div className="skeleton" />
                  </div>
                ))}
                {hasActions ? (
                  <div className="table-mobile-actions">
                    <div className="skeleton" />
                  </div>
                ) : null}
              </article>
            ))
            : rows.map((row) => (
              <article key={`mobile-${row.id}`} className="table-mobile-card">
                {mobileColumns.map((column) => (
                  <div key={`mobile-${row.id}-${String(column.key)}`} className="table-mobile-row">
                    <strong>{column.mobileLabel ?? column.label}</strong>
                    <span>{column.render ? column.render(row) : String(row[column.key as keyof T] ?? '')}</span>
                  </div>
                ))}
                {hasActions ? (
                  <div className="table-mobile-actions">
                    {onDetails ? <button onClick={() => onDetails(row)}>Detalhes</button> : null}
                    {onEdit ? <button onClick={() => onEdit(row)}>Editar</button> : null}
                    {onDelete ? <button className="danger" onClick={() => onDelete(row)}>Excluir</button> : null}
                    {renderActions ? renderActions(row) : null}
                  </div>
                ) : null}
              </article>
            ))}
        </div>
      ) : null}
    </div>
  );
};
