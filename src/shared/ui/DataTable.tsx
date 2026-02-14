import './data-table.css';

export type Column<T> = {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
};

export const DataTable = <T extends { id: string }>({
  columns,
  rows,
  loading,
  onEdit,
  onDelete,
  onDetails,
}: {
  columns: Column<T>[];
  rows: T[];
  loading: boolean;
  onEdit: (row: T) => void;
  onDelete: (row: T) => void;
  onDetails: (row: T) => void;
}) => {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={String(column.key)}>{column.label}</th>
            ))}
            <th>Ações</th>
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
                <td>
                  <div className="skeleton" />
                </td>
              </tr>
            ))
            : rows.map((row) => (
              <tr key={row.id}>
                {columns.map((column) => (
                  <td key={`${row.id}-${String(column.key)}`}>
                    {column.render ? column.render(row) : String(row[column.key as keyof T] ?? '')}
                  </td>
                ))}
                <td>
                  <div className="actions">
                    <button onClick={() => onDetails(row)}>Detalhes</button>
                    <button onClick={() => onEdit(row)}>Editar</button>
                    <button className="danger" onClick={() => onDelete(row)}>Excluir</button>
                  </div>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
};
