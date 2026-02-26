import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../app/auth/AuthContext';
import { CONTEXTO_EMPRESA_HEADER, getErrorMessage, http, requiresEmpresaChoice } from '../../../shared/api/http';
import { EmpresaPickerDialog } from '../../../shared/ui/EmpresaPickerDialog';
import {
  MAX_FILE_BYTES,
  acceptedExtensions,
  asRecord,
  cnabTipoOptions,
  inferTipoArquivo,
  mapImportacaoExcelAnalise,
  readField,
  type BancoOption,
  type CedenteAtivoOption,
  type FormErrors,
  type FormState,
  type ImportacaoExcelAnalise,
} from '../importacoes/importacoes.shared';

type ImportacaoFormPanelProps = {
  onImportCompleted?: () => Promise<void> | void;
  onCloseRequested?: () => void;
};

const defaultFormState: FormState = {
  cedenteId: '',
  modalidade: '',
  tipoBanco: '',
  tipoCnab: '',
};

export const ImportacaoFormPanel = ({ onImportCompleted, onCloseRequested }: ImportacaoFormPanelProps) => {
  const { contextEmpresas, selectedEmpresaIds } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [fileHash, setFileHash] = useState('');
  const [hashing, setHashing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerCallback, setPickerCallback] = useState<((empresaId: string) => Promise<void>) | null>(null);
  const [form, setForm] = useState<FormState>(defaultFormState);
  const [errors, setErrors] = useState<FormErrors>({});
  const [cedentesAtivos, setCedentesAtivos] = useState<CedenteAtivoOption[]>([]);
  const [cedentesLoading, setCedentesLoading] = useState(false);
  const [cedenteSearch, setCedenteSearch] = useState('');
  const [modalidadeOptions, setModalidadeOptions] = useState<string[]>([]);
  const [modalidadeLoading, setModalidadeLoading] = useState(false);
  const [bancoOptions, setBancoOptions] = useState<BancoOption[]>([]);
  const [bancosLoading, setBancosLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [excelAnalysis, setExcelAnalysis] = useState<ImportacaoExcelAnalise | null>(null);

  const tipoArquivoAtual = useMemo(() => (file ? inferTipoArquivo(file.name) : ''), [file]);
  const isCnab = tipoArquivoAtual === 'CNAB';
  const isExcel = tipoArquivoAtual === 'EXCEL';
  const cedentesFiltrados = useMemo(() => {
    const query = cedenteSearch.trim().toLowerCase();
    if (!query) {
      return cedentesAtivos;
    }

    return cedentesAtivos.filter((item) =>
      item.nome.toLowerCase().includes(query) ||
      item.cnpjCpf.toLowerCase().includes(query));
  }, [cedenteSearch, cedentesAtivos]);

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
      const response = await http.get('/cadastros/bancos', { params: { page: 1, pageSize: 200 } });
      const payload = asRecord(response.data);
      const rawItems = readField<unknown[]>(payload, 'items', 'Items') ?? [];
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
              const value = readField(row, 'modalidadeNome', 'ModalidadeNome', 'modalidade', 'Modalidade');
              return value ? String(value).trim() : '';
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
    setExcelAnalysis(null);

    if (!inputFile) return;

    const extension = inputFile.name.slice(inputFile.name.lastIndexOf('.')).toLowerCase();
    if (!acceptedExtensions.has(extension)) {
      setErrors((current) => ({ ...current, arquivo: 'Extensão inválida. Use .rem, .txt, .cnab, .xml, .zip ou .xlsx.' }));
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

      const requestWithEmpresa = async <T,>(sender: (empresaId?: string) => Promise<T>) => {
        try {
          return await sender();
        } catch (error) {
          if (!requiresEmpresaChoice(error) || selectedEmpresaIds.length <= 1) {
            throw error;
          }

          return await new Promise<T>((resolve, reject) => {
            setPickerOpen(true);
            setPickerCallback(() => async (empresaId: string) => {
              try {
                const result = await sender(empresaId);
                resolve(result);
              } catch (innerError) {
                reject(innerError);
              }
            });
          });
        }
      };

      const sendImportacao = async (empresaId?: string) => {
        const response = await http.post('/operacoes/importacoes', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            ...(empresaId ? { [CONTEXTO_EMPRESA_HEADER]: empresaId } : {}),
          },
        });
        return asRecord(response.data);
      };

      const analyzeExcel = async (empresaId?: string) => {
        const response = await http.post('/operacoes/importacoes/analises', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            ...(empresaId ? { [CONTEXTO_EMPRESA_HEADER]: empresaId } : {}),
          },
        });
        return mapImportacaoExcelAnalise(response.data);
      };

      const onCompleted = async () => {
        toast.success('Importação enviada para processamento.');
        setFile(null);
        setFileHash('');
        setExcelAnalysis(null);
        setErrors({});
        if (onImportCompleted) {
          await onImportCompleted();
        }
        onCloseRequested?.();
      };

      if (isExcel) {
        setAnalyzing(true);
        try {
          const analysis = await requestWithEmpresa(analyzeExcel);
          setExcelAnalysis(analysis);
          if (!analysis.canImport) {
            toast.error(`Arquivo com ${analysis.errors.length} erro(s). Corrija e envie novamente.`);
          } else if (analysis.warnings.length > 0) {
            toast('Análise concluída com avisos. Revise antes de confirmar.');
          } else {
            toast.success('Análise concluída sem erros.');
          }
        } finally {
          setAnalyzing(false);
        }
        return;
      }

      await requestWithEmpresa(sendImportacao);
      await onCompleted();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmExcelImport = async () => {
    if (!excelAnalysis?.analysisId) {
      return;
    }

    const forceWarnings = excelAnalysis.warnings.length > 0
      ? window.confirm('A análise possui avisos. Deseja importar mesmo assim?')
      : false;
    if (excelAnalysis.warnings.length > 0 && !forceWarnings) {
      return;
    }

    setConfirming(true);
    try {
      const request = async (empresaId?: string) => {
        const response = await http.post(
          `/operacoes/importacoes/analises/${excelAnalysis.analysisId}/confirmar`,
          { forceWarnings },
          { headers: empresaId ? { [CONTEXTO_EMPRESA_HEADER]: empresaId } : undefined },
        );
        return asRecord(response.data);
      };

      const tryWithEmpresa = async () => {
        try {
          return await request();
        } catch (error) {
          if (!requiresEmpresaChoice(error) || selectedEmpresaIds.length <= 1) {
            throw error;
          }

          return await new Promise<Record<string, unknown>>((resolve, reject) => {
            setPickerOpen(true);
            setPickerCallback(() => async (empresaId: string) => {
              try {
                const result = await request(empresaId);
                resolve(result);
              } catch (innerError) {
                reject(innerError);
              }
            });
          });
        }
      };

      await tryWithEmpresa();
      toast.success('Importação enviada para processamento.');
      setFile(null);
      setFileHash('');
      setExcelAnalysis(null);
      setErrors({});
      if (onImportCompleted) {
        await onImportCompleted();
      }
      onCloseRequested?.();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setConfirming(false);
    }
  };

  return (
    <section className="card upload-card import-form-panel">
      <header>
        <h3>Configuração da importação</h3>
        <p>Fluxo alinhado ao pipeline assíncrono: validação, fila e processamento por worker.</p>
      </header>

      <form className="form-grid" onSubmit={submit}>
        <label>
          Pesquisar cedente
          <input
            type="text"
            value={cedenteSearch}
            onChange={(event) => setCedenteSearch(event.target.value)}
            placeholder="Digite o nome ou CNPJ"
            disabled={cedentesLoading || cedentesAtivos.length === 0}
          />
        </label>

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
            {cedentesFiltrados.map((cedente) => (
              <option key={cedente.id} value={cedente.id}>
                {cedente.nome} ({cedente.cnpjCpf})
              </option>
            ))}
          </select>
          {!cedentesLoading && cedentesAtivos.length > 0 && cedentesFiltrados.length === 0 ? (
            <small>Nenhum cedente encontrado para o texto informado.</small>
          ) : null}
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
            accept=".rem,.txt,.cnab,.xml,.zip,.xlsx"
            onChange={(event) => void onFileChange(event.target.files?.[0] ?? null)}
          />
          {file ? (
            <small>
              {file.name} ({(file.size / 1024).toFixed(1)} KB)
              {hashing ? ' - calculando hash...' : fileHash ? ` - SHA256 ${fileHash.substring(0, 16)}...` : ''}
            </small>
          ) : (
            <small>Formatos suportados: CNAB (.rem/.txt/.cnab), XML, ZIP e EXCEL (.xlsx). Máximo de 20MB.</small>
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
            disabled={submitting || hashing || cedentesLoading || cedentesAtivos.length === 0 || analyzing || confirming}
          >
            {isExcel
              ? analyzing
                ? 'Analisando...'
                : 'Analisar arquivo'
              : submitting
                ? 'Importando...'
                : 'Importar operação'}
          </button>
          {isExcel && excelAnalysis?.canImport ? (
            <button
              type="button"
              className="btn-muted"
              onClick={() => void confirmExcelImport()}
              disabled={confirming || analyzing}
            >
              {confirming ? 'Confirmando...' : 'Confirmar importação'}
            </button>
          ) : null}
        </div>
      </form>

      {isExcel && excelAnalysis ? (
        <section className="excel-analysis">
          <h4>Resultado da análise</h4>
          <p>Status: <strong>{excelAnalysis.status}</strong></p>
          <p>
            Linhas: {excelAnalysis.summary.totalLinhas} | Válidas: {excelAnalysis.summary.linhasValidas} |
            Com erro: {excelAnalysis.summary.linhasComErro} | Avisos: {excelAnalysis.summary.avisos}
          </p>

          {excelAnalysis.errors.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Linha</th>
                    <th>Campo</th>
                    <th>Código</th>
                    <th>Mensagem</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {excelAnalysis.errors.map((error, index) => (
                    <tr key={`${error.code}-${error.lineNumber}-${index}`}>
                      <td>{error.lineNumber}</td>
                      <td>{error.column ?? '-'}</td>
                      <td>{error.code}</td>
                      <td>{error.message}</td>
                      <td>{error.value ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {excelAnalysis.warnings.length > 0 ? (
            <div className="error-box">
              <strong>Avisos:</strong>
              <ul>
                {excelAnalysis.warnings.map((warning, index) => (
                  <li key={`${warning.code}-${warning.lineNumber ?? 'x'}-${index}`}>
                    {warning.lineNumber ? `Linha ${warning.lineNumber}: ` : ''}[{warning.code}] {warning.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
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
    </section>
  );
};
