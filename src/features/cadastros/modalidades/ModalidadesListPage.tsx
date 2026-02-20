import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { getErrorMessage, http } from '../../../shared/api/http';
import { DataTable } from '../../../shared/ui/DataTable';
import type { Column } from '../../../shared/ui/DataTable';
import { PageFrame } from '../../../shared/ui/PageFrame';
import { readPagedResponse } from '../cadastroCommon';
import '../cadastro.css';

type CedenteOption = {
  id: string;
  nome: string;
  cnpjCpf?: string;
};

type ModalidadeRow = {
  id: string;
  codigo: string;
  nome: string;
  habilitado: boolean;
  tipoCalculoOperacao: string;
};

const columns: Column<ModalidadeRow>[] = [
  { key: 'codigo', label: 'Código' },
  { key: 'nome', label: 'Modalidade' },
  {
    key: 'habilitado',
    label: 'Habilitado',
    render: (row) => (
      <span style={{ color: row.habilitado ? 'var(--ok)' : 'var(--danger)', fontWeight: 700 }}>
        {row.habilitado ? 'Sim' : 'Não'}
      </span>
    ),
  },
  { key: 'tipoCalculoOperacao', label: 'Tipo cálculo' },
];

const toLabel = (value: unknown) =>
  String(value ?? '')
    .replaceAll('_', ' ')
    .trim();

const parseModalidade = (raw: unknown) => {
  if (typeof raw === 'number') {
    return { codigo: String(raw), nome: `Modalidade ${raw}` };
  }

  if (typeof raw === 'string') {
    const text = raw.trim();
    const numeric = Number(text);
    if (!Number.isNaN(numeric) && text !== '') {
      return { codigo: text, nome: `Modalidade ${text}` };
    }

    return { codigo: text || '-', nome: toLabel(text) || '-' };
  }

  if (raw && typeof raw === 'object') {
    const value = raw as Record<string, unknown>;
    const code = value.enumValue ?? value.value ?? value.codigo ?? value.code ?? '';
    const description = value.description ?? value.descricao ?? value.name ?? value.nome ?? code ?? '';
    return {
      codigo: String(code || '-'),
      nome: toLabel(description) || String(code || '-'),
    };
  }

  return { codigo: '-', nome: '-' };
};

export const ModalidadesPage = () => {
  const [cedentes, setCedentes] = useState<CedenteOption[]>([]);
  const [cedenteId, setCedenteId] = useState('');
  const [rows, setRows] = useState<ModalidadeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCedentes, setLoadingCedentes] = useState(false);

  const loadCedentes = async () => {
    setLoadingCedentes(true);
    try {
      const response = await http.post('/api/cedente/get/list', {
        page: 1,
        pageSize: 200,
      });
      const paged = readPagedResponse<Record<string, unknown>>(response.data);
      const options = paged.items.map((item) => ({
        id: String(item.id ?? ''),
        nome: String(item.nome ?? item.razaoSocial ?? ''),
        cnpjCpf: String(item.cnpjCpf ?? ''),
      })).filter((item) => item.id && item.nome);

      setCedentes(options);
      if (!cedenteId && options[0]) {
        setCedenteId(options[0].id);
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoadingCedentes(false);
    }
  };

  const loadModalidades = async () => {
    setLoading(true);
    if (!cedenteId) {
      setRows([]);
      setLoading(false);
      return;
    }

    try {
      const response = await http.get('/api/cedente/get/modalidades', {
        params: { cedenteId },
      });
      const data = Array.isArray(response.data) ? (response.data as Array<Record<string, unknown>>) : [];
      const mapped = data.map((item, index) => {
        const modalidade = parseModalidade(item.modalidade ?? item.Modalidade);
        return {
          id: `${modalidade.codigo}-${index}`,
          codigo: modalidade.codigo,
          nome: modalidade.nome,
          habilitado: Boolean(item.habilitado ?? item.Habilitado),
          tipoCalculoOperacao: toLabel(item.tipoCalculoOperacao ?? item.TipoCalculoOperacao) || '-',
        } satisfies ModalidadeRow;
      });
      setRows(mapped);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCedentes();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void loadModalidades();
  }, [cedenteId]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedCedente = useMemo(
    () => cedentes.find((item) => item.id === cedenteId) ?? null,
    [cedentes, cedenteId],
  );

  return (
    <PageFrame
      title="Cadastro de Modalidades"
      subtitle="Consulta de modalidades parametrizadas por cedente no backend."
      actions={
        <button className="btn-muted" onClick={() => void loadModalidades()} disabled={loading || !cedenteId}>
          Atualizar
        </button>
      }
    >
      <div className="toolbar">
        <label>
          <span>Cedente</span>
          <select
            value={cedenteId}
            onChange={(event) => setCedenteId(event.target.value)}
            disabled={loadingCedentes}
          >
            <option value="">{loadingCedentes ? 'Carregando cedentes...' : 'Selecione um cedente'}</option>
            {cedentes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nome} {item.cnpjCpf ? `(${item.cnpjCpf})` : ''}
              </option>
            ))}
          </select>
        </label>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
      />

      <div className="pager">
        <span>{rows.length} modalidade(s)</span>
        <span>{selectedCedente ? `Cedente selecionado: ${selectedCedente.nome}` : 'Nenhum cedente selecionado'}</span>
      </div>
    </PageFrame>
  );
};
