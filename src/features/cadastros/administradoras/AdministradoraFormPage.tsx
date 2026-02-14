import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getErrorMessage, http } from '../../../shared/api/http';
import { PageFrame } from '../../../shared/ui/PageFrame';
import type { PagedResponse } from '../../../shared/types/paging';
import {
  applyCpfCnpjMask,
  applyPhoneMask,
  buildPessoaPayload,
  defaultPessoaFormState,
  formatCpfCnpj,
  formatDateTime,
  isValidCpfCnpj,
  isValidPhone,
  sanitizeDocument,
  type CadastroArquivoDto,
  type CadastroObservacaoDto,
  type HistoricoItemDto,
  type PessoaDto,
  type PessoaFormState,
  readPagedResponse,
} from '../cadastroCommon';
import '../cadastro.css';
import './entity-form.css';

type TabKey =
  | 'administradora'
  | 'complemento'
  | 'representantes'
  | 'status'
  | 'tipos'
  | 'anexos'
  | 'observacoes'
  | 'historico';

type AdministradoraDto = {
  id: string;
  pessoaId: string;
  nome: string;
  cnpjCpf: string;
  email?: string | null;
  telefone?: string | null;
  cidade?: string | null;
  uf?: string | null;
  observacoesGerais?: string | null;
  ativo: boolean;
};

type ComplementoDto = {
  id?: string | null;
  administradoraId: string;
  nomeApresentacao?: string | null;
};

type StatusDto = {
  id: string;
  administradoraId: string;
  statusOperacaoGestora: string;
  statusAdministradora: string;
};

type TipoRecebivelDto = {
  id: string;
  administradoraId: string;
  tipoRecebivel: string;
  codigoAdministradora: string;
};

type AdministradoraRepresentanteDto = {
  id: string;
  administradoraId: string;
  representanteId: string;
  pessoaId: string;
  nomeRepresentante: string;
  documentoRepresentante: string;
  funcao?: string | null;
  ativo: boolean;
};

type RepresentanteOption = {
  id: string;
  nome: string;
  cnpjCpf: string;
  ativo: boolean;
};

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'administradora', label: 'Administradora' },
  { key: 'complemento', label: 'Complemento' },
  { key: 'representantes', label: 'Representantes' },
  { key: 'status', label: 'Status' },
  { key: 'tipos', label: 'Tipos de Recebiveis' },
  { key: 'anexos', label: 'Anexos' },
  { key: 'observacoes', label: 'Observacoes' },
  { key: 'historico', label: 'Historico' },
];

const createInitialComplemento = (): ComplementoDto => ({
  administradoraId: '',
  nomeApresentacao: '',
});

export const AdministradoraFormPage = () => {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const administradoraId = params.id;
  const isEdit = !!administradoraId;

  const [loading, setLoading] = useState<boolean>(isEdit);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('administradora');

  const [pessoaId, setPessoaId] = useState<string | null>(null);
  const [administradoraAtiva, setAdministradoraAtiva] = useState(true);
  const [pessoaForm, setPessoaForm] = useState<PessoaFormState>(defaultPessoaFormState);

  const [complemento, setComplemento] = useState<ComplementoDto>(createInitialComplemento());

  const [statusRows, setStatusRows] = useState<StatusDto[]>([]);
  const [statusOperacaoGestora, setStatusOperacaoGestora] = useState('');
  const [statusAdministradora, setStatusAdministradora] = useState('');

  const [tiposRows, setTiposRows] = useState<TipoRecebivelDto[]>([]);
  const [tipoRecebivel, setTipoRecebivel] = useState('');
  const [codigoAdministradora, setCodigoAdministradora] = useState('');

  const [vinculosRows, setVinculosRows] = useState<AdministradoraRepresentanteDto[]>([]);
  const [representanteOptions, setRepresentanteOptions] = useState<RepresentanteOption[]>([]);
  const [selectedRepresentanteId, setSelectedRepresentanteId] = useState('');
  const [funcaoRepresentante, setFuncaoRepresentante] = useState('');

  const [anexosRows, setAnexosRows] = useState<CadastroArquivoDto[]>([]);
  const [anexoFile, setAnexoFile] = useState<File | null>(null);

  const [observacoesRows, setObservacoesRows] = useState<CadastroObservacaoDto[]>([]);
  const [textoObservacao, setTextoObservacao] = useState('');

  const [historicoPaged, setHistoricoPaged] = useState<PagedResponse<HistoricoItemDto>>({
    items: [],
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 1,
  });

  const canAccessSubTabs = isEdit;

  const syncPessoaForm = (pessoa: PessoaDto) => {
    setPessoaId(pessoa.id);
    setPessoaForm({
      nome: pessoa.nome ?? '',
      cnpjCpf: applyCpfCnpjMask(pessoa.cnpjCpf ?? ''),
      email: pessoa.email ?? '',
      telefone: applyPhoneMask(pessoa.telefone ?? ''),
      cidade: pessoa.cidade ?? '',
      uf: pessoa.uf ?? '',
      observacoesGerais: pessoa.observacoesGerais ?? '',
      ativo: pessoa.ativo,
      enderecos: pessoa.enderecos ?? [],
      contatos: pessoa.contatos ?? [],
      qsas: pessoa.qsas ?? [],
    });
  };

  const loadRepresentanteOptions = async () => {
    try {
      const response = await http.get('/cadastros/representantes', {
        params: {
          page: 1,
          pageSize: 200,
          sortBy: 'nome',
          sortDir: 'asc',
        },
      });

      const paged = readPagedResponse<RepresentanteOption>(response.data);
      setRepresentanteOptions(paged.items.filter((item) => item.ativo));
    } catch {
      setRepresentanteOptions([]);
    }
  };

  const loadSubTabs = async (id: string) => {
    const [complementoRes, statusRes, tiposRes, representantesRes, anexosRes, observacoesRes, historicoRes] =
      await Promise.all([
        http.get(`/cadastros/administradoras/${id}/complemento`),
        http.get(`/cadastros/administradoras/${id}/status`),
        http.get(`/cadastros/administradoras/${id}/tipos-recebiveis`),
        http.get(`/cadastros/administradoras/${id}/representantes`),
        http.get(`/cadastros/administradoras/${id}/anexos`),
        http.get(`/cadastros/administradoras/${id}/observacoes`),
        http.get(`/cadastros/administradoras/${id}/historico`, { params: { page: 1, pageSize: 20 } }),
      ]);

    setComplemento(complementoRes.data as ComplementoDto);
    setStatusRows((statusRes.data as StatusDto[]) ?? []);
    setTiposRows((tiposRes.data as TipoRecebivelDto[]) ?? []);
    setVinculosRows((representantesRes.data as AdministradoraRepresentanteDto[]) ?? []);
    setAnexosRows((anexosRes.data as CadastroArquivoDto[]) ?? []);
    setObservacoesRows((observacoesRes.data as CadastroObservacaoDto[]) ?? []);
    setHistoricoPaged(readPagedResponse<HistoricoItemDto>(historicoRes.data));
  };

  const loadHistorico = async (id: string, page: number) => {
    const response = await http.get(`/cadastros/administradoras/${id}/historico`, {
      params: { page, pageSize: historicoPaged.pageSize },
    });

    setHistoricoPaged(readPagedResponse<HistoricoItemDto>(response.data));
  };

  useEffect(() => {
    void loadRepresentanteOptions();
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      if (!administradoraId) {
        setLoading(false);
        setComplemento(createInitialComplemento());
        return;
      }

      setLoading(true);
      try {
        const adminResponse = await http.get(`/cadastros/administradoras/${administradoraId}`);
        const administradora = adminResponse.data as AdministradoraDto;

        setAdministradoraAtiva(administradora.ativo);

        const pessoaResponse = await http.get(`/cadastros/pessoas/${administradora.pessoaId}`);
        syncPessoaForm(pessoaResponse.data as PessoaDto);

        await loadSubTabs(administradoraId);
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, [administradoraId]);

  const ensureValidPessoaForm = (): boolean => {
    const document = sanitizeDocument(pessoaForm.cnpjCpf);

    if (!pessoaForm.nome.trim()) {
      toast.error('Informe o nome da administradora.');
      return false;
    }

    if (!isValidCpfCnpj(document)) {
      toast.error('Informe um CPF/CNPJ valido.');
      return false;
    }

    if (pessoaForm.telefone.trim() && !isValidPhone(pessoaForm.telefone)) {
      toast.error('Informe um telefone valido com DDD.');
      return false;
    }

    return true;
  };

  const upsertPessoa = async (): Promise<string> => {
    const payload = buildPessoaPayload(pessoaForm);
    const document = sanitizeDocument(payload.cnpjCpf);
    let resolvedPessoaId = pessoaId;

    if (!resolvedPessoaId) {
      const pessoaByDocument = await http.get('/cadastros/pessoas', {
        params: {
          documento: document,
        },
      });

      const found = pessoaByDocument.data as PessoaDto | null;

      if (found?.id) {
        resolvedPessoaId = found.id;
      }
    }

    if (resolvedPessoaId) {
      await http.put(`/cadastros/pessoas/${resolvedPessoaId}`, {
        ...payload,
        ativo: pessoaForm.ativo,
      });

      return resolvedPessoaId;
    }

    const createResponse = await http.post('/cadastros/pessoas', payload);
    const created = createResponse.data as { id: string };
    return created.id;
  };

  const onSaveAdministradora = async (event: FormEvent) => {
    event.preventDefault();

    if (!ensureValidPessoaForm()) {
      return;
    }

    setSaving(true);

    try {
      const resolvedPessoaId = await upsertPessoa();
      setPessoaId(resolvedPessoaId);

      if (administradoraId) {
        await http.put(`/cadastros/administradoras/${administradoraId}`, {
          pessoaId: resolvedPessoaId,
          ativo: administradoraAtiva,
        });

        toast.success('Administradora atualizada.');
      } else {
        const createResponse = await http.post('/cadastros/administradoras', {
          pessoaId: resolvedPessoaId,
        });

        const created = createResponse.data as { id: string };

        if (!administradoraAtiva) {
          await http.put(`/cadastros/administradoras/${created.id}`, {
            pessoaId: resolvedPessoaId,
            ativo: administradoraAtiva,
          });
        }

        toast.success('Administradora criada.');
        navigate(`/cadastro/administradoras/${created.id}`, { replace: true });
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const saveComplemento = async () => {
    if (!administradoraId) {
      return;
    }

    try {
      await http.put(`/cadastros/administradoras/${administradoraId}/complemento`, {
        nomeApresentacao: complemento.nomeApresentacao?.trim() || null,
      });

      toast.success('Complemento salvo.');
      await loadSubTabs(administradoraId);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const addRepresentante = async () => {
    if (!administradoraId || !selectedRepresentanteId) {
      toast.error('Selecione um representante.');
      return;
    }

    try {
      await http.post(`/cadastros/administradoras/${administradoraId}/representantes`, {
        representanteId: selectedRepresentanteId,
        funcao: funcaoRepresentante.trim() || null,
      });

      setSelectedRepresentanteId('');
      setFuncaoRepresentante('');
      toast.success('Representante vinculado.');
      await loadSubTabs(administradoraId);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const updateRepresentante = async (item: AdministradoraRepresentanteDto) => {
    if (!administradoraId) {
      return;
    }

    const nextFuncao = window.prompt('Funcao do representante', item.funcao ?? '');
    if (nextFuncao === null) {
      return;
    }

    try {
      await http.put(`/cadastros/administradoras/${administradoraId}/representantes/${item.id}`, {
        funcao: nextFuncao.trim() || null,
        ativo: item.ativo,
      });

      toast.success('Vinculo atualizado.');
      await loadSubTabs(administradoraId);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const toggleRepresentante = async (item: AdministradoraRepresentanteDto) => {
    if (!administradoraId) {
      return;
    }

    try {
      await http.put(`/cadastros/administradoras/${administradoraId}/representantes/${item.id}`, {
        funcao: item.funcao ?? null,
        ativo: !item.ativo,
      });

      toast.success('Status do vinculo atualizado.');
      await loadSubTabs(administradoraId);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const removeRepresentante = async (item: AdministradoraRepresentanteDto) => {
    if (!administradoraId) {
      return;
    }

    if (!window.confirm(`Remover vinculo com '${item.nomeRepresentante}'?`)) {
      return;
    }

    try {
      await http.delete(`/cadastros/administradoras/${administradoraId}/representantes/${item.id}`);
      toast.success('Vinculo removido.');
      await loadSubTabs(administradoraId);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const addStatus = async () => {
    if (!administradoraId || !statusOperacaoGestora.trim() || !statusAdministradora.trim()) {
      toast.error('Preencha os campos de status.');
      return;
    }

    try {
      await http.post(`/cadastros/administradoras/${administradoraId}/status`, {
        statusOperacaoGestora: statusOperacaoGestora.trim(),
        statusAdministradora: statusAdministradora.trim(),
      });

      setStatusOperacaoGestora('');
      setStatusAdministradora('');
      toast.success('Status incluido.');
      await loadSubTabs(administradoraId);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const updateStatus = async (item: StatusDto) => {
    if (!administradoraId) {
      return;
    }

    const operacao = window.prompt('Status Operacao Gestora', item.statusOperacaoGestora);
    if (operacao === null) {
      return;
    }

    const administradora = window.prompt('Status Administradora', item.statusAdministradora);
    if (administradora === null) {
      return;
    }

    try {
      await http.put(`/cadastros/administradoras/${administradoraId}/status/${item.id}`, {
        statusOperacaoGestora: operacao.trim(),
        statusAdministradora: administradora.trim(),
      });

      toast.success('Status atualizado.');
      await loadSubTabs(administradoraId);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const removeStatus = async (item: StatusDto) => {
    if (!administradoraId) {
      return;
    }

    if (!window.confirm('Excluir status?')) {
      return;
    }

    try {
      await http.delete(`/cadastros/administradoras/${administradoraId}/status/${item.id}`);
      toast.success('Status removido.');
      await loadSubTabs(administradoraId);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const addTipo = async () => {
    if (!administradoraId || !tipoRecebivel.trim() || !codigoAdministradora.trim()) {
      toast.error('Preencha tipo de recebivel e codigo.');
      return;
    }

    try {
      await http.post(`/cadastros/administradoras/${administradoraId}/tipos-recebiveis`, {
        tipoRecebivel: tipoRecebivel.trim(),
        codigoAdministradora: codigoAdministradora.trim(),
      });

      setTipoRecebivel('');
      setCodigoAdministradora('');
      toast.success('Tipo de recebivel incluido.');
      await loadSubTabs(administradoraId);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const updateTipo = async (item: TipoRecebivelDto) => {
    if (!administradoraId) {
      return;
    }

    const tipo = window.prompt('Tipo de recebivel', item.tipoRecebivel);
    if (tipo === null) {
      return;
    }

    const codigo = window.prompt('Codigo da administradora', item.codigoAdministradora);
    if (codigo === null) {
      return;
    }

    try {
      await http.put(`/cadastros/administradoras/${administradoraId}/tipos-recebiveis/${item.id}`, {
        tipoRecebivel: tipo.trim(),
        codigoAdministradora: codigo.trim(),
      });

      toast.success('Tipo de recebivel atualizado.');
      await loadSubTabs(administradoraId);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const removeTipo = async (item: TipoRecebivelDto) => {
    if (!administradoraId) {
      return;
    }

    if (!window.confirm('Excluir tipo de recebivel?')) {
      return;
    }

    try {
      await http.delete(`/cadastros/administradoras/${administradoraId}/tipos-recebiveis/${item.id}`);
      toast.success('Tipo de recebivel removido.');
      await loadSubTabs(administradoraId);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const uploadAnexo = async () => {
    if (!administradoraId || !anexoFile) {
      toast.error('Selecione um arquivo para anexar.');
      return;
    }

    const formData = new FormData();
    formData.append('file', anexoFile);

    try {
      await http.post(`/cadastros/administradoras/${administradoraId}/anexos`, formData);
      setAnexoFile(null);
      toast.success('Anexo enviado.');
      await loadSubTabs(administradoraId);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

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

  const downloadAnexo = async (item: CadastroArquivoDto) => {
    if (!administradoraId) {
      return;
    }

    try {
      const response = await http.get(`/cadastros/administradoras/${administradoraId}/anexos/${item.id}/download`, {
        responseType: 'blob',
      });

      const fileName = parseFileName(response.headers['content-disposition'] ?? null, item.nomeArquivo);
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const removeAnexo = async (item: CadastroArquivoDto) => {
    if (!administradoraId) {
      return;
    }

    if (!window.confirm(`Excluir anexo '${item.nomeArquivo}'?`)) {
      return;
    }

    try {
      await http.delete(`/cadastros/administradoras/${administradoraId}/anexos/${item.id}`);
      toast.success('Anexo removido.');
      await loadSubTabs(administradoraId);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const addObservacao = async () => {
    if (!administradoraId || !textoObservacao.trim()) {
      toast.error('Informe a observacao.');
      return;
    }

    try {
      await http.post(`/cadastros/administradoras/${administradoraId}/observacoes`, {
        texto: textoObservacao.trim(),
      });

      setTextoObservacao('');
      toast.success('Observacao adicionada.');
      await loadSubTabs(administradoraId);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const removeObservacao = async (item: CadastroObservacaoDto) => {
    if (!administradoraId) {
      return;
    }

    if (!window.confirm('Excluir observacao?')) {
      return;
    }

    try {
      await http.delete(`/cadastros/administradoras/${administradoraId}/observacoes/${item.id}`);
      toast.success('Observacao removida.');
      await loadSubTabs(administradoraId);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const currentTitle = useMemo(
    () => (isEdit ? `Administradora: ${pessoaForm.nome || 'Editar'}` : 'Nova Administradora'),
    [isEdit, pessoaForm.nome],
  );

  const changeTab = (key: TabKey) => {
    if (!canAccessSubTabs && key !== 'administradora') {
      toast('Salve a administradora para liberar as abas complementares.');
      return;
    }

    setActiveTab(key);
  };

  const renderAdministradoraTab = () => (
    <form className="entity-form-stack" onSubmit={onSaveAdministradora}>
      <section className="entity-card">
        <header>
          <h3>Dados da Pessoa</h3>
          <p>Cadastro unificado por CPF/CNPJ na tabela de Pessoas.</p>
        </header>
        <div className="entity-grid cols-3">
          <label>
            <span>Nome</span>
            <input
              value={pessoaForm.nome}
              onChange={(event) => setPessoaForm((current) => ({ ...current, nome: event.target.value }))}
              required
            />
          </label>
          <label>
            <span>CPF/CNPJ</span>
            <input
              value={pessoaForm.cnpjCpf}
              onChange={(event) => setPessoaForm((current) => ({ ...current, cnpjCpf: applyCpfCnpjMask(event.target.value) }))}
              required
            />
          </label>
          <label className="checkbox-inline">
            <input
              type="checkbox"
              checked={administradoraAtiva}
              onChange={(event) => setAdministradoraAtiva(event.target.checked)}
            />
            <span>Administradora ativa</span>
          </label>
          <label>
            <span>E-mail</span>
            <input
              type="email"
              value={pessoaForm.email}
              onChange={(event) => setPessoaForm((current) => ({ ...current, email: event.target.value }))}
            />
          </label>
          <label>
            <span>Telefone</span>
            <input
              value={pessoaForm.telefone}
              onChange={(event) => setPessoaForm((current) => ({ ...current, telefone: applyPhoneMask(event.target.value) }))}
            />
          </label>
          <label>
            <span>Cidade</span>
            <input
              value={pessoaForm.cidade}
              onChange={(event) => setPessoaForm((current) => ({ ...current, cidade: event.target.value }))}
            />
          </label>
          <label>
            <span>UF</span>
            <input
              maxLength={2}
              value={pessoaForm.uf}
              onChange={(event) => setPessoaForm((current) => ({ ...current, uf: event.target.value.toUpperCase() }))}
            />
          </label>
          <label className="span-all">
            <span>Observacoes Gerais</span>
            <textarea
              rows={6}
              maxLength={5000}
              value={pessoaForm.observacoesGerais}
              onChange={(event) => setPessoaForm((current) => ({ ...current, observacoesGerais: event.target.value }))}
            />
          </label>
        </div>
      </section>

      <div className="entity-actions">
        <button type="button" className="btn-muted" onClick={() => navigate('/cadastro/administradoras')}>
          Voltar
        </button>
        <button type="submit" className="btn-main" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  );

  const renderComplementoTab = () => (
    <section className="entity-card entity-form-stack">
      <header>
        <h3>Complemento</h3>
      </header>
      <div className="entity-grid cols-2">
        <label>
          <span>Nome de apresentacao</span>
          <input
            value={complemento.nomeApresentacao ?? ''}
            onChange={(event) => setComplemento((current) => ({ ...current, nomeApresentacao: event.target.value }))}
          />
        </label>
      </div>
      <div className="entity-actions">
        <button type="button" className="btn-main" onClick={saveComplemento}>Salvar complemento</button>
      </div>
    </section>
  );

  const renderRepresentantesTab = () => (
    <section className="entity-form-stack">
      <section className="entity-card">
        <header>
          <h3>Vincular representante</h3>
          <p>
            Precisa criar um novo? <Link to="/cadastro/representantes/novo">Abrir cadastro de representantes</Link>
          </p>
        </header>

        <div className="entity-grid cols-3">
          <label>
            <span>Representante</span>
            <select value={selectedRepresentanteId} onChange={(event) => setSelectedRepresentanteId(event.target.value)}>
              <option value="">Selecione...</option>
              {representanteOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome} ({formatCpfCnpj(item.cnpjCpf)})
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Funcao</span>
            <input value={funcaoRepresentante} onChange={(event) => setFuncaoRepresentante(event.target.value)} />
          </label>
          <div className="entity-inline-actions">
            <button type="button" className="btn-main" onClick={addRepresentante}>Vincular</button>
          </div>
        </div>
      </section>

      <section className="entity-card">
        <header>
          <h3>Representantes vinculados</h3>
        </header>
        <div className="entity-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Documento</th>
                <th>Funcao</th>
                <th>Status</th>
                <th className="col-actions">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {vinculosRows.map((item) => (
                <tr key={item.id}>
                  <td>{item.nomeRepresentante}</td>
                  <td>{formatCpfCnpj(item.documentoRepresentante)}</td>
                  <td>{item.funcao || '-'}</td>
                  <td>{item.ativo ? 'Ativo' : 'Inativo'}</td>
                  <td className="col-actions">
                    <div className="table-actions">
                      <button onClick={() => updateRepresentante(item)}>Editar</button>
                      <button onClick={() => toggleRepresentante(item)}>{item.ativo ? 'Inativar' : 'Ativar'}</button>
                      <button className="danger" onClick={() => removeRepresentante(item)}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );

  const renderStatusTab = () => (
    <section className="entity-form-stack">
      <section className="entity-card">
        <header>
          <h3>Novo status</h3>
        </header>
        <div className="entity-grid cols-3">
          <label>
            <span>Status operacao gestora</span>
            <input value={statusOperacaoGestora} onChange={(event) => setStatusOperacaoGestora(event.target.value)} />
          </label>
          <label>
            <span>Status administradora</span>
            <input value={statusAdministradora} onChange={(event) => setStatusAdministradora(event.target.value)} />
          </label>
          <div className="entity-inline-actions">
            <button type="button" className="btn-main" onClick={addStatus}>Adicionar</button>
          </div>
        </div>
      </section>

      <section className="entity-card">
        <div className="entity-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Status Operacao Gestora</th>
                <th>Status Administradora</th>
                <th className="col-actions">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {statusRows.map((item) => (
                <tr key={item.id}>
                  <td>{item.statusOperacaoGestora}</td>
                  <td>{item.statusAdministradora}</td>
                  <td className="col-actions">
                    <div className="table-actions">
                      <button onClick={() => updateStatus(item)}>Editar</button>
                      <button className="danger" onClick={() => removeStatus(item)}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );

  const renderTiposTab = () => (
    <section className="entity-form-stack">
      <section className="entity-card">
        <header>
          <h3>Novo tipo de recebivel</h3>
        </header>
        <div className="entity-grid cols-3">
          <label>
            <span>Tipo</span>
            <input value={tipoRecebivel} onChange={(event) => setTipoRecebivel(event.target.value)} />
          </label>
          <label>
            <span>Codigo administradora</span>
            <input value={codigoAdministradora} onChange={(event) => setCodigoAdministradora(event.target.value)} />
          </label>
          <div className="entity-inline-actions">
            <button type="button" className="btn-main" onClick={addTipo}>Adicionar</button>
          </div>
        </div>
      </section>

      <section className="entity-card">
        <div className="entity-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Codigo</th>
                <th className="col-actions">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {tiposRows.map((item) => (
                <tr key={item.id}>
                  <td>{item.tipoRecebivel}</td>
                  <td>{item.codigoAdministradora}</td>
                  <td className="col-actions">
                    <div className="table-actions">
                      <button onClick={() => updateTipo(item)}>Editar</button>
                      <button className="danger" onClick={() => removeTipo(item)}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );

  const renderAnexosTab = () => (
    <section className="entity-form-stack">
      <section className="entity-card">
        <header>
          <h3>Novo anexo</h3>
        </header>
        <div className="entity-grid cols-3">
          <label className="span-all">
            <span>Arquivo</span>
            <input
              type="file"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setAnexoFile(file);
              }}
            />
          </label>
          <div className="entity-inline-actions">
            <button type="button" className="btn-main" onClick={uploadAnexo}>Enviar anexo</button>
          </div>
        </div>
      </section>

      <section className="entity-card">
        <div className="entity-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Arquivo</th>
                <th>Tamanho</th>
                <th>Data</th>
                <th className="col-actions">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {anexosRows.map((item) => (
                <tr key={item.id}>
                  <td>{item.nomeArquivo}</td>
                  <td>{(item.tamanhoBytes / 1024).toFixed(1)} KB</td>
                  <td>{formatDateTime(item.createdAt)}</td>
                  <td className="col-actions">
                    <div className="table-actions">
                      <button onClick={() => downloadAnexo(item)}>Download</button>
                      <button className="danger" onClick={() => removeAnexo(item)}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );

  const renderObservacoesTab = () => (
    <section className="entity-form-stack">
      <section className="entity-card">
        <header>
          <h3>Nova observacao</h3>
        </header>
        <div className="entity-grid cols-2">
          <label className="span-all">
            <span>Texto</span>
            <textarea
              rows={4}
              value={textoObservacao}
              onChange={(event) => setTextoObservacao(event.target.value)}
            />
          </label>
          <div className="entity-inline-actions">
            <button type="button" className="btn-main" onClick={addObservacao}>Adicionar observacao</button>
          </div>
        </div>
      </section>

      <section className="entity-card">
        <div className="entity-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Texto</th>
                <th>Autor</th>
                <th>Data</th>
                <th className="col-actions">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {observacoesRows.map((item) => (
                <tr key={item.id}>
                  <td>{item.texto}</td>
                  <td>{item.autorEmail || '-'}</td>
                  <td>{formatDateTime(item.createdAt)}</td>
                  <td className="col-actions">
                    <div className="table-actions">
                      <button className="danger" onClick={() => removeObservacao(item)}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );

  const renderHistoricoTab = () => (
    <section className="entity-card entity-form-stack">
      <header>
        <h3>Historico de Auditoria</h3>
      </header>
      <div className="entity-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Acao</th>
              <th>Entidade</th>
              <th>Usuario</th>
              <th>Data</th>
              <th>TraceId</th>
            </tr>
          </thead>
          <tbody>
            {historicoPaged.items.map((item) => (
              <tr key={item.id}>
                <td>{item.acao}</td>
                <td>{item.entidade}</td>
                <td>{item.userEmail || '-'}</td>
                <td>{formatDateTime(item.createdAt)}</td>
                <td className="trace-id-cell" title={item.traceId}>{item.traceId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {administradoraId ? (
        <div className="pager">
          <span>{historicoPaged.totalItems} evento(s)</span>
          <div>
            <button
              disabled={historicoPaged.page <= 1}
              onClick={() => void loadHistorico(administradoraId, historicoPaged.page - 1)}
            >
              Anterior
            </button>
            <span>{historicoPaged.page} de {historicoPaged.totalPages}</span>
            <button
              disabled={historicoPaged.page >= historicoPaged.totalPages}
              onClick={() => void loadHistorico(administradoraId, historicoPaged.page + 1)}
            >
              Proxima
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );

  const renderCurrentTab = () => {
    switch (activeTab) {
      case 'administradora':
        return renderAdministradoraTab();
      case 'complemento':
        return renderComplementoTab();
      case 'representantes':
        return renderRepresentantesTab();
      case 'status':
        return renderStatusTab();
      case 'tipos':
        return renderTiposTab();
      case 'anexos':
        return renderAnexosTab();
      case 'observacoes':
        return renderObservacoesTab();
      case 'historico':
        return renderHistoricoTab();
      default:
        return null;
    }
  };

  return (
    <PageFrame
      title={currentTitle}
      subtitle={isEdit ? 'Edicao completa com abas no padrao do legado.' : 'Criacao com vinculo em Pessoa e fluxo completo.'}
      actions={
        <button className="btn-muted" onClick={() => navigate('/cadastro/administradoras')}>
          Voltar para listagem
        </button>
      }
    >
      <div className="entity-meta-bar">
        <span><strong>Pessoa:</strong> {pessoaId ?? 'Nao vinculada'}</span>
        <span><strong>Documento:</strong> {formatCpfCnpj(pessoaForm.cnpjCpf)}</span>
      </div>

      <div className="entity-tabs" role="tablist" aria-label="Abas de cadastro da administradora">
        {tabs.map((tab) => {
          const disabled = !canAccessSubTabs && tab.key !== 'administradora';

          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              className={`entity-tab-btn ${activeTab === tab.key ? 'is-active' : ''}`}
              onClick={() => changeTab(tab.key)}
              disabled={disabled}
              aria-selected={activeTab === tab.key}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {loading ? <div className="entity-loading">Carregando cadastro...</div> : renderCurrentTab()}
    </PageFrame>
  );
};
