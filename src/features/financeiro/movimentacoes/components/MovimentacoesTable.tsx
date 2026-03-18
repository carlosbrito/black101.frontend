import { DataTable, type Column } from '../../../../shared/ui/DataTable';
import type { MovimentacaoListRow } from '../types';

const columns: Column<MovimentacaoListRow>[] = [
  { key: 'tipoLabel', label: 'Tipo' },
  { key: 'dataMovimento', label: 'Data', mobileHidden: true },
  { key: 'descricao', label: 'Descrição' },
  { key: 'contaLabel', label: 'Conta', mobileHidden: true },
  { key: 'planoDeContaLabel', label: 'Plano de Contas', mobileHidden: true },
  { key: 'fornecedorOrigem', label: 'Destino/Origem', mobileHidden: true },
  { key: 'cedenteNome', label: 'Cedente', mobileHidden: true },
  {
    key: 'originalValue',
    label: 'Valor',
    render: (row) => row.originalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
  },
  { key: 'baixaLabel', label: 'Baixa' },
];

export const MovimentacoesTable = ({
  rows,
  loading,
  selectedIds,
  onToggleRow,
  onToggleAll,
  onEdit,
  onDelete,
  onHistory,
}: {
  rows: MovimentacaoListRow[];
  loading: boolean;
  selectedIds: string[];
  onToggleRow: (row: MovimentacaoListRow) => void;
  onToggleAll: (checked: boolean) => void;
  onEdit: (row: MovimentacaoListRow) => void;
  onDelete: (row: MovimentacaoListRow) => void;
  onHistory: (row: MovimentacaoListRow) => void;
}) => {
  return (
    <DataTable
      columns={columns}
      rows={rows}
      loading={loading}
      selectable
      selectedIds={selectedIds}
      onToggleRow={onToggleRow}
      onToggleAll={onToggleAll}
      onEdit={onEdit}
      onDelete={onDelete}
      onDetails={onHistory}
      mobileMode="scroll"
    />
  );
};
