import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getErrorMessage, http } from '../../shared/api/http';
import { DataTable } from '../../shared/ui/DataTable';
import type { Column } from '../../shared/ui/DataTable';
import { PageFrame } from '../../shared/ui/PageFrame';

const columns: Column<{ id: string; [key: string]: any }>[] = [
  { key: 'numero', label: 'Número' },
  { key: 'descricao', label: 'Descrição' },
  { key: 'valor', label: 'Valor' },
  { key: 'dataOperacao', label: 'Data' },
  { key: 'status', label: 'Status' },
];

const defaultForm = {
  numero: '',
  descricao: '',
  valor: 0,
  dataOperacao: new Date().toISOString().substring(0, 10),
  status: 'Aberta',
};

export const OperacoesPage = () => {
  const [rows, setRows] = useState<{ id: string; [key: string]: any }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [current, setCurrent] = useState<{ id: string; [key: string]: any } | null>(null);
  const [form, setForm] = useState<Record<string, any>>(defaultForm);

  const list = async () => {
    setLoading(true);
    try {
      const response = await http.get('/operacoes');
      const items = (response.data.items ?? response.data.Items ?? []) as any[];
      setRows(items.map((i) => ({ ...i, id: i.id })));
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

  const openEdit = (row: any) => {
    setCurrent(row);
    setForm({
      numero: row.numero,
      descricao: row.descricao,
      valor: row.valor,
      dataOperacao: row.dataOperacao?.substring(0, 10),
      status: row.status,
    });
    setModalOpen(true);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (current) {
        await http.put(`/operacoes/${current.id}`, form);
        toast.success('Operação atualizada');
      } else {
        await http.post('/operacoes', form);
        toast.success('Operação criada');
      }
      setModalOpen(false);
      await list();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const onDelete = async (row: any) => {
    if (!window.confirm('Excluir operação?')) return;
    try {
      await http.delete(`/operacoes/${row.id}`);
      toast.success('Removido');
      await list();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <PageFrame title="Operações" subtitle="Gestão das operações.">
      <div className="toolbar">
        <button className="btn-main" onClick={openCreate}>Nova operação</button>
      </div>

      <DataTable columns={columns} rows={rows} loading={loading} onEdit={openEdit} onDelete={onDelete} onDetails={openEdit} />

      {modalOpen ? (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>{current ? 'Editar' : 'Nova'} operação</h3>
            <form onSubmit={onSubmit} className="form-grid">
              <label>
                Número
                <input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} />
              </label>
              <label>
                Descrição
                <input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
              </label>
              <label>
                Valor
                <input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: parseFloat(e.target.value) || 0 })} />
              </label>
              <label>
                Data
                <input type="date" value={form.dataOperacao} onChange={(e) => setForm({ ...form, dataOperacao: e.target.value })} />
              </label>
              <label>
                Status
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="Aberta">Aberta</option>
                  <option value="Liquidada">Liquidada</option>
                  <option value="Cancelada">Cancelada</option>
                </select>
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
