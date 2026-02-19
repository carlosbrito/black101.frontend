import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../app/auth/AuthContext';
import { CONTEXTO_EMPRESA_HEADER, getErrorMessage, http, requiresEmpresaChoice } from '../../shared/api/http';
import { DataTable, type Column } from '../../shared/ui/DataTable';
import { EmpresaPickerDialog } from '../../shared/ui/EmpresaPickerDialog';
import { PageFrame } from '../../shared/ui/PageFrame';
import { formatDateTime } from '../cadastros/cadastroCommon';
import './operations/importacoes.css';

type ImportacaoItem = {
  id: string;
  fidcId?: string | null;
  origem?: string | null;
  tipoArquivo?: string | null;
  tipoBanco?: string | null;
  tipoCnab?: string | null;
  modalidade?: string | null;
  cedenteId?: string | null;
  fileName?: string | null;
  fileHash?: string | null;
  status: string;
  errorSummary?: string | null;
  ultimoCodigoFalha?: string | null;
  tentativas?: number;
  ultimaTentativaEm?: string | null;
  correlationId?: string | null;
  ultimoMessageId?: string | null;
  createdAt?: string;
  completedAt?: string | null;
  userEmail?: string | null;
};

type ImportacaoDetails = ImportacaoItem & {
  fileKey?: string | null;
  eventos: Array<{ id: string; status: string; message?: string | null; createdAt: string }>;
};

type CedenteAtivoOption = {
  id: string;
  nome: string;
  cnpjCpf: string;
};

type BancoOption = {
  id: string;
  nome: string;
  codigo: string;
};

type FormState = {
  cedenteId: string;
  modalidade: string;
  tipoBanco: string;
  tipoCnab: string;
};

type FormErrors = {
  cedenteId?: string;
  arquivo?: string;
};

type ImportacaoListResponse = {
  items: ImportacaoItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

type FetchDetailsOptions = {
  silent?: boolean;
};

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const acceptedExtensions = new Set(['.rem', '.txt', '.cnab', '.xml', '.zip']);
const cnabTipoOptions = ['240', '400', 'Outro'];

const asRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object') return {};
  return value as Record<string, unknown>;
};

const readField = <T,>(value: Record<string, unknown>, ...keys: string[]): T | undefined => {
  for (const key of keys) {
    const found = value[key];
    if (found !== undefined && found !== null) return found as T;
  }
  return undefined;
};

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const inferTipoArquivo = (fileName: string): 'CNAB' | 'XML' | 'ZIP' => {
  const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
  if (ext === '.xml') return 'XML';
  if (ext === '.zip') return 'ZIP';
  return 'CNAB';
};

const isProcessing = (status?: string) => status === 'PROCESSANDO' || status === 'VALIDADO' || status === 'PENDENTE';

const mapImportacaoItem = (raw: unknown): ImportacaoItem => {
  const item = asRecord(raw);

  return {
    id: String(readField(item, 'id', 'Id') ?? ''),
    fidcId: readField(item, 'fidcId', 'FidcId') ? String(readField(item, 'fidcId', 'FidcId')) : null,
    origem: readField(item, 'origem', 'Origem') ? String(readField(item, 'origem', 'Origem')) : null,
    tipoArquivo: readField(item, 'tipoArquivo', 'TipoArquivo') ? String(readField(item, 'tipoArquivo', 'TipoArquivo')) : null,
    tipoBanco: readField(item, 'tipoBanco', 'TipoBanco') ? String(readField(item, 'tipoBanco', 'TipoBanco')) : null,
    tipoCnab: readField(item, 'tipoCnab', 'TipoCnab') ? String(readField(item, 'tipoCnab', 'TipoCnab')) : null,
    modalidade: readField(item, 'modalidade', 'Modalidade') ? String(readField(item, 'modalidade', 'Modalidade')) : null,
    cedenteId: readField(item, 'cedenteId', 'CedenteId') ? String(readField(item, 'cedenteId', 'CedenteId')) : null,
    fileName: readField(item, 'fileName', 'FileName') ? String(readField(item, 'fileName', 'FileName')) : null,
    fileHash: readField(item, 'fileHash', 'FileHash') ? String(readField(item, 'fileHash', 'FileHash')) : null,
    status: String(readField(item, 'status', 'Status') ?? 'PENDENTE'),
    errorSummary: readField(item, 'errorSummary', 'ErrorSummary') ? String(readField(item, 'errorSummary', 'ErrorSummary')) : null,
    ultimoCodigoFalha: readField(item, 'ultimoCodigoFalha', 'UltimoCodigoFalha')
      ? String(readField(item, 'ultimoCodigoFalha', 'UltimoCodigoFalha'))
      : null,
    tentativas: toNumber(readField(item, 'tentativas', 'Tentativas'), 0),
    ultimaTentativaEm: readField(item, 'ultimaTentativaEm', 'UltimaTentativaEm')
      ? String(readField(item, 'ultimaTentativaEm', 'UltimaTentativaEm'))
      : null,
    correlationId: readField(item, 'correlationId', 'CorrelationId')
      ? String(readField(item, 'correlationId', 'CorrelationId'))
      : null,
    ultimoMessageId: readField(item, 'ultimoMessageId', 'UltimoMessageId')
      ? String(readField(item, 'ultimoMessageId', 'UltimoMessageId'))
      : null,
    createdAt: String(readField(item, 'createdAt', 'CreatedAt') ?? ''),
    completedAt: readField(item, 'completedAt', 'CompletedAt')
      ? String(readField(item, 'completedAt', 'CompletedAt'))
      : null,
    userEmail: readField(item, 'userEmail', 'UserEmail') ? String(readField(item, 'userEmail', 'UserEmail')) : null,
  };
};

const mapImportacaoDetails = (raw: unknown): ImportacaoDetails => {
  const details = asRecord(raw);
  const base = mapImportacaoItem(details);
  const rawEventos = readField<unknown[]>(details, 'eventos', 'Eventos') ?? [];

  return {
    ...base,
    fileKey: readField(details, 'fileKey', 'FileKey') ? String(readField(details, 'fileKey', 'FileKey')) : null,
    eventos: Array.isArray(rawEventos)
      ? rawEventos.map((evento) => {
        const item = asRecord(evento);
        return {
          id: String(readField(item, 'id', 'Id') ?? `${Date.now()}-${Math.random()}`),
          status: String(readField(item, 'status', 'Status') ?? 'EVENTO'),
          message: readField(item, 'message', 'Message') ? String(readField(item, 'message', 'Message')) : null,
          createdAt: String(readField(item, 'createdAt', 'CreatedAt') ?? ''),
        };
      })
      : [],
  };
};

const mapImportacoesList = (raw: unknown): ImportacaoListResponse => {
  const payload = asRecord(raw);
  const rawItems = readField<unknown[]>(payload, 'items', 'Items') ?? [];
  const items = Array.isArray(rawItems) ? rawItems.map(mapImportacaoItem).filter((item) => item.id) : [];

  return {
    items,
    page: toNumber(readField(payload, 'page', 'Page'), 1),
    pageSize: toNumber(readField(payload, 'pageSize', 'PageSize'), 10),
    totalItems: toNumber(readField(payload, 'totalItems', 'TotalItems'), items.length),
    totalPages: toNumber(readField(payload, 'totalPages', 'TotalPages'), 1),
  };
};

const formatDateOrDash = (value?: string | null) => (value ? formatDateTime(value) : '-');

const statusClass = (status?: string) =>
  status === 'FINALIZADO_SUCESSO' ? 'pill success' : status === 'FINALIZADO_FALHA' ? 'pill danger' : 'pill warn';

export const ImportacoesPage = () => {
  const { contextEmpresas, selectedEmpresaIds } = useAuth();
  const [rows, setRows] = useState<ImportacaoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [selected, setSelected] = useState<ImportacaoDetails | null>(null);
  const [selectedLoading, setSelectedLoading] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [fileHash, setFileHash] = useState('');
  const [hashing, setHashing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerCallback, setPickerCallback] = useState<((empresaId: string) => Promise<void>) | null>(null);

  const [form, setForm] = useState<FormState>({
    cedenteId: '',
    modalidade: '',
    tipoBanco: '',
    tipoCnab: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const [cedentesAtivos, setCedentesAtivos] = useState<CedenteAtivoOption[]>([]);
  const [cedentesLoading, setCedentesLoading] = useState(false);
  const [modalidadeOptions, setModalidadeOptions] = useState<string[]>([]);
  const [modalidadeLoading, setModalidadeLoading] = useState(false);
  const [bancoOptions, setBancoOptions] = useState<BancoOption[]>([]);
  const [bancosLoading, setBancosLoading] = useState(false);

  const intervalRef = useRef<ReturnType<typeof window.setInterval> | null>(null);
  const selectedIdRef = useRef<string | null>(null);

  const tipoArquivoAtual = useMemo(() => (file ? inferTipoArquivo(file.name) : ''), [file]);
  const isCnab = tipoArquivoAtual === 'CNAB';

  const cedenteLookup = useMemo(
    () => new Map(cedentesAtivos.map((item) => [item.id, `${item.nome} (${item.cnpjCpf})`])),
    [cedentesAtivos],
  );

  const columns: Column<ImportacaoItem>[] = useMemo(
    () => [
      { key: 'fileName', label: 'Arquivo', render: (row) => row.fileName ?? '-' },
      { key: 'tipoArquivo', label: 'Tipo', render: (row) => row.tipoArquivo ?? '-' },
      { key: 'origem', label: 'Origem', render: (row) => row.origem ?? '-' },
      {
        key: 'cedenteId',
        label: 'Cedente',
        render: (row) => (row.cedenteId ? (cedenteLookup.get(row.cedenteId) ?? row.cedenteId) : '-'),
      },
      {
        key: 'status',
        label: 'Status',
        render: (row) => <span className={statusClass(row.status)}>{row.status}</span>,
      },
      { key: 'createdAt', label: 'Criado em', render: (row) => formatDateOrDash(row.createdAt), mobileHidden: true },
      { key: 'completedAt', label: 'Concluído em', render: (row) => formatDateOrDash(row.completedAt), mobileHidden: true },
      { key: 'tentativas', label: 'Tentativas', render: (row) => String(row.tentativas ?? 0), mobileHidden: true },
      { key: 'errorSummary', label: 'Erro resumido', render: (row) => row.errorSummary ?? '-', mobileHidden: true },
    ],
    [cedenteLookup],
  );

  const stopPolling = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const list = useCallback(async () => {
    setLoading(true);
    try {
      const response = await http.get('/operacoes/importacoes', {
        params: { page, pageSize },
      });
      const data = mapImportacoesList(response.data);
      setRows(data.items);
      setTotalPages(Math.max(1, data.totalPages));
      setTotalItems(data.totalItems);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  const fetchDetailsById = useCallback(async (id: string, options?: FetchDetailsOptions) => {
    if (!options?.silent) {
      setSelectedLoading(true);
    }

    try {
      const response = await http.get(`/operacoes/importacoes/${id}`);
      setSelected(mapImportacaoDetails(response.data));
      selectedIdRef.current = id;
    } catch (error) {
      if (!options?.silent) {
        toast.error(getErrorMessage(error));
      }
    } finally {
      if (!options?.silent) {
        setSelectedLoading(false);
      }
    }
  }, []);

  const loadCedentesAtivos = useCallback(async () => {
    setCedentesLoading(true);
    try {
      const response = await http.get('/cadastros/cedentes/ativos');
      const data = Array.isArray(response.data) ? response.data : [];
      const options = data
        .map((item) => {
          const row = asRecord(item);
          return {
            id: String(readField(row, 'id', 'Id') ?? ''),
            nome: String(readField(row, 'nome', 'Nome') ?? ''),
            cnpjCpf: String(readField(row, 'cnpjCpf', 'CnpjCpf') ?? ''),
          };
        })
        .filter((item) => item.id && item.nome);

      setCedentesAtivos(options);
      if (options.length === 0) {
        setForm((current) => ({ ...current, cedenteId: '', modalidade: '' }));
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
      setCedentesAtivos([]);
    } finally {
      setCedentesLoading(false);
    }
  }, []);

  const loadBancos = useCallback(async () => {
    setBancosLoading(true);
    try {
      const response = await http.get('/cadastros/bancos', {
        params: { page: 1, pageSize: 200 },
      });
      const rawPayload = asRecord(response.data);
      const rawItems = readField<unknown[]>(rawPayload, 'items', 'Items') ?? [];
      const bancos = Array.isArray(rawItems)
        ? rawItems
          .map((item) => {
            const row = asRecord(item);
            return {
              id: String(readField(row, 'id', 'Id') ?? ''),
              nome: String(readField(row, 'nome', 'Nome') ?? ''),
              codigo: String(readField(row, 'codigo', 'Codigo') ?? ''),
            };
          })
          .filter((item) => item.id && item.nome)
        : [];
      setBancoOptions(bancos);
    } catch {
      setBancoOptions([]);
    } finally {
      setBancosLoading(false);
    }
  }, []);

  const loadModalidades = useCallback(async (cedenteId: string) => {
    if (!cedenteId) {
      setModalidadeOptions([]);
      setForm((current) => ({ ...current, modalidade: '' }));
      return;
    }

    setModalidadeLoading(true);
    try {
      const response = await http.get(`/cadastros/cedentes/${cedenteId}/parametrizacao`);
      const rows = Array.isArray(response.data) ? response.data : [];
      const modalidades = Array.from(
        new Set(
          rows
            .map((item) => {
              const row = asRecord(item);
              const value = readField(row, 'modalidade', 'Modalidade');
              return value ? String(value) : '';
            })
            .filter((item) => item.length > 0),
        ),
      );

      setModalidadeOptions(modalidades);
      setForm((current) =>
        modalidades.length === 0 || !modalidades.includes(current.modalidade)
          ? { ...current, modalidade: '' }
          : current,
      );
    } catch {
      setModalidadeOptions([]);
      setForm((current) => ({ ...current, modalidade: '' }));
    } finally {
      setModalidadeLoading(false);
    }
  }, []);

  useEffect(() => {
    void list();
  }, [list]);

  useEffect(() => {
    void loadCedentesAtivos();
    void loadBancos();
  }, [loadCedentesAtivos, loadBancos]);

  useEffect(() => {
    void loadModalidades(form.cedenteId);
  }, [form.cedenteId, loadModalidades]);

  useEffect(() => {
    if (!isCnab) {
      setForm((current) => ({ ...current, tipoBanco: '', tipoCnab: '' }));
    }
  }, [isCnab]);

  useEffect(() => {
    selectedIdRef.current = selected?.id ?? null;
  }, [selected?.id]);

  useEffect(() => {
    const shouldPoll = rows.some((row) => isProcessing(row.status)) || isProcessing(selected?.status);

    if (!shouldPoll) {
      stopPolling();
      return;
    }

    if (intervalRef.current !== null) {
      return;
    }

    intervalRef.current = window.setInterval(() => {
      void list();
      if (selectedIdRef.current) {
        void fetchDetailsById(selectedIdRef.current, { silent: true });
      }
    }, 5000);

    return () => stopPolling();
  }, [rows, selected?.status, fetchDetailsById, list, stopPolling]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const computeHash = async (inputFile: File) => {
    const buffer = await inputFile.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const bytes = Array.from(new Uint8Array(hashBuffer));
    return bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
  };

  const onFileChange = async (inputFile: File | null) => {
    setErrors((current) => ({ ...current, arquivo: undefined }));
    setFile(null);
    setFileHash('');

    if (!inputFile) return;

    const extension = inputFile.name.slice(inputFile.name.lastIndexOf('.')).toLowerCase();
    if (!acceptedExtensions.has(extension)) {
      setErrors((current) => ({ ...current, arquivo: 'Extensão inválida. Use .rem, .txt, .cnab, .xml ou .zip.' }));
      toast.error('Extensão inválida para importação.');
      return;
    }

    if (inputFile.size > MAX_FILE_BYTES) {
      setErrors((current) => ({ ...current, arquivo: 'Arquivo excede 20MB.' }));
      toast.error('Arquivo excede o limite de 20MB.');
      return;
    }

    setFile(inputFile);
    setHashing(true);
    try {
      const hash = await computeHash(inputFile);
      setFileHash(hash);
    } catch {
      toast.error('Falha ao calcular hash do arquivo.');
    } finally {
      setHashing(false);
    }
  };

  const reprocessar = async (id: string) => {
    try {
      await http.post(`/operacoes/importacoes/${id}/reprocessar`);
      toast.success('Reprocessamento solicitado.');
      await list();
      if (selected?.id === id) {
        await fetchDetailsById(id);
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const openDetails = (row: ImportacaoItem) => {
    void fetchDetailsById(row.id);
  };

  const copyText = async (value: string | null | undefined, label: string) => {
    if (!value) {
      toast.error(`${label} indisponível.`);
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copiado.`);
    } catch {
      toast.error(`Não foi possível copiar ${label.toLowerCase()}.`);
    }
  };

  const validateForm = () => {
    const nextErrors: FormErrors = {};

    if (!form.cedenteId) {
      nextErrors.cedenteId = 'Selecione um cedente ativo.';
    }

    if (!file) {
      nextErrors.arquivo = 'Selecione um arquivo válido para enviar.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (hashing) {
      toast.error('Aguarde o cálculo do hash do arquivo.');
      return;
    }

    if (!validateForm() || !file) {
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('arquivo', file);
      formData.append('cedenteId', form.cedenteId);
      formData.append('tipoArquivo', inferTipoArquivo(file.name));

      if (form.modalidade) formData.append('modalidade', form.modalidade);
      if (fileHash) formData.append('fileHash', fileHash);
      if (inferTipoArquivo(file.name) === 'CNAB') {
        if (form.tipoBanco) formData.append('tipoBanco', form.tipoBanco);
        if (form.tipoCnab) formData.append('tipoCnab', form.tipoCnab);
      }

      const sendImportacao = async (empresaId?: string) => {
        const response = await http.post('/operacoes/importacoes', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            ...(empresaId ? { [CONTEXTO_EMPRESA_HEADER]: empresaId } : {}),
          },
        });
        return asRecord(response.data);
      };

      try {
        const responseBody = await sendImportacao();
        const importacaoId = readField<string>(responseBody, 'importacaoId');

        toast.success('Importação enviada para processamento.');
        setFile(null);
        setFileHash('');
        setErrors({});

        await list();
        if (importacaoId) {
          await fetchDetailsById(importacaoId);
        }
      } catch (error) {
        if (!requiresEmpresaChoice(error) || selectedEmpresaIds.length <= 1) {
          throw error;
        }

        setPickerOpen(true);
        setPickerCallback(() => async (empresaId: string) => {
          const responseBody = await sendImportacao(empresaId);
          const importacaoId = readField<string>(responseBody, 'importacaoId');

          toast.success('Importação enviada para processamento.');
          setFile(null);
          setFileHash('');
          setErrors({});

          await list();
          if (importacaoId) {
            await fetchDetailsById(importacaoId);
          }
        });
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageFrame
      title="Importação de Operações"
      subtitle="Configure os dados da importação e envie o arquivo para processamento assíncrono."
    >
      <div className="import-grid">
        <section className="card upload-card">
          <header>
            <h3>Configuração da importação</h3>
            <p>Fluxo alinhado ao pipeline assíncrono: validação, fila e processamento por worker.</p>
          </header>

          <form className="form-grid" onSubmit={submit}>
            <label>
              Cedente*
              <select
                value={form.cedenteId}
                onChange={(event) => {
                  const value = event.target.value;
                  setForm((current) => ({ ...current, cedenteId: value }));
                  setErrors((current) => ({ ...current, cedenteId: undefined }));
                }}
                required
                disabled={cedentesLoading || cedentesAtivos.length === 0}
                className={errors.cedenteId ? 'field-error' : ''}
              >
                <option value="">{cedentesLoading ? 'Carregando cedentes...' : 'Selecione um cedente'}</option>
                {cedentesAtivos.map((cedente) => (
                  <option key={cedente.id} value={cedente.id}>
                    {cedente.nome} ({cedente.cnpjCpf})
                  </option>
                ))}
              </select>
              {errors.cedenteId ? <small className="field-error-text">{errors.cedenteId}</small> : null}
            </label>

            <label>
              Modalidade
              <select
                value={form.modalidade}
                onChange={(event) => setForm((current) => ({ ...current, modalidade: event.target.value }))}
                disabled={!form.cedenteId || modalidadeLoading || modalidadeOptions.length === 0}
              >
                <option value="">
                  {modalidadeLoading
                    ? 'Carregando modalidades...'
                    : modalidadeOptions.length
                      ? 'Selecione'
                      : 'Sem modalidades parametrizadas'}
                </option>
                {modalidadeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="file-input">
              Arquivo*
              <input
                type="file"
                accept=".rem,.txt,.cnab,.xml,.zip"
                onChange={(event) => void onFileChange(event.target.files?.[0] ?? null)}
              />
              {file ? (
                <small>
                  {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  {hashing ? ' - calculando hash...' : fileHash ? ` - SHA256 ${fileHash.substring(0, 16)}...` : ''}
                </small>
              ) : (
                <small>Formatos suportados: CNAB (.rem/.txt/.cnab), XML e ZIP. Máximo de 20MB.</small>
              )}
              {errors.arquivo ? <small className="field-error-text">{errors.arquivo}</small> : null}
            </label>

            <label>
              Tipo detectado
              <input value={tipoArquivoAtual || '-'} disabled />
            </label>

            {isCnab ? (
              <>
                <label>
                  Tipo Banco
                  <select
                    value={form.tipoBanco}
                    onChange={(event) => setForm((current) => ({ ...current, tipoBanco: event.target.value }))}
                    disabled={bancosLoading}
                  >
                    <option value="">{bancosLoading ? 'Carregando bancos...' : 'Selecione (opcional)'}</option>
                    {bancoOptions.map((option) => (
                      <option key={option.id} value={option.codigo || option.nome}>
                        {option.nome} {option.codigo ? `(${option.codigo})` : ''}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Tipo CNAB
                  <select
                    value={form.tipoCnab}
                    onChange={(event) => setForm((current) => ({ ...current, tipoCnab: event.target.value }))}
                  >
                    <option value="">Selecione (opcional)</option>
                    {cnabTipoOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : null}

            <div className="actions-row">
              <button
                type="submit"
                className="btn-main"
                disabled={submitting || hashing || cedentesLoading || cedentesAtivos.length === 0}
              >
                {submitting ? 'Enviando...' : 'Enviar para processamento'}
              </button>
            </div>
          </form>
        </section>

        <section className="card list-card">
          <header>
            <div>
              <h3>Fila e histórico de importações</h3>
              <p>Atualização automática enquanto existirem execuções em processamento.</p>
            </div>
            <div className="pager">
              <span>{totalItems} registro(s)</span>
              <button disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
                Anterior
              </button>
              <span>
                {page} / {totalPages}
              </span>
              <button disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>
                Próxima
              </button>
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </header>

          <DataTable
            columns={columns}
            rows={rows}
            loading={loading}
            onDetails={openDetails}
            renderActions={(row) =>
              row.status === 'FINALIZADO_FALHA' ? (
                <button className="danger" onClick={() => void reprocessar(row.id)}>
                  Reprocessar
                </button>
              ) : null
            }
          />
        </section>
      </div>

      {selected ? (
        <div className="drawer">
          <div className="drawer-card">
            <header>
              <div>
                <h3>Detalhes da importação</h3>
                <p>ID: {selected.id}</p>
              </div>
              <button
                className="btn-muted"
                onClick={() => {
                  setSelected(null);
                  selectedIdRef.current = null;
                }}
              >
                Fechar
              </button>
            </header>

            {selectedLoading ? <div className="drawer-loading">Atualizando detalhes...</div> : null}

            <div className="grid-2">
              <div>
                <div className={statusClass(selected.status)}>{selected.status}</div>
                <p><strong>Arquivo:</strong> {selected.fileName ?? selected.fileKey ?? '-'}</p>
                <p><strong>Tipo:</strong> {selected.tipoArquivo ?? '-'}</p>
                <p><strong>Origem:</strong> {selected.origem ?? '-'}</p>
                <p><strong>Cedente:</strong> {selected.cedenteId ? (cedenteLookup.get(selected.cedenteId) ?? selected.cedenteId) : '-'}</p>
                <p><strong>Modalidade:</strong> {selected.modalidade ?? '-'}</p>
                <p><strong>Tipo Banco:</strong> {selected.tipoBanco ?? '-'}</p>
                <p><strong>Tipo CNAB:</strong> {selected.tipoCnab ?? '-'}</p>
                <p><strong>Tentativas:</strong> {selected.tentativas ?? 0}</p>
                <p><strong>Última tentativa:</strong> {formatDateOrDash(selected.ultimaTentativaEm)}</p>
              </div>
              <div>
                <p><strong>FIDC:</strong> {selected.fidcId ?? '-'}</p>
                <p><strong>Usuário:</strong> {selected.userEmail ?? '-'}</p>
                <p><strong>Criado:</strong> {formatDateOrDash(selected.createdAt)}</p>
                <p><strong>Concluído:</strong> {formatDateOrDash(selected.completedAt)}</p>
                <p><strong>Hash:</strong> {selected.fileHash ?? '-'}</p>
                <p><strong>Código falha:</strong> {selected.ultimoCodigoFalha ?? '-'}</p>
                <p><strong>CorrelationId:</strong> {selected.correlationId ?? '-'}</p>
                <p><strong>MessageId:</strong> {selected.ultimoMessageId ?? '-'}</p>
              </div>
            </div>

            {selected.errorSummary ? (
              <div className="error-box">
                <strong>Erro:</strong> {selected.errorSummary}
              </div>
            ) : null}

            <div className="events-block">
              <h4>Eventos</h4>
              <ul className="events">
                {selected.eventos.length > 0
                  ? selected.eventos.map((evento) => (
                    <li key={evento.id}>
                      <span className={statusClass(evento.status)}>{evento.status}</span>
                      <div>{evento.message ?? '-'}</div>
                      <small>{formatDateOrDash(evento.createdAt)}</small>
                    </li>
                  ))
                  : <li>Nenhum evento retornado.</li>}
              </ul>
            </div>

            <div className="drawer-actions">
              <button className="btn-muted" onClick={() => void fetchDetailsById(selected.id)}>
                Atualizar agora
              </button>
              <button className="btn-muted" onClick={() => void copyText(selected.id, 'ID')}>
                Copiar ID
              </button>
              <button className="btn-muted" onClick={() => void copyText(selected.correlationId, 'CorrelationId')}>
                Copiar CorrelationId
              </button>
              {selected.status === 'FINALIZADO_FALHA' ? (
                <button className="btn-main" onClick={() => void reprocessar(selected.id)}>
                  Reprocessar
                </button>
              ) : null}
            </div>
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
