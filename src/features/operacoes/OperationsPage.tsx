import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getErrorMessage, http } from '../../shared/api/http';
import { DataTable } from '../../shared/ui/DataTable';
import type { Column } from '../../shared/ui/DataTable';
import { PageFrame } from '../../shared/ui/PageFrame';
import { ImportacaoFormPanel } from './components/ImportacaoFormPanel';
import { ImportacaoHistoryPanel } from './components/ImportacaoHistoryPanel';
import './operations/importacoes.css';
import './operations/operations-unified.css';

type OperacaoRow = {
  id: string;
  identidade: number;
  numero: string;
  modalidade?: string | null;
  dataOperacao: string;
  origem?: string | null;
  cedenteNome?: string | null;
  cedenteCnpjCpf?: string | null;
  certificadora?: string | null;
  valorFace?: number | null;
  valorAPagar?: number | null;
  status: string;
  tipo?: string | null;
  quantidadeRecebiveis?: number;
  quantidadeSacados?: number;
};

type OperacaoListResponse = { items?: OperacaoRow[]; Items?: OperacaoRow[] };
type CadastroArquivoDto = {
  id: string;
  nomeArquivo: string;
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return new Intl.DateTimeFormat('pt-BR').format(parsed);
};

const formatMoney = (value?: number | null) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const statusLabel = (value?: unknown) => {
  if (!value) return '-';
  const text = String(value).trim();
  if (!text) return '-';
  return text.replaceAll('_', ' ');
};

const formatIdentity = (value?: number) => (typeof value === 'number' && Number.isFinite(value) ? `OP-${String(value).padStart(6, '0')}` : '-');

const iconPathByName = {
  download: 'M12 3v12m0 0l4-4m-4 4l-4-4M5 19h14',
  delete: 'M6 7h12M9 7V5h6v2m-7 4v6m4-6v6M7 7l1 12h8l1-12',
  attachment: 'M9 8.5l4.5-4.5a3.5 3.5 0 115 5L11 16.5a4.5 4.5 0 11-6.4-6.4l8-8',
  signers: 'M9 12a3 3 0 100-6 3 3 0 000 6zm7 2a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM3.5 20a5 5 0 0110 0m1.5 0a4 4 0 018 0',
  admin: 'M12 3l7 3v6c0 5-3.3 8.3-7 9-3.7-.7-7-4-7-9V6l7-3z',
} as const;

const Icon = ({ name }: { name: keyof typeof iconPathByName }) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d={iconPathByName[name]} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const OperacoesPage = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<OperacaoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const columns: Column<OperacaoRow>[] = [
    {
      key: 'numero',
      label: 'Operação',
      render: (row) => <button type="button" className="operation-link-btn" onClick={() => navigate(`/operacoes/${row.id}/editar`)}>{formatIdentity(row.identidade)}</button>,
      priority: 1,
    },
    { key: 'modalidade', label: 'Modalidade', render: (row) => row.modalidade ?? '-', priority: 2 },
    {
      key: 'datas',
      label: 'Datas',
      render: (row) => (
        <div className="operation-dates-cell">
          <span>{formatDate(row.dataOperacao)}</span>
        </div>
      ),
      priority: 3,
    },
    { key: 'origem', label: 'Origem', render: (row) => row.origem ?? '-', priority: 4 },
    {
      key: 'cedente',
      label: 'Cedente',
      render: (row) => (
        <div className="operation-cedente-cell">
          <span>{row.cedenteNome ?? '-'}</span>
        </div>
      ),
      priority: 5,
    },
    { key: 'certificadora', label: 'Certificadora', render: (row) => row.certificadora ?? '-' },
    { key: 'valorFace', label: 'Valor Face R$', render: (row) => formatMoney(row.valorFace) },
    { key: 'valorAPagar', label: 'A Pagar R$', render: (row) => formatMoney(row.valorAPagar) },
    { key: 'status', label: 'Status', render: (row) => statusLabel(row.status) },
    { key: 'tipo', label: 'Tipo', render: (row) => row.tipo ?? '-' },
    {
      key: 'quantidades',
      label: 'Quantidades',
      render: (row) => (
        <div className="operation-qty-cell">
          <span>Títulos: {row.quantidadeRecebiveis ?? 0}</span>
          <span>Sacados: {row.quantidadeSacados ?? 0}</span>
        </div>
      ),
    },
  ];

  const list = async () => {
    setLoading(true);
    try {
      const response = await http.get<OperacaoListResponse>('/operacoes');
      const items = response.data.items ?? response.data.Items ?? [];
      setRows(items.map((item) => ({
        ...item,
        id: String(item.id),
      })));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void list();
  }, []);

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

  const onDownloadCnab = async (row: OperacaoRow) => {
    try {
      const response = await http.get<CadastroArquivoDto[]>(`/operacoes/${row.id}/anexos`);
      const anexos = response.data ?? [];
      const cnab = anexos.find((item) => {
        const file = item.nomeArquivo?.toLowerCase() ?? '';
        return file.endsWith('.cnab') || file.endsWith('.rem') || file.endsWith('.ret') || file.includes('cnab');
      });

      if (!cnab) {
        toast.error('Arquivo CNAB não encontrado nos anexos da operação.');
        return;
      }

      const fileResponse = await http.get(`/operacoes/${row.id}/anexos/${cnab.id}/download`, { responseType: 'blob' });
      const fileName = cnab.nomeArquivo || `${row.numero}.cnab`;
      const fileUrl = window.URL.createObjectURL(fileResponse.data as Blob);
      const anchor = document.createElement('a');
      anchor.href = fileUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(fileUrl);
      toast.success('Download iniciado.');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const onOpenAnexos = (row: OperacaoRow) => {
    navigate(`/operacoes/${row.id}/editar`, { state: { initialTab: 'anexos' } });
  };

  const totalizadores = {
    operacoes: rows.length,
    valorFace: rows.reduce((sum, row) => sum + (row.valorFace ?? 0), 0),
    valorAPagar: rows.reduce((sum, row) => sum + (row.valorAPagar ?? 0), 0),
    titulos: rows.reduce((sum, row) => sum + (row.quantidadeRecebiveis ?? 0), 0),
    sacados: rows.reduce((sum, row) => sum + (row.quantidadeSacados ?? 0), 0),
  };

  return (
    <PageFrame title="Operações" subtitle="Gestão das operações.">
      <div className="toolbar operations-toolbar">
        <button className="btn-main" onClick={() => setImportModalOpen(true)}>Importar nova operação</button>
        <button className="btn-muted" onClick={() => setHistoryModalOpen(true)}>Histórico de importações</button>
      </div>

      <section
        className="operations-totalizers"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '0.65rem', margin: '0.65rem 0 0.85rem' }}
      >
        <article className="operations-totalizer-card">
          <span>Operações</span>
          <strong>{totalizadores.operacoes}</strong>
        </article>
        <article className="operations-totalizer-card">
          <span>Valor Face Total</span>
          <strong>{formatMoney(totalizadores.valorFace)}</strong>
        </article>
        <article className="operations-totalizer-card">
          <span>Valor a Pagar Total</span>
          <strong>{formatMoney(totalizadores.valorAPagar)}</strong>
        </article>
        <article className="operations-totalizer-card">
          <span>Títulos</span>
          <strong>{totalizadores.titulos}</strong>
        </article>
        <article className="operations-totalizer-card">
          <span>Sacados</span>
          <strong>{totalizadores.sacados}</strong>
        </article>
      </section>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        mobileMode="scroll"
        renderActions={(row) => (
          <div className="operations-actions-icons">
            <button type="button" className="operations-action-btn" title="Download CNAB" aria-label="Download CNAB" onClick={() => onDownloadCnab(row)}>
              <Icon name="download" />
            </button>
            <button type="button" className="operations-action-btn" title="Anexos da operação" aria-label="Anexos da operação" onClick={() => onOpenAnexos(row)}>
              <Icon name="attachment" />
            </button>
            <button
              type="button"
              className="operations-action-btn"
              title="Lista de assinantes"
              aria-label="Lista de assinantes"
              onClick={() => toast('Lista de assinantes em implementação.')}
            >
              <Icon name="signers" />
            </button>
            <button
              type="button"
              className="operations-action-btn"
              title="Status do administrador"
              aria-label="Status do administrador"
              onClick={() => toast('Status do administrador em implementação.')}
            >
              <Icon name="admin" />
            </button>
            <button type="button" className="operations-action-btn danger" title="Remover operação" aria-label="Remover operação" onClick={() => onDelete(row)}>
              <Icon name="delete" />
            </button>
          </div>
        )}
      />

      {importModalOpen ? (
        <div className="modal-backdrop" onClick={() => setImportModalOpen(false)}>
          <div className="modal-card operations-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="operations-modal-actions">
              <button type="button" className="btn-muted" onClick={() => setImportModalOpen(false)}>Fechar</button>
            </div>
            <ImportacaoFormPanel onImportCompleted={list} onCloseRequested={() => setImportModalOpen(false)} />
          </div>
        </div>
      ) : null}

      {historyModalOpen ? (
        <div className="modal-backdrop" onClick={() => setHistoryModalOpen(false)}>
          <div className="modal-card operations-modal-card operations-history-modal" onClick={(event) => event.stopPropagation()}>
            <div className="operations-modal-actions">
              <button type="button" className="btn-muted" onClick={() => setHistoryModalOpen(false)}>Fechar</button>
            </div>
            <ImportacaoHistoryPanel />
          </div>
        </div>
      ) : null}
    </PageFrame>
  );
};
