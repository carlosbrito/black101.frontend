import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getErrorMessage, http } from '../../../shared/api/http';
import { PageFrame } from '../../../shared/ui/PageFrame';
import { applyCpfCnpjMask, formatCpfCnpj, readPagedResponse, sanitizeDocument } from '../cadastroCommon';
import {
  type GarantiaAlertaDto,
  type GarantiaDetailsDto,
  type GarantiaDocumentoDto,
  type GarantiaFormPayload,
  type GarantiaParteDto,
  type GarantiaTipoDto,
  GarantiaPapelParte,
  garantiaPapelParteLabel,
  GarantiaPrioridadeGrau,
  GarantiaStatusAlerta,
  garantiaStatusAlertaLabel,
  GarantiaStatusAlocacao,
  garantiaStatusAlocacaoLabel,
  GarantiaStatusDocumento,
  garantiaStatusDocumentoLabel,
  GarantiaStatusJuridico,
  garantiaStatusJuridicoLabel,
  GarantiaStatusVinculo,
  garantiaStatusVinculoLabel,
  GarantiaTipoAlocacao,
  garantiaTipoAlocacaoLabel,
  garantiaTipoAlertaLabel,
  GarantiaTipoParte,
  garantiaTipoParteLabel,
  GarantiaTipoVinculo,
  garantiaTipoVinculoLabel,
  garantiaSeveridadeLabel,
} from './types';
import '../cadastro.css';
import '../administradoras/entity-form.css';
import './garantia.css';

type TabKey = 'dados' | 'partes' | 'documentos' | 'vinculos' | 'alertas';

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'dados', label: 'Dados' },
  { key: 'partes', label: 'Partes' },
  { key: 'documentos', label: 'Documentos' },
  { key: 'vinculos', label: 'Vínculos/Alocações' },
  { key: 'alertas', label: 'Alertas/Timeline' },
];

type GarantiaFormState = {
  tipoGarantiaId: string;
  codigoInterno: string;
  titulo: string;
  descricao: string;
  dadosEspecificosJson: string;
  beneficiarioParteId: string;
  credorParteId: string;
  statusJuridico: GarantiaStatusJuridico;
  prioridadeGrau: GarantiaPrioridadeGrau;
  temOnus: boolean;
  onusDetalhes: string;
  valorAvaliacao: string;
  dataAvaliacao: string;
  haircutPercentual: string;
  validUntil: string;
  ativa: boolean;
};

type CedenteOption = { id: string; nome: string };
type OperacaoOption = { id: string; numero: string };

const defaultForm = (): GarantiaFormState => ({
  tipoGarantiaId: '',
  codigoInterno: '',
  titulo: '',
  descricao: '',
  dadosEspecificosJson: '{}',
  beneficiarioParteId: '',
  credorParteId: '',
  statusJuridico: GarantiaStatusJuridico.Rascunho,
  prioridadeGrau: GarantiaPrioridadeGrau.Primeiro,
  temOnus: false,
  onusDetalhes: '',
  valorAvaliacao: '',
  dataAvaliacao: new Date().toISOString().slice(0, 10),
  haircutPercentual: '0',
  validUntil: '',
  ativa: true,
});

const toDateInput = (value?: string | null) => (value ? value.slice(0, 10) : '');
const toNullable = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};
const toNumber = (value: string) => {
  const normalized = value
    .replace(/[^\d,.-]/g, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const maskCurrencyInput = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  const numeric = Number(digits) / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleDateString('pt-BR');
};
const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleString('pt-BR');
};
const formatCurrency = (value?: number | null) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value ?? 0));
const formatDecimal = (value?: number | null) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 4 }).format(Number(value ?? 0));
const enumValues = <T extends Record<string, string | number>>(value: T): number[] =>
  Object.values(value).filter((item): item is number => typeof item === 'number');

const REQUIRED_FIELDS_BY_TIPO: Record<string, string[]> = {
  IMOVEL: ['matricula', 'cartorio', 'tipo_juridico', 'endereco'],
  VEICULO: ['placa', 'renavam', 'chassi'],
  SEGURO: ['numero_apolice', 'valor_segurado'],
  CARTA_FIANCA: ['numero_carta', 'valor_garantido'],
  RECEBIVEIS: ['subtipo', 'valor_face_total'],
};

const DADOS_TEMPLATE_BY_TIPO: Record<string, Record<string, unknown>> = {
  IMOVEL: {
    matricula: '',
    cartorio: '',
    tipo_juridico: 'alienacao_fiduciaria',
    endereco: '',
  },
  VEICULO: {
    placa: '',
    renavam: '',
    chassi: '',
  },
  SEGURO: {
    numero_apolice: '',
    valor_segurado: 0,
  },
  CARTA_FIANCA: {
    numero_carta: '',
    valor_garantido: 0,
  },
  RECEBIVEIS: {
    subtipo: 'duplicatas',
    valor_face_total: 0,
  },
};

const isJsonFieldEmpty = (value: unknown) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length === 0;
  return false;
};

export const GarantiaFormPage = () => {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const garantiaId = params.id;
  const isEdit = Boolean(garantiaId);

  const [loading, setLoading] = useState<boolean>(isEdit);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('dados');

  const [tipos, setTipos] = useState<GarantiaTipoDto[]>([]);
  const [partesOptions, setPartesOptions] = useState<GarantiaParteDto[]>([]);
  const [cedentes, setCedentes] = useState<CedenteOption[]>([]);
  const [operacoes, setOperacoes] = useState<OperacaoOption[]>([]);
  const [details, setDetails] = useState<GarantiaDetailsDto | null>(null);
  const [alertasExternos, setAlertasExternos] = useState<GarantiaAlertaDto[]>([]);

  const [form, setForm] = useState<GarantiaFormState>(defaultForm);
  const [statusTarget, setStatusTarget] = useState<GarantiaStatusJuridico>(GarantiaStatusJuridico.Rascunho);
  const [statusMotivo, setStatusMotivo] = useState('');
  const [statusJustificativa, setStatusJustificativa] = useState('');

  const [novaParte, setNovaParte] = useState({ tipoParte: GarantiaTipoParte.PessoaJuridica, nomeRazao: '', documento: '', ativo: true });
  const [vinculoParteForm, setVinculoParteForm] = useState({ parteId: '', papel: GarantiaPapelParte.Garantidor, participacaoPercentual: '' });

  const [documentoForm, setDocumentoForm] = useState({
    tipoDocumento: '',
    numero: '',
    emissor: '',
    emissaoEm: '',
    validUntil: '',
    statusDocumento: GarantiaStatusDocumento.Pendente,
    observacao: '',
  });
  const [documentoFile, setDocumentoFile] = useState<File | null>(null);
  const documentoFileInputRef = useRef<HTMLInputElement | null>(null);

  const [vinculoForm, setVinculoForm] = useState({
    cedenteId: '',
    tipoVinculo: GarantiaTipoVinculo.GuardaChuva,
    limiteCobertura: '',
    dataInicio: new Date().toISOString().slice(0, 10),
    dataFim: '',
    status: GarantiaStatusVinculo.Ativo,
  });

  const [alocacaoForm, setAlocacaoForm] = useState({
    operacaoId: '',
    tipoAlocacao: GarantiaTipoAlocacao.ValorFixo,
    percentualAlocado: '',
    valorAlocado: '',
    exposicaoReferencia: '',
    dataAlocacao: new Date().toISOString().slice(0, 10),
    status: GarantiaStatusAlocacao.Ativa,
  });

  const mergedAlertas = useMemo(() => {
    const map = new Map<string, GarantiaAlertaDto>();
    (details?.alertas ?? []).forEach((item) => map.set(item.id, item));
    alertasExternos.forEach((item) => map.set(item.id, item));
    return Array.from(map.values()).sort((left, right) => right.dispararEm.localeCompare(left.dispararEm));
  }, [details?.alertas, alertasExternos]);

  const computedValorElegivel = useMemo(() => {
    const valor = toNumber(form.valorAvaliacao);
    const haircut = toNumber(form.haircutPercentual);
    return valor * (1 - haircut / 100);
  }, [form.valorAvaliacao, form.haircutPercentual]);

  const selectedTipoCode = useMemo(() => {
    const selectedTipo = tipos.find((item) => item.id === form.tipoGarantiaId);
    return (selectedTipo?.codigo ?? '').trim().toUpperCase();
  }, [tipos, form.tipoGarantiaId]);

  const requiredFieldsForSelectedTipo = useMemo(
    () => REQUIRED_FIELDS_BY_TIPO[selectedTipoCode] ?? [],
    [selectedTipoCode],
  );

  const loadTipos = async () => {
    try { const response = await http.get<GarantiaTipoDto[]>('/cadastros/garantias/tipos'); setTipos(response.data ?? []); } catch { setTipos([]); }
  };

  const loadPartesOptions = async () => {
    try {
      const response = await http.get('/cadastros/garantias/partes', { params: { page: 1, pageSize: 300 } });
      setPartesOptions(readPagedResponse<GarantiaParteDto>(response.data).items ?? []);
    } catch { setPartesOptions([]); }
  };

  const loadCedentes = async () => {
    try {
      const response = await http.get('/cadastros/cedentes', { params: { page: 1, pageSize: 300 } });
      setCedentes(readPagedResponse<CedenteOption>(response.data).items ?? []);
    } catch { setCedentes([]); }
  };

  const loadOperacoes = async () => {
    try {
      const response = await http.get('/operacoes');
      const payload = response.data as Record<string, unknown> | OperacaoOption[];
      if (Array.isArray(payload)) { setOperacoes(payload); return; }
      setOperacoes(((payload.items ?? payload.Items ?? []) as OperacaoOption[]) ?? []);
    } catch { setOperacoes([]); }
  };

  const hydrateForm = (item: GarantiaDetailsDto) => {
    setForm({
      tipoGarantiaId: item.tipoGarantiaId,
      codigoInterno: item.codigoInterno,
      titulo: item.titulo,
      descricao: item.descricao ?? '',
      dadosEspecificosJson: item.dadosEspecificosJson || '{}',
      beneficiarioParteId: item.beneficiarioParteId ?? '',
      credorParteId: item.credorParteId ?? '',
      statusJuridico: item.statusJuridico,
      prioridadeGrau: item.prioridadeGrau,
      temOnus: item.temOnus,
      onusDetalhes: item.onusDetalhes ?? '',
      valorAvaliacao: maskCurrencyInput(String(Math.round(item.valorAvaliacao * 100))),
      dataAvaliacao: toDateInput(item.dataAvaliacao),
      haircutPercentual: String(item.haircutPercentual),
      validUntil: toDateInput(item.validUntil),
      ativa: item.ativa,
    });
    setStatusTarget(item.statusJuridico);
  };

  const loadGarantia = async () => {
    if (!garantiaId) return;
    setLoading(true);
    try {
      const response = await http.get<GarantiaDetailsDto>(`/cadastros/garantias/${garantiaId}`);
      setDetails(response.data);
      hydrateForm(response.data);
    } catch (error) {
      toast.error(getErrorMessage(error));
      setDetails(null);
    } finally {
      setLoading(false);
    }
  };

  const loadAlertas = async () => {
    if (!garantiaId) return;
    try {
      const response = await http.get('/cadastros/garantias/alertas', { params: { page: 1, pageSize: 100, garantiaId } });
      setAlertasExternos(readPagedResponse<GarantiaAlertaDto>(response.data).items ?? []);
    } catch {
      setAlertasExternos([]);
    }
  };

  useEffect(() => {
    void loadTipos();
    void loadPartesOptions();
    void loadCedentes();
    void loadOperacoes();
  }, []);

  useEffect(() => { if (isEdit) void loadGarantia(); }, [isEdit, garantiaId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (isEdit) void loadAlertas(); }, [isEdit, garantiaId]); // eslint-disable-line react-hooks/exhaustive-deps

  const parseFileName = (header: string | null, fallbackName: string): string => {
    if (!header) {
      return fallbackName;
    }

    const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(header);
    if (utf8Match?.[1]) {
      return decodeURIComponent(utf8Match[1]);
    }

    const quotedMatch = /filename="?([^";]+)"?/i.exec(header);
    if (quotedMatch?.[1]) {
      return quotedMatch[1];
    }

    return fallbackName;
  };

  const downloadBlobFromEndpoint = async (url: string, fallbackName: string) => {
    const response = await http.get(url, { responseType: 'blob' });
    const fileName = parseFileName(response.headers['content-disposition'] ?? null, fallbackName);
    const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(blobUrl);
  };

  const getDocumentoArquivoLabel = (item: GarantiaDocumentoDto) => {
    if (item.metadataJson) {
      try {
        const metadata = JSON.parse(item.metadataJson) as Record<string, unknown>;
        const fromMetadata = metadata.nomeArquivo ?? metadata.fileName;
        if (typeof fromMetadata === 'string' && fromMetadata.trim()) {
          return fromMetadata.trim();
        }
      } catch {
        // Sem impacto funcional: segue para fallback.
      }
    }

    if (item.arquivoRef) {
      const fromPath = item.arquivoRef.split('/').pop();
      if (fromPath) {
        return fromPath;
      }
    }

    return '-';
  };

  const applyJsonTemplateByTipo = () => {
    const template = DADOS_TEMPLATE_BY_TIPO[selectedTipoCode];
    if (!template) {
      toast.error('Este tipo não possui modelo automático.');
      return;
    }

    setForm((current) => ({
      ...current,
      dadosEspecificosJson: JSON.stringify(template, null, 2),
    }));
  };

  const ensureValidMainForm = () => {
    if (!form.tipoGarantiaId) { toast.error('Selecione o tipo da garantia.'); return false; }
    if (!form.codigoInterno.trim()) { toast.error('Informe o código interno.'); return false; }
    if (!form.titulo.trim()) { toast.error('Informe o título.'); return false; }
    if (!form.dadosEspecificosJson.trim()) { toast.error('Informe os dados específicos em JSON.'); return false; }

    let dadosEspecificos: Record<string, unknown>;
    try {
      const parsed = JSON.parse(form.dadosEspecificosJson) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        toast.error('Dados específicos devem ser um objeto JSON.');
        return false;
      }
      dadosEspecificos = parsed as Record<string, unknown>;
    } catch {
      toast.error('Dados específicos devem estar em JSON válido.');
      return false;
    }

    if (requiredFieldsForSelectedTipo.length > 0) {
      const missingField = requiredFieldsForSelectedTipo.find((field) => isJsonFieldEmpty(dadosEspecificos[field]));
      if (missingField) {
        toast.error(`Campo obrigatório não informado em dados específicos: ${missingField}.`);
        return false;
      }
    }

    if (toNumber(form.valorAvaliacao) <= 0) { toast.error('Valor de avaliação deve ser maior que zero.'); return false; }
    if (!form.dataAvaliacao) { toast.error('Informe a data de avaliação.'); return false; }
    return true;
  };

  const buildPayload = (): GarantiaFormPayload => ({
    tipoGarantiaId: form.tipoGarantiaId,
    codigoInterno: form.codigoInterno.trim(),
    titulo: form.titulo.trim(),
    descricao: toNullable(form.descricao),
    dadosEspecificosJson: form.dadosEspecificosJson.trim(),
    beneficiarioParteId: form.beneficiarioParteId || null,
    credorParteId: form.credorParteId || null,
    statusJuridico: form.statusJuridico,
    prioridadeGrau: form.prioridadeGrau,
    temOnus: form.temOnus,
    onusDetalhes: form.temOnus ? toNullable(form.onusDetalhes) : null,
    valorAvaliacao: toNumber(form.valorAvaliacao),
    dataAvaliacao: form.dataAvaliacao,
    haircutPercentual: toNumber(form.haircutPercentual),
    validUntil: form.validUntil || null,
    moeda: 'BRL',
    ativa: form.ativa,
  });

  const onSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!ensureValidMainForm()) return;
    setSaving(true);
    try {
      const payload = buildPayload();
      if (isEdit && garantiaId) {
        await http.put(`/cadastros/garantias/${garantiaId}`, payload);
        toast.success('Garantia atualizada.');
        await loadGarantia();
      } else {
        const response = await http.post<{ id: string }>('/cadastros/garantias', payload);
        toast.success('Garantia criada.');
        navigate(`/cadastro/garantias/${response.data.id}`, { replace: true });
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const onChangeStatus = async () => {
    if (!garantiaId) return;
    try {
      await http.post(`/cadastros/garantias/${garantiaId}/status`, { novoStatus: statusTarget, motivo: toNullable(statusMotivo), justificativa: toNullable(statusJustificativa) });
      toast.success('Status atualizado.');
      setStatusMotivo('');
      setStatusJustificativa('');
      await loadGarantia();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const onCriarParte = async () => {
    if (!novaParte.nomeRazao.trim()) { toast.error('Informe o nome da parte.'); return; }
    const documento = sanitizeDocument(novaParte.documento);
    if (!documento) { toast.error('Informe o documento da parte.'); return; }
    try {
      const response = await http.post<{ id: string }>('/cadastros/garantias/partes', {
        tipoParte: novaParte.tipoParte,
        nomeRazao: novaParte.nomeRazao.trim(),
        documento,
        ativo: novaParte.ativo,
      });
      toast.success('Parte criada.');
      setNovaParte({ tipoParte: GarantiaTipoParte.PessoaJuridica, nomeRazao: '', documento: '', ativo: true });
      await loadPartesOptions();
      setVinculoParteForm((current) => ({ ...current, parteId: response.data.id }));
    } catch (error) { toast.error(getErrorMessage(error)); }
  };

  const onVincularParte = async () => {
    if (!garantiaId) return;
    if (!vinculoParteForm.parteId) { toast.error('Selecione uma parte.'); return; }
    try {
      await http.post(`/cadastros/garantias/${garantiaId}/partes`, {
        parteId: vinculoParteForm.parteId,
        papel: vinculoParteForm.papel,
        participacaoPercentual: vinculoParteForm.participacaoPercentual ? toNumber(vinculoParteForm.participacaoPercentual) : null,
      });
      toast.success('Parte vinculada.');
      setVinculoParteForm({ parteId: '', papel: GarantiaPapelParte.Garantidor, participacaoPercentual: '' });
      await loadGarantia();
    } catch (error) { toast.error(getErrorMessage(error)); }
  };

  const onAdicionarDocumento = async () => {
    if (!garantiaId) return;
    if (!documentoForm.tipoDocumento.trim()) { toast.error('Informe o tipo do documento.'); return; }
    try {
      if (documentoFile) {
        const formData = new FormData();
        formData.append('tipoDocumento', documentoForm.tipoDocumento.trim());
        formData.append('numero', toNullable(documentoForm.numero) ?? '');
        formData.append('emissor', toNullable(documentoForm.emissor) ?? '');
        formData.append('emissaoEm', documentoForm.emissaoEm || '');
        formData.append('validUntil', documentoForm.validUntil || '');
        formData.append('statusDocumento', String(documentoForm.statusDocumento));
        formData.append('observacao', toNullable(documentoForm.observacao) ?? '');
        formData.append(
          'metadataJson',
          JSON.stringify({
            nomeArquivo: documentoFile.name,
            contentType: documentoFile.type || 'application/octet-stream',
            tamanhoBytes: documentoFile.size,
          }),
        );
        formData.append('file', documentoFile);
        await http.post(`/cadastros/garantias/${garantiaId}/documentos/upload`, formData);
      } else {
        await http.post(`/cadastros/garantias/${garantiaId}/documentos`, {
          tipoDocumento: documentoForm.tipoDocumento.trim(),
          numero: toNullable(documentoForm.numero),
          emissor: toNullable(documentoForm.emissor),
          emissaoEm: documentoForm.emissaoEm || null,
          validUntil: documentoForm.validUntil || null,
          statusDocumento: documentoForm.statusDocumento,
          observacao: toNullable(documentoForm.observacao),
        });
      }

      toast.success('Documento adicionado.');
      setDocumentoForm({ tipoDocumento: '', numero: '', emissor: '', emissaoEm: '', validUntil: '', statusDocumento: GarantiaStatusDocumento.Pendente, observacao: '' });
      setDocumentoFile(null);
      if (documentoFileInputRef.current) {
        documentoFileInputRef.current.value = '';
      }
      await loadGarantia();
      await loadAlertas();
    } catch (error) { toast.error(getErrorMessage(error)); }
  };

  const onDownloadDocumento = async (item: GarantiaDocumentoDto) => {
    if (!garantiaId) return;
    try {
      await downloadBlobFromEndpoint(
        `/cadastros/garantias/${garantiaId}/documentos/${item.id}/download`,
        getDocumentoArquivoLabel(item),
      );
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const onAdicionarVinculo = async () => {
    if (!garantiaId) return;
    if (!vinculoForm.cedenteId) { toast.error('Selecione um cedente.'); return; }
    try {
      await http.post(`/cadastros/garantias/${garantiaId}/vinculos`, {
        cedenteId: vinculoForm.cedenteId,
        tipoVinculo: vinculoForm.tipoVinculo,
        limiteCobertura: vinculoForm.limiteCobertura ? toNumber(vinculoForm.limiteCobertura) : null,
        dataInicio: vinculoForm.dataInicio,
        dataFim: vinculoForm.dataFim || null,
        status: vinculoForm.status,
      });
      toast.success('Vínculo adicionado.');
      setVinculoForm({ cedenteId: '', tipoVinculo: GarantiaTipoVinculo.GuardaChuva, limiteCobertura: '', dataInicio: new Date().toISOString().slice(0, 10), dataFim: '', status: GarantiaStatusVinculo.Ativo });
      await loadGarantia();
    } catch (error) { toast.error(getErrorMessage(error)); }
  };

  const onAdicionarAlocacao = async () => {
    if (!garantiaId) return;
    if (!alocacaoForm.operacaoId) { toast.error('Selecione uma operação.'); return; }
    if (toNumber(alocacaoForm.exposicaoReferencia) <= 0) { toast.error('Informe a exposição de referência.'); return; }
    try {
      await http.post(`/cadastros/garantias/${garantiaId}/alocacoes`, {
        operacaoId: alocacaoForm.operacaoId,
        tipoAlocacao: alocacaoForm.tipoAlocacao,
        percentualAlocado: alocacaoForm.percentualAlocado ? toNumber(alocacaoForm.percentualAlocado) : null,
        valorAlocado: alocacaoForm.valorAlocado ? toNumber(alocacaoForm.valorAlocado) : null,
        exposicaoReferencia: toNumber(alocacaoForm.exposicaoReferencia),
        dataAlocacao: alocacaoForm.dataAlocacao,
        status: alocacaoForm.status,
      });
      toast.success('Alocação adicionada.');
      setAlocacaoForm({ operacaoId: '', tipoAlocacao: GarantiaTipoAlocacao.ValorFixo, percentualAlocado: '', valorAlocado: '', exposicaoReferencia: '', dataAlocacao: new Date().toISOString().slice(0, 10), status: GarantiaStatusAlocacao.Ativa });
      await loadGarantia();
      await loadAlertas();
    } catch (error) { toast.error(getErrorMessage(error)); }
  };

  const onAvaliarAlertas = async () => {
    if (!garantiaId) return;
    try {
      const response = await http.post<{ totalCriado: number }>('/cadastros/garantias/alertas/avaliar', { garantiaId });
      toast.success(`Alertas avaliados. Novos: ${response.data.totalCriado}.`);
      await loadGarantia();
      await loadAlertas();
    } catch (error) { toast.error(getErrorMessage(error)); }
  };

  const onResolverAlerta = async (alerta: GarantiaAlertaDto) => {
    if (!window.confirm(`Resolver alerta '${garantiaTipoAlertaLabel[alerta.tipoAlerta] ?? alerta.tipoAlerta}'?`)) return;
    try {
      await http.post(`/cadastros/garantias/alertas/${alerta.id}/resolver`, { observacao: 'Resolvido pela interface.' });
      toast.success('Alerta resolvido.');
      await loadGarantia();
      await loadAlertas();
    } catch (error) { toast.error(getErrorMessage(error)); }
  };

  if (loading) {
    return (
      <PageFrame title="Cadastro de Garantia" subtitle="Carregando dados...">
        <div className="entity-loading">Carregando garantia...</div>
      </PageFrame>
    );
  }

  if (isEdit && !details) {
    return (
      <PageFrame title="Cadastro de Garantia" subtitle="Registro não encontrado.">
        <section className="entity-card">
          <p>Não foi possível carregar esta garantia.</p>
          <button className="btn-muted" onClick={() => navigate('/cadastro/garantias')}>Voltar para listagem</button>
        </section>
      </PageFrame>
    );
  }

  return (
    <PageFrame
      title={isEdit ? `Garantia: ${form.codigoInterno || form.titulo}` : 'Nova Garantia'}
      subtitle="Cadastro e gestão de garantias."
      actions={<Link className="btn-muted" to="/cadastro/garantias">Voltar para listagem</Link>}
    >
      {isEdit ? (
        <div className="entity-meta-bar">
          <span><strong>Status:</strong> {garantiaStatusJuridicoLabel[details?.statusJuridico ?? form.statusJuridico]}</span>
          <span><strong>Valor Elegível:</strong> {formatCurrency(details?.valorElegivel ?? computedValorElegivel)}</span>
          <span><strong>Disponível:</strong> {formatCurrency(details?.valorElegivelDisponivel ?? computedValorElegivel)}</span>
          <span><strong>Alertas Pendentes:</strong> {mergedAlertas.filter((item) => item.status !== GarantiaStatusAlerta.Resolvido).length}</span>
        </div>
      ) : null}

      <div className="entity-tabs" role="tablist" aria-label="Abas da garantia">
        {tabs.map((tab) => (
          <button key={tab.key} type="button" className={`entity-tab-btn ${activeTab === tab.key ? 'is-active' : ''}`} onClick={() => setActiveTab(tab.key)} disabled={!isEdit && tab.key !== 'dados'}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'dados' ? (
        <form className="entity-form-stack" onSubmit={onSave}>
          <section className="entity-card">
            <header><h3>Dados principais</h3></header>
            <div className="entity-grid cols-3">
              <label><span>Tipo</span><select value={form.tipoGarantiaId} onChange={(event) => setForm((current) => ({ ...current, tipoGarantiaId: event.target.value }))} required><option value="">Selecione</option>{tipos.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label>
              <label><span>Código</span><input value={form.codigoInterno} onChange={(event) => setForm((current) => ({ ...current, codigoInterno: event.target.value }))} required /></label>
              <label><span>Título</span><input value={form.titulo} onChange={(event) => setForm((current) => ({ ...current, titulo: event.target.value }))} required /></label>
              <label><span>Valor avaliação</span><input value={form.valorAvaliacao} onChange={(event) => setForm((current) => ({ ...current, valorAvaliacao: maskCurrencyInput(event.target.value) }))} required /></label>
              <label><span>Data avaliação</span><input type="date" value={form.dataAvaliacao} onChange={(event) => setForm((current) => ({ ...current, dataAvaliacao: event.target.value }))} required /></label>
              <label><span>Haircut (%)</span><input value={form.haircutPercentual} onChange={(event) => setForm((current) => ({ ...current, haircutPercentual: event.target.value }))} /></label>
              <label><span>Valor elegível (calc.)</span><input value={formatCurrency(computedValorElegivel)} readOnly /></label>
              <label><span>Validade (opcional)</span><input type="date" value={form.validUntil} onChange={(event) => setForm((current) => ({ ...current, validUntil: event.target.value }))} /></label>
              <label className="span-all"><span>Descrição</span><textarea rows={2} value={form.descricao} onChange={(event) => setForm((current) => ({ ...current, descricao: event.target.value }))} /></label>
              <div className="span-all garantia-onus-block">
                <label className="checkbox-inline garantia-check garantia-check--single">
                  <input type="checkbox" checked={form.temOnus} onChange={(event) => setForm((current) => ({ ...current, temOnus: event.target.checked }))} />
                  <span>Tem ônus</span>
                </label>
                <label className="garantia-onus-details">
                  <span>Detalhes do ônus</span>
                  <textarea rows={2} value={form.onusDetalhes} onChange={(event) => setForm((current) => ({ ...current, onusDetalhes: event.target.value }))} disabled={!form.temOnus} />
                </label>
              </div>
              <label className="span-all">
                <span>Dados específicos (JSON)</span>
                <textarea rows={8} value={form.dadosEspecificosJson} onChange={(event) => setForm((current) => ({ ...current, dadosEspecificosJson: event.target.value }))} required />
                {requiredFieldsForSelectedTipo.length > 0 ? (
                  <small className="garantia-json-help">
                    Obrigatórios para {selectedTipoCode}: {requiredFieldsForSelectedTipo.join(', ')}
                  </small>
                ) : null}
                <div className="garantia-json-actions">
                  <button type="button" className="btn-muted" onClick={applyJsonTemplateByTipo}>
                    Preencher modelo JSON
                  </button>
                </div>
              </label>
            </div>
          </section>

          {isEdit ? (
            <section className="entity-card">
              <header><h3>Troca de status</h3></header>
              <div className="entity-grid cols-3">
                <label><span>Novo status</span><select value={String(statusTarget)} onChange={(event) => setStatusTarget(Number(event.target.value) as GarantiaStatusJuridico)}>{enumValues(GarantiaStatusJuridico).map((value) => <option key={value} value={value}>{garantiaStatusJuridicoLabel[value as GarantiaStatusJuridico]}</option>)}</select></label>
                <label><span>Motivo</span><input value={statusMotivo} onChange={(event) => setStatusMotivo(event.target.value)} /></label>
                <label><span>Justificativa</span><input value={statusJustificativa} onChange={(event) => setStatusJustificativa(event.target.value)} /></label>
              </div>
              <div className="entity-actions"><button type="button" className="btn-muted" onClick={() => void onChangeStatus()}>Alterar status</button></div>
            </section>
          ) : null}

          <div className="entity-actions">
            <button type="button" className="btn-muted" onClick={() => navigate('/cadastro/garantias')}>Cancelar</button>
            <button type="submit" className="btn-main" disabled={saving}>{saving ? 'Salvando...' : 'Salvar garantia'}</button>
          </div>
        </form>
      ) : null}

      {isEdit && activeTab === 'partes' ? (
        <section className="entity-form-stack">
          <section className="entity-card">
            <header><h3>Nova Parte</h3></header>
            <div className="entity-grid cols-3">
              <label><span>Tipo</span><select value={String(novaParte.tipoParte)} onChange={(event) => setNovaParte((current) => ({ ...current, tipoParte: Number(event.target.value) as GarantiaTipoParte }))}>{enumValues(GarantiaTipoParte).map((value) => <option key={value} value={value}>{garantiaTipoParteLabel[value as GarantiaTipoParte]}</option>)}</select></label>
              <label><span>Nome</span><input value={novaParte.nomeRazao} onChange={(event) => setNovaParte((current) => ({ ...current, nomeRazao: event.target.value }))} /></label>
              <label><span>Documento</span><input value={novaParte.documento} onChange={(event) => setNovaParte((current) => ({ ...current, documento: applyCpfCnpjMask(event.target.value) }))} /></label>
            </div>
            <div className="entity-actions"><button type="button" className="btn-main" onClick={() => void onCriarParte()}>Criar Parte</button></div>
          </section>

          <section className="entity-card">
            <header><h3>Vincular Parte</h3></header>
            <div className="entity-grid cols-3">
              <label><span>Parte</span><select value={vinculoParteForm.parteId} onChange={(event) => setVinculoParteForm((current) => ({ ...current, parteId: event.target.value }))}><option value="">Selecione</option>{partesOptions.filter((item) => item.ativo).map((item) => <option key={item.id} value={item.id}>{item.nomeRazao} ({formatCpfCnpj(item.documento)})</option>)}</select></label>
              <label><span>Papel</span><select value={String(vinculoParteForm.papel)} onChange={(event) => setVinculoParteForm((current) => ({ ...current, papel: Number(event.target.value) as GarantiaPapelParte }))}>{enumValues(GarantiaPapelParte).map((value) => <option key={value} value={value}>{garantiaPapelParteLabel[value as GarantiaPapelParte]}</option>)}</select></label>
              <label><span>Participação (%)</span><input value={vinculoParteForm.participacaoPercentual} onChange={(event) => setVinculoParteForm((current) => ({ ...current, participacaoPercentual: event.target.value }))} /></label>
            </div>
            <div className="entity-actions"><button type="button" className="btn-main" onClick={() => void onVincularParte()}>Vincular Parte</button></div>
          </section>

          <section className="entity-card">
            <div className="entity-table-wrap">
              <table>
                <thead><tr><th>Parte</th><th>Documento</th><th>Papel</th><th>Participação</th></tr></thead>
                <tbody>
                  {(details?.partes ?? []).map((item) => <tr key={item.id}><td>{item.nomeParte}</td><td>{formatCpfCnpj(item.documentoParte)}</td><td>{garantiaPapelParteLabel[item.papel]}</td><td>{item.participacaoPercentual ? `${formatDecimal(item.participacaoPercentual)}%` : '-'}</td></tr>)}
                  {(details?.partes ?? []).length === 0 ? <tr><td colSpan={4}>Nenhuma parte vinculada.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      ) : null}

      {isEdit && activeTab === 'documentos' ? (
        <section className="entity-form-stack">
          <section className="entity-card">
            <header><h3>Novo Documento</h3></header>
            <div className="entity-grid cols-3">
              <label><span>Tipo</span><input value={documentoForm.tipoDocumento} onChange={(event) => setDocumentoForm((current) => ({ ...current, tipoDocumento: event.target.value }))} /></label>
              <label><span>Número</span><input value={documentoForm.numero} onChange={(event) => setDocumentoForm((current) => ({ ...current, numero: event.target.value }))} /></label>
              <label><span>Emissor</span><input value={documentoForm.emissor} onChange={(event) => setDocumentoForm((current) => ({ ...current, emissor: event.target.value }))} /></label>
              <label><span>Emissão</span><input type="date" value={documentoForm.emissaoEm} onChange={(event) => setDocumentoForm((current) => ({ ...current, emissaoEm: event.target.value }))} /></label>
              <label><span>Validade</span><input type="date" value={documentoForm.validUntil} onChange={(event) => setDocumentoForm((current) => ({ ...current, validUntil: event.target.value }))} /></label>
              <label><span>Status</span><select value={String(documentoForm.statusDocumento)} onChange={(event) => setDocumentoForm((current) => ({ ...current, statusDocumento: Number(event.target.value) as GarantiaStatusDocumento }))}>{enumValues(GarantiaStatusDocumento).map((value) => <option key={value} value={value}>{garantiaStatusDocumentoLabel[value as GarantiaStatusDocumento]}</option>)}</select></label>
              <label className="span-all"><span>Arquivo (opcional, upload S3)</span><input ref={documentoFileInputRef} type="file" onChange={(event) => setDocumentoFile(event.target.files?.[0] ?? null)} /></label>
              <label className="span-all"><span>Observação</span><textarea rows={2} value={documentoForm.observacao} onChange={(event) => setDocumentoForm((current) => ({ ...current, observacao: event.target.value }))} /></label>
            </div>
            <div className="entity-actions"><button type="button" className="btn-main" onClick={() => void onAdicionarDocumento()}>Adicionar Documento</button></div>
          </section>

          <section className="entity-card">
            <div className="entity-table-wrap">
              <table>
                <thead><tr><th>Tipo</th><th>Número</th><th>Status</th><th>Emissão</th><th>Validade</th><th>Arquivo</th><th className="col-actions">Ações</th></tr></thead>
                <tbody>
                  {(details?.documentos ?? []).map((item) => <tr key={item.id}><td>{item.tipoDocumento}</td><td>{item.numero ?? '-'}</td><td>{garantiaStatusDocumentoLabel[item.statusDocumento]}</td><td>{formatDate(item.emissaoEm)}</td><td>{formatDate(item.validUntil)}</td><td>{getDocumentoArquivoLabel(item)}</td><td className="col-actions">{item.arquivoRef ? <button type="button" onClick={() => void onDownloadDocumento(item)}>Download</button> : '-'}</td></tr>)}
                  {(details?.documentos ?? []).length === 0 ? <tr><td colSpan={7}>Nenhum documento cadastrado.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      ) : null}

      {isEdit && activeTab === 'vinculos' ? (
        <section className="entity-form-stack">
          <section className="entity-card">
            <header><h3>Novo Vínculo (cedente)</h3></header>
            <div className="entity-grid cols-3">
              <label><span>Cedente</span><select value={vinculoForm.cedenteId} onChange={(event) => setVinculoForm((current) => ({ ...current, cedenteId: event.target.value }))}><option value="">Selecione</option>{cedentes.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label>
              <label><span>Tipo</span><select value={String(vinculoForm.tipoVinculo)} onChange={(event) => setVinculoForm((current) => ({ ...current, tipoVinculo: Number(event.target.value) as GarantiaTipoVinculo }))}>{enumValues(GarantiaTipoVinculo).map((value) => <option key={value} value={value}>{garantiaTipoVinculoLabel[value as GarantiaTipoVinculo]}</option>)}</select></label>
              <label><span>Limite cobertura</span><input value={vinculoForm.limiteCobertura} onChange={(event) => setVinculoForm((current) => ({ ...current, limiteCobertura: event.target.value }))} /></label>
              <label><span>Data início</span><input type="date" value={vinculoForm.dataInicio} onChange={(event) => setVinculoForm((current) => ({ ...current, dataInicio: event.target.value }))} /></label>
              <label><span>Data fim</span><input type="date" value={vinculoForm.dataFim} onChange={(event) => setVinculoForm((current) => ({ ...current, dataFim: event.target.value }))} /></label>
              <label><span>Status</span><select value={String(vinculoForm.status)} onChange={(event) => setVinculoForm((current) => ({ ...current, status: Number(event.target.value) as GarantiaStatusVinculo }))}>{enumValues(GarantiaStatusVinculo).map((value) => <option key={value} value={value}>{garantiaStatusVinculoLabel[value as GarantiaStatusVinculo]}</option>)}</select></label>
            </div>
            <div className="entity-actions"><button type="button" className="btn-main" onClick={() => void onAdicionarVinculo()}>Adicionar Vínculo</button></div>
          </section>

          <section className="entity-card">
            <header><h3>Nova Alocação</h3></header>
            <div className="entity-grid cols-3">
              <label><span>Operação</span><select value={alocacaoForm.operacaoId} onChange={(event) => setAlocacaoForm((current) => ({ ...current, operacaoId: event.target.value }))}><option value="">Selecione</option>{operacoes.map((item) => <option key={item.id} value={item.id}>{item.numero}</option>)}</select></label>
              <label><span>Tipo alocação</span><select value={String(alocacaoForm.tipoAlocacao)} onChange={(event) => setAlocacaoForm((current) => ({ ...current, tipoAlocacao: Number(event.target.value) as GarantiaTipoAlocacao }))}>{enumValues(GarantiaTipoAlocacao).map((value) => <option key={value} value={value}>{garantiaTipoAlocacaoLabel[value as GarantiaTipoAlocacao]}</option>)}</select></label>
              <label><span>Exposição</span><input value={alocacaoForm.exposicaoReferencia} onChange={(event) => setAlocacaoForm((current) => ({ ...current, exposicaoReferencia: event.target.value }))} /></label>
              <label><span>% alocado</span><input value={alocacaoForm.percentualAlocado} onChange={(event) => setAlocacaoForm((current) => ({ ...current, percentualAlocado: event.target.value }))} /></label>
              <label><span>Valor alocado</span><input value={alocacaoForm.valorAlocado} onChange={(event) => setAlocacaoForm((current) => ({ ...current, valorAlocado: event.target.value }))} /></label>
              <label><span>Data alocação</span><input type="date" value={alocacaoForm.dataAlocacao} onChange={(event) => setAlocacaoForm((current) => ({ ...current, dataAlocacao: event.target.value }))} /></label>
              <label><span>Status</span><select value={String(alocacaoForm.status)} onChange={(event) => setAlocacaoForm((current) => ({ ...current, status: Number(event.target.value) as GarantiaStatusAlocacao }))}>{enumValues(GarantiaStatusAlocacao).map((value) => <option key={value} value={value}>{garantiaStatusAlocacaoLabel[value as GarantiaStatusAlocacao]}</option>)}</select></label>
            </div>
            <div className="entity-actions"><button type="button" className="btn-main" onClick={() => void onAdicionarAlocacao()}>Adicionar Alocação</button></div>
          </section>

          <section className="entity-card">
            <div className="entity-table-wrap">
              <table>
                <thead><tr><th>Cedente</th><th>Tipo</th><th>Status</th><th>Operação</th><th>Consumo</th></tr></thead>
                <tbody>
                  {(details?.vinculos ?? []).map((item) => <tr key={item.id}><td>{item.cedenteNome}</td><td>{garantiaTipoVinculoLabel[item.tipoVinculo]}</td><td>{garantiaStatusVinculoLabel[item.status]}</td><td>-</td><td>-</td></tr>)}
                  {(details?.alocacoes ?? []).map((item) => <tr key={item.id}><td>-</td><td>{garantiaTipoAlocacaoLabel[item.tipoAlocacao]}</td><td>{garantiaStatusAlocacaoLabel[item.status]}</td><td>{item.operacaoNumeroControle}</td><td>{formatCurrency(item.valorElegivelConsumido)}</td></tr>)}
                  {(details?.vinculos ?? []).length + (details?.alocacoes ?? []).length === 0 ? <tr><td colSpan={5}>Sem vínculos/alocações.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      ) : null}

      {isEdit && activeTab === 'alertas' ? (
        <section className="entity-form-stack">
          <section className="entity-card">
            <header><h3>Motor de alertas</h3></header>
            <div className="entity-actions" style={{ justifyContent: 'flex-start' }}>
              <button type="button" className="btn-main" onClick={() => void onAvaliarAlertas()}>Avaliar Alertas da Garantia</button>
            </div>
          </section>

          <section className="entity-card">
            <div className="entity-table-wrap">
              <table>
                <thead><tr><th>Tipo</th><th>Severidade</th><th>Mensagem</th><th>Status</th><th>Disparo</th><th className="col-actions">Ações</th></tr></thead>
                <tbody>
                  {mergedAlertas.map((item) => (
                    <tr key={item.id}>
                      <td>{garantiaTipoAlertaLabel[item.tipoAlerta] ?? item.tipoAlerta}</td>
                      <td>{garantiaSeveridadeLabel[item.severidade]}</td>
                      <td>{item.mensagem}</td>
                      <td>{garantiaStatusAlertaLabel[item.status]}</td>
                      <td>{formatDateTime(item.dispararEm)}</td>
                      <td className="col-actions">{item.status !== GarantiaStatusAlerta.Resolvido ? <button type="button" onClick={() => void onResolverAlerta(item)}>Resolver</button> : 'Resolvido'}</td>
                    </tr>
                  ))}
                  {mergedAlertas.length === 0 ? <tr><td colSpan={6}>Nenhum alerta encontrado.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </section>

          <section className="entity-card">
            <header><h3>Timeline de status</h3></header>
            <div className="entity-table-wrap">
              <table>
                <thead><tr><th>Data</th><th>De</th><th>Para</th><th>Motivo</th><th>Justificativa</th></tr></thead>
                <tbody>
                  {(details?.timelineStatus ?? []).map((item) => <tr key={item.id}><td>{formatDateTime(item.alteradoEm)}</td><td>{item.statusAnterior ? garantiaStatusJuridicoLabel[item.statusAnterior] : '-'}</td><td>{garantiaStatusJuridicoLabel[item.statusNovo]}</td><td>{item.motivo ?? '-'}</td><td>{item.justificativa ?? '-'}</td></tr>)}
                  {(details?.timelineStatus ?? []).length === 0 ? <tr><td colSpan={5}>Nenhum histórico encontrado.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      ) : null}
    </PageFrame>
  );
};
