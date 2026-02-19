import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../app/auth/AuthContext';
import { CONTEXTO_EMPRESA_HEADER, getErrorMessage, http, requiresEmpresaChoice } from '../../shared/api/http';
import { DataTable } from '../../shared/ui/DataTable';
import type { Column } from '../../shared/ui/DataTable';
import { EmpresaPickerDialog } from '../../shared/ui/EmpresaPickerDialog';
import { PageFrame } from '../../shared/ui/PageFrame';

type OperacaoRow = {
  id: string;
  numero: string;
  descricao: string;
  valor: number;
  dataOperacao: string;
  status: string;
};

type OperacaoForm = Omit<OperacaoRow, 'id'>;
type OperacaoListResponse = { items?: OperacaoRow[]; Items?: OperacaoRow[] };

const columns: Column<OperacaoRow>[] = [
  { key: 'numero', label: 'Número' },
  { key: 'descricao', label: 'Descrição' },
  { key: 'valor', label: 'Valor' },
  { key: 'dataOperacao', label: 'Data' },
  { key: 'status', label: 'Status' },
];

const defaultForm: OperacaoForm = {
  numero: '',
  descricao: '',
  valor: 0,
  dataOperacao: new Date().toISOString().substring(0, 10),
  status: 'Aberta',
};

export const OperacoesPage = () => {
  const { contextEmpresas, selectedEmpresaIds } = useAuth();
  const [rows, setRows] = useState<OperacaoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [current, setCurrent] = useState<OperacaoRow | null>(null);
  const [form, setForm] = useState<OperacaoForm>(defaultForm);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerCallback, setPickerCallback] = useState<((empresaId: string) => Promise<void>) | null>(null);

  const list = async () => {
    setLoading(true);
    try {
      const response = await http.get<OperacaoListResponse>('/operacoes');
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

  const openEdit = (row: OperacaoRow) => {
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
      const send = async (empresaId?: string) => {
        if (current) {
          await http.put(`/operacoes/${current.id}`, form);
          toast.success('Operação atualizada');
          return;
        }

        await http.post('/operacoes', form, {
          headers: empresaId ? { [CONTEXTO_EMPRESA_HEADER]: empresaId } : undefined,
        });
        toast.success('Operação criada');
      };

      try {
        await send();
      } catch (error) {
        if (!current && requiresEmpresaChoice(error) && selectedEmpresaIds.length > 1) {
          setPickerOpen(true);
          setPickerCallback(() => async (empresaId: string) => {
            await send(empresaId);
            setModalOpen(false);
            await list();
          });
          return;
        }

        throw error;
      }

      setModalOpen(false);
      await list();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const onDelete = async (row: OperacaoRow) => {
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
      <EmpresaPickerDialog
        open={pickerOpen}
        options={contextEmpresas.filter((item) => selectedEmpresaIds.includes(item.id)).map((item) => ({ id: item.id, nome: item.nome }))}
        onClose={() => {
          setPickerOpen(false);
          setPickerCallback(null);
        }}
        onConfirm={(empresaId) => {
          const callback = pickerCallback;
          setPickerOpen(false);
          setPickerCallback(null);
          if (!callback) {
            return;
          }

          void callback(empresaId).catch((error) => {
            toast.error(getErrorMessage(error));
          });
        }}
      />
    </PageFrame>
  );
};


