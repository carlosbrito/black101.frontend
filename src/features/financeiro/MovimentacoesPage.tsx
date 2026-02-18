import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getErrorMessage, http } from '../../shared/api/http';
import { DataTable } from '../../shared/ui/DataTable';
import type { Column } from '../../shared/ui/DataTable';
import { PageFrame } from '../../shared/ui/PageFrame';

type MovimentacaoRow = {
  id: string;
  numeroDocumento: string;
  tipoMovimento: string;
  dataMovimento: string;
  descricao: string;
  valorDespesa: number;
  valorRecebimento: number;
  dataPagamento?: string | null;
  dataVencimento?: string | null;
};

type MovimentacaoForm = Omit<MovimentacaoRow, 'id'>;
type MovimentacaoListResponse = { items?: MovimentacaoRow[]; Items?: MovimentacaoRow[] };

const columns: Column<MovimentacaoRow>[] = [
  { key: 'numeroDocumento', label: 'Número' },
  { key: 'tipoMovimento', label: 'Tipo' },
  { key: 'dataMovimento', label: 'Data' },
  { key: 'descricao', label: 'Descrição' },
  { key: 'valorDespesa', label: 'Despesa' },
  { key: 'valorRecebimento', label: 'Recebimento' },
];

const defaultForm: MovimentacaoForm = {
  numeroDocumento: '',
  tipoMovimento: 'Credito',
  dataMovimento: new Date().toISOString().substring(0, 10),
  valorDespesa: 0,
  valorRecebimento: 0,
  descricao: '',
};

export const MovimentacoesPage = () => {
  const [rows, setRows] = useState<MovimentacaoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [current, setCurrent] = useState<MovimentacaoRow | null>(null);
  const [form, setForm] = useState<MovimentacaoForm>(defaultForm);

  const list = async () => {
    setLoading(true);
    try {
      const response = await http.get<MovimentacaoListResponse>('/financeiro/movimentacoes');
      const items = response.data.items ?? response.data.Items ?? [];
      setRows(items.map((item) => ({ ...item, id: String(item.id) })));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void list();
  }, []);

  const openCreate = () => {
    setCurrent(null);
    setForm(defaultForm);
    setModalOpen(true);
  };

  const openEdit = (row: MovimentacaoRow) => {
    setCurrent(row);
    setForm({
      numeroDocumento: row.numeroDocumento,
      tipoMovimento: row.tipoMovimento,
      dataMovimento: row.dataMovimento?.substring(0, 10),
      valorDespesa: row.valorDespesa,
      valorRecebimento: row.valorRecebimento,
      descricao: row.descricao,
    });
    setModalOpen(true);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (current) {
        await http.put(`/financeiro/movimentacoes/${current.id}`, form);
        toast.success('Movimentação atualizada');
      } else {
        await http.post('/financeiro/movimentacoes', form);
        toast.success('Movimentação criada');
      }
      setModalOpen(false);
      await list();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const onDelete = async (row: MovimentacaoRow) => {
    if (!window.confirm('Excluir movimentação?')) return;
    try {
      await http.delete(`/financeiro/movimentacoes/${row.id}`);
      toast.success('Removido');
      await list();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <PageFrame title="Movimentações Financeiras" subtitle="Gestão de entradas e saídas financeiras.">
      <div className="toolbar">
        <button className="btn-main" onClick={openCreate}>Nova movimentação</button>
      </div>

      <DataTable columns={columns} rows={rows} loading={loading} onEdit={openEdit} onDelete={onDelete} onDetails={openEdit} />

      {modalOpen ? (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>{current ? 'Editar' : 'Nova'} movimentação</h3>
            <form onSubmit={onSubmit} className="form-grid">
              <label>
                Número
                <input value={form.numeroDocumento} onChange={(e) => setForm({ ...form, numeroDocumento: e.target.value })} />
              </label>
              <label>
                Tipo
                <select value={form.tipoMovimento} onChange={(e) => setForm({ ...form, tipoMovimento: e.target.value })}>
                  <option value="Credito">Crédito</option>
                  <option value="Debito">Débito</option>
                </select>
              </label>
              <label>
                Data
                <input type="date" value={form.dataMovimento} onChange={(e) => setForm({ ...form, dataMovimento: e.target.value })} />
              </label>
              <label>
                Descrição
                <input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
              </label>
              <label>
                Valor Despesa
                <input type="number" step="0.01" value={form.valorDespesa} onChange={(e) => setForm({ ...form, valorDespesa: parseFloat(e.target.value) || 0 })} />
              </label>
              <label>
                Valor Recebimento
                <input type="number" step="0.01" value={form.valorRecebimento} onChange={(e) => setForm({ ...form, valorRecebimento: parseFloat(e.target.value) || 0 })} />
              </label>
              <label>
                Data Pagamento
                <input type="date" value={form.dataPagamento ?? ''} onChange={(e) => setForm({ ...form, dataPagamento: e.target.value || null })} />
              </label>
              <label>
                Data Vencimento
                <input type="date" value={form.dataVencimento ?? ''} onChange={(e) => setForm({ ...form, dataVencimento: e.target.value || null })} />
              </label>
              <div className="modal-actions">
                <button type="button" className="btn-muted" onClick={() => setModalOpen(false)}>Fechar</button>
                <button type="submit" className="btn-main">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </PageFrame>
  );
};
