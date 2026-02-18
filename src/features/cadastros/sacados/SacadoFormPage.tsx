import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getErrorMessage, http } from '../../../shared/api/http';
import { PageFrame } from '../../../shared/ui/PageFrame';
import type { PagedResponse } from '../../../shared/types/paging';
import { applyCpfCnpjMask, applyPhoneMask, formatCpfCnpj, formatDateTime, isValidCpfCnpj, isValidPhone, readPagedResponse, sanitizeDocument, type CadastroArquivoDto, type CadastroObservacaoDto, type HistoricoItemDto } from '../cadastroCommon';
import '../cadastro.css';
import '../administradoras/entity-form.css';

type TabKey = 'sacado' | 'complemento' | 'contatos' | 'representantes' | 'anexos' | 'observacoes' | 'historico';

type SacadoDto = { id: string; nome: string; documento: string; email?: string | null; telefone?: string | null; cidade?: string | null; uf?: string | null; ativo: boolean; };
type SacadoComplementoDto = { sacadoId: string; nomeFantasia?: string | null; classificacao?: string | null; grupoEconomico?: string | null; limiteTotal?: number | null; observacoes?: string | null; };
type SacadoContatoDto = { id: string; tipoContato: string; nome: string; email: string; telefone1: string; telefone2?: string | null; };
type SacadoRepresentanteDto = { id: string; representanteId: string; nomeRepresentante: string; documentoRepresentante: string; funcao?: string | null; ativo: boolean; };
type RepresentanteOption = { id: string; nome: string; cnpjCpf: string; ativo: boolean; };

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'sacado', label: 'Sacado' },
  { key: 'complemento', label: 'Complemento' },
  { key: 'contatos', label: 'Contatos' },
  { key: 'representantes', label: 'Representantes' },
  { key: 'anexos', label: 'Anexos' },
  { key: 'observacoes', label: 'Observações' },
  { key: 'historico', label: 'Histórico' },
];

const parseNumber = (value: string): number | null => {
  const n = Number(value.replace(',', '.').trim());
  return Number.isFinite(n) ? n : null;
};

export const SacadoFormPage = () => {
  const { id: sacadoId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!sacadoId;
  const [loading, setLoading] = useState(isEdit);
  const [activeTab, setActiveTab] = useState<TabKey>('sacado');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ nome: '', cnpjCpf: '', email: '', telefone: '', cidade: '', uf: '', ativo: true });
  const [complemento, setComplemento] = useState<SacadoComplementoDto>({ sacadoId: '', nomeFantasia: '', classificacao: '', grupoEconomico: '', limiteTotal: null, observacoes: '' });
  const [contatos, setContatos] = useState<SacadoContatoDto[]>([]);
  const [contatoForm, setContatoForm] = useState({ id: '', tipoContato: '', nome: '', email: '', telefone1: '', telefone2: '' });
  const [representantes, setRepresentantes] = useState<SacadoRepresentanteDto[]>([]);
  const [representanteOptions, setRepresentanteOptions] = useState<RepresentanteOption[]>([]);
  const [representanteForm, setRepresentanteForm] = useState({ id: '', representanteId: '', funcao: '', ativo: true });
  const [anexos, setAnexos] = useState<CadastroArquivoDto[]>([]);
  const [anexoFile, setAnexoFile] = useState<File | null>(null);
  const [observacoes, setObservacoes] = useState<CadastroObservacaoDto[]>([]);
  const [observacaoTexto, setObservacaoTexto] = useState('');
  const [historico, setHistorico] = useState<PagedResponse<HistoricoItemDto>>({ items: [], page: 1, pageSize: 20, totalItems: 0, totalPages: 1 });

  const canAccessSubTabs = isEdit;

  const loadRepresentanteOptions = async () => {
    try {
      const r = await http.get('/cadastros/representantes', { params: { page: 1, pageSize: 200, sortBy: 'nome', sortDir: 'asc' } });
      const p = readPagedResponse<RepresentanteOption>(r.data);
      setRepresentanteOptions(p.items.filter((x) => x.ativo));
    } catch {
      setRepresentanteOptions([]);
    }
  };

  const loadSubTabs = async (id: string) => {
    const [c1, c2, c3, c4, c5, c6] = await Promise.all([
      http.get(`/cadastros/sacados/${id}/complemento`),
      http.get(`/cadastros/sacados/${id}/contatos`),
      http.get(`/cadastros/sacados/${id}/representantes`),
      http.get(`/cadastros/sacados/${id}/anexos`),
      http.get(`/cadastros/sacados/${id}/observacoes`),
      http.get(`/cadastros/sacados/${id}/historico`, { params: { page: 1, pageSize: 20 } }),
    ]);

    const comp = c1.data as SacadoComplementoDto;
    setComplemento({ sacadoId: id, nomeFantasia: comp.nomeFantasia ?? '', classificacao: comp.classificacao ?? '', grupoEconomico: comp.grupoEconomico ?? '', limiteTotal: comp.limiteTotal ?? null, observacoes: comp.observacoes ?? '' });
    setContatos((c2.data as SacadoContatoDto[]) ?? []);
    setRepresentantes((c3.data as SacadoRepresentanteDto[]) ?? []);
    setAnexos((c4.data as CadastroArquivoDto[]) ?? []);
    setObservacoes((c5.data as CadastroObservacaoDto[]) ?? []);
    setHistorico(readPagedResponse<HistoricoItemDto>(c6.data));
  };

  useEffect(() => { void loadRepresentanteOptions(); }, []);

  useEffect(() => {
    const boot = async () => {
      if (!sacadoId) { setLoading(false); return; }
      setLoading(true);
      try {
        const r = await http.get(`/cadastros/sacados/${sacadoId}`);
        const s = r.data as SacadoDto;
        setForm({ nome: s.nome ?? '', cnpjCpf: applyCpfCnpjMask(s.documento ?? ''), email: s.email ?? '', telefone: applyPhoneMask(s.telefone ?? ''), cidade: s.cidade ?? '', uf: s.uf ?? '', ativo: s.ativo });
        await loadSubTabs(sacadoId);
      } catch (e) {
        toast.error(getErrorMessage(e));
      } finally {
        setLoading(false);
      }
    };
    void boot();
  }, [sacadoId]);

  const saveSacado = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.nome.trim()) return void toast.error('Informe o nome do sacado.');
    if (!isValidCpfCnpj(form.cnpjCpf)) return void toast.error('Informe CPF/CNPJ válido.');
    if (form.telefone.trim() && !isValidPhone(form.telefone)) return void toast.error('Informe telefone válido com DDD.');

    setSaving(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        documento: sanitizeDocument(form.cnpjCpf),
        email: form.email.trim() || null,
        telefone: sanitizeDocument(form.telefone) || null,
        cidade: form.cidade.trim() || null,
        uf: form.uf.trim() || null,
        ativo: form.ativo,
      };

      if (sacadoId) {
        await http.put(`/cadastros/sacados/${sacadoId}`, payload);
        toast.success('Sacado atualizado.');
      } else {
        const r = await http.post('/cadastros/sacados', payload);
        const created = r.data as { id: string };
        toast.success('Sacado criado.');
        navigate(`/cadastro/sacados/${created.id}`, { replace: true });
      }
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const saveComplemento = async () => {
    if (!sacadoId) return;
    try {
      await http.put(`/cadastros/sacados/${sacadoId}/complemento`, {
        nomeFantasia: complemento.nomeFantasia?.trim() || null,
        classificacao: complemento.classificacao?.trim() || null,
        grupoEconomico: complemento.grupoEconomico?.trim() || null,
        limiteTotal: typeof complemento.limiteTotal === 'number' ? complemento.limiteTotal : null,
        observacoes: complemento.observacoes?.trim() || null,
      });
      toast.success('Complemento salvo.');
      await loadSubTabs(sacadoId);
    } catch (e) { toast.error(getErrorMessage(e)); }
  };

  const saveContato = async () => {
    if (!sacadoId) return;
    if (!contatoForm.nome.trim()) return void toast.error('Informe o nome do contato.');
    if (!contatoForm.email.trim()) return void toast.error('Informe o e-mail do contato.');
    if (!isValidPhone(contatoForm.telefone1)) return void toast.error('Telefone 1 inválido.');

    const payload = { tipoContato: contatoForm.tipoContato.trim() || 'Comercial', nome: contatoForm.nome.trim(), email: contatoForm.email.trim(), telefone1: sanitizeDocument(contatoForm.telefone1), telefone2: sanitizeDocument(contatoForm.telefone2) || null };
    try {
      if (contatoForm.id) await http.put(`/cadastros/sacados/${sacadoId}/contatos/${contatoForm.id}`, payload); else await http.post(`/cadastros/sacados/${sacadoId}/contatos`, payload);
      setContatoForm({ id: '', tipoContato: '', nome: '', email: '', telefone1: '', telefone2: '' });
      await loadSubTabs(sacadoId);
    } catch (e) { toast.error(getErrorMessage(e)); }
  };

  const saveRepresentante = async () => {
    if (!sacadoId) return;
    if (!representanteForm.representanteId) return void toast.error('Selecione um representante.');

    try {
      if (representanteForm.id) {
        await http.put(`/cadastros/sacados/${sacadoId}/representantes/${representanteForm.id}`, { funcao: representanteForm.funcao.trim() || null, ativo: representanteForm.ativo });
      } else {
        await http.post(`/cadastros/sacados/${sacadoId}/representantes`, { representanteId: representanteForm.representanteId, funcao: representanteForm.funcao.trim() || null });
      }
      setRepresentanteForm({ id: '', representanteId: '', funcao: '', ativo: true });
      await loadSubTabs(sacadoId);
    } catch (e) { toast.error(getErrorMessage(e)); }
  };

  const uploadAnexo = async () => {
    if (!sacadoId || !anexoFile) return void toast.error('Selecione um arquivo.');
    try {
      const fd = new FormData();
      fd.append('file', anexoFile);
      await http.post(`/cadastros/sacados/${sacadoId}/anexos`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setAnexoFile(null);
      await loadSubTabs(sacadoId);
    } catch (e) { toast.error(getErrorMessage(e)); }
  };

  const addObservacao = async () => {
    if (!sacadoId || !observacaoTexto.trim()) return;
    try {
      await http.post(`/cadastros/sacados/${sacadoId}/observacoes`, { texto: observacaoTexto.trim() });
      setObservacaoTexto('');
      await loadSubTabs(sacadoId);
    } catch (e) { toast.error(getErrorMessage(e)); }
  };

  const removeItem = async (url: string, msg: string) => {
    if (!window.confirm(msg)) return;
    try { await http.delete(url); if (sacadoId) await loadSubTabs(sacadoId); } catch (e) { toast.error(getErrorMessage(e)); }
  };

  if (loading) return <PageFrame title="Cadastro de Sacado" subtitle="Carregando dados..."><div className="entity-loading">Carregando...</div></PageFrame>;

  return (
    <PageFrame title="Cadastro de Sacado" subtitle={isEdit ? 'Cadastro completo em tela cheia, com abas no padrão do legado.' : 'Novo cadastro. Após salvar, as abas complementares serão liberadas.'} actions={<Link className="btn-muted" to="/cadastro/sacados">Voltar para lista</Link>}>
      <div className="entity-meta-bar"><span><strong>ID:</strong> {sacadoId ?? 'novo'}</span><span><strong>Documento:</strong> {form.cnpjCpf ? formatCpfCnpj(form.cnpjCpf) : '-'}</span><span><strong>Situação:</strong> {form.ativo ? 'Ativo' : 'Inativo'}</span></div>

      <div className="entity-tabs" role="tablist" aria-label="Abas de cadastro do sacado">
        {tabs.map((t) => <button key={t.key} type="button" role="tab" className={`entity-tab-btn ${activeTab === t.key ? 'is-active' : ''}`} disabled={t.key !== 'sacado' && !canAccessSubTabs} onClick={() => setActiveTab(t.key)}>{t.label}</button>)}
      </div>

      {activeTab === 'sacado' && (
        <form className="entity-form-stack" onSubmit={saveSacado}>
          <section className="entity-card"><header><h3>Informações Públicas (Receita)</h3></header>
            <div className="entity-grid cols-3">
              <label><span>Nome</span><input value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))} required /></label>
              <label><span>CPF/CNPJ</span><input value={form.cnpjCpf} onChange={(e) => setForm((p) => ({ ...p, cnpjCpf: applyCpfCnpjMask(e.target.value) }))} disabled={isEdit} required /></label>
              <label><span>E-mail</span><input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} /></label>
              <label><span>Telefone</span><input value={form.telefone} onChange={(e) => setForm((p) => ({ ...p, telefone: applyPhoneMask(e.target.value) }))} /></label>
              <label><span>Cidade</span><input value={form.cidade} onChange={(e) => setForm((p) => ({ ...p, cidade: e.target.value }))} /></label>
              <label><span>UF</span><input value={form.uf} maxLength={2} onChange={(e) => setForm((p) => ({ ...p, uf: e.target.value.toUpperCase() }))} /></label>
              <label className="checkbox-inline"><input type="checkbox" checked={form.ativo} onChange={(e) => setForm((p) => ({ ...p, ativo: e.target.checked }))} /><span>Cadastro ativo</span></label>
            </div>
          </section>
          <div className="entity-actions"><button type="submit" className="btn-main" disabled={saving}>{saving ? 'Salvando...' : 'Salvar Sacado'}</button></div>
        </form>
      )}

      {activeTab === 'complemento' && <section className="entity-card"><div className="entity-grid cols-3">
        <label><span>Nome fantasia</span><input value={complemento.nomeFantasia ?? ''} onChange={(e) => setComplemento((p) => ({ ...p, nomeFantasia: e.target.value }))} /></label>
        <label><span>Classificação</span><input value={complemento.classificacao ?? ''} onChange={(e) => setComplemento((p) => ({ ...p, classificacao: e.target.value }))} /></label>
        <label><span>Grupo econômico</span><input value={complemento.grupoEconomico ?? ''} onChange={(e) => setComplemento((p) => ({ ...p, grupoEconomico: e.target.value }))} /></label>
        <label><span>Limite total</span><input value={complemento.limiteTotal ?? ''} onChange={(e) => setComplemento((p) => ({ ...p, limiteTotal: parseNumber(e.target.value) }))} /></label>
        <label className="span-all"><span>Observações</span><textarea value={complemento.observacoes ?? ''} onChange={(e) => setComplemento((p) => ({ ...p, observacoes: e.target.value }))} /></label>
      </div><div className="entity-actions"><button type="button" className="btn-main" onClick={() => void saveComplemento()}>Salvar Complemento</button></div></section>}

      {activeTab === 'contatos' && <section className="entity-form-stack"><section className="entity-card"><div className="entity-grid cols-3">
        <label><span>Tipo</span><input value={contatoForm.tipoContato} onChange={(e) => setContatoForm((p) => ({ ...p, tipoContato: e.target.value }))} /></label>
        <label><span>Nome</span><input value={contatoForm.nome} onChange={(e) => setContatoForm((p) => ({ ...p, nome: e.target.value }))} /></label>
        <label><span>E-mail</span><input value={contatoForm.email} onChange={(e) => setContatoForm((p) => ({ ...p, email: e.target.value }))} /></label>
        <label><span>Telefone 1</span><input value={contatoForm.telefone1} onChange={(e) => setContatoForm((p) => ({ ...p, telefone1: applyPhoneMask(e.target.value) }))} /></label>
        <label><span>Telefone 2</span><input value={contatoForm.telefone2} onChange={(e) => setContatoForm((p) => ({ ...p, telefone2: applyPhoneMask(e.target.value) }))} /></label>
      </div><div className="entity-actions"><button type="button" className="btn-main" onClick={() => void saveContato()}>{contatoForm.id ? 'Salvar contato' : 'Adicionar contato'}</button></div></section>
      <section className="entity-table-wrap"><table><thead><tr><th>Tipo</th><th>Nome</th><th>E-mail</th><th>Telefone 1</th><th>Telefone 2</th><th className="col-actions">Ações</th></tr></thead><tbody>{contatos.map((x) => <tr key={x.id}><td>{x.tipoContato || '-'}</td><td>{x.nome}</td><td>{x.email}</td><td>{applyPhoneMask(x.telefone1)}</td><td>{x.telefone2 ? applyPhoneMask(x.telefone2) : '-'}</td><td className="col-actions"><div className="table-actions"><button type="button" onClick={() => setContatoForm({ id: x.id, tipoContato: x.tipoContato ?? '', nome: x.nome, email: x.email, telefone1: applyPhoneMask(x.telefone1), telefone2: applyPhoneMask(x.telefone2 ?? '') })}>Editar</button><button type="button" className="danger" onClick={() => void removeItem(`/cadastros/sacados/${sacadoId}/contatos/${x.id}`, 'Remover contato?')}>Remover</button></div></td></tr>)}{contatos.length === 0 && <tr><td colSpan={6}>Nenhum contato cadastrado.</td></tr>}</tbody></table></section></section>}

      {activeTab === 'representantes' && <section className="entity-form-stack"><section className="entity-card"><div className="entity-grid cols-3">
        <label><span>Representante</span><select value={representanteForm.representanteId} disabled={!!representanteForm.id} onChange={(e) => setRepresentanteForm((p) => ({ ...p, representanteId: e.target.value }))}><option value="">Selecione</option>{representanteOptions.map((x) => <option key={x.id} value={x.id}>{x.nome} ({formatCpfCnpj(x.cnpjCpf)})</option>)}</select></label>
        <label><span>Função</span><input value={representanteForm.funcao} onChange={(e) => setRepresentanteForm((p) => ({ ...p, funcao: e.target.value }))} /></label>
        <label className="checkbox-inline"><input type="checkbox" checked={representanteForm.ativo} disabled={!representanteForm.id} onChange={(e) => setRepresentanteForm((p) => ({ ...p, ativo: e.target.checked }))} /><span>Vínculo ativo</span></label>
      </div><div className="entity-actions"><button type="button" className="btn-main" onClick={() => void saveRepresentante()}>{representanteForm.id ? 'Salvar vínculo' : 'Vincular representante'}</button></div></section>
      <section className="entity-table-wrap"><table><thead><tr><th>Representante</th><th>Documento</th><th>Função</th><th>Status</th><th className="col-actions">Ações</th></tr></thead><tbody>{representantes.map((x) => <tr key={x.id}><td>{x.nomeRepresentante}</td><td>{formatCpfCnpj(x.documentoRepresentante)}</td><td>{x.funcao ?? '-'}</td><td>{x.ativo ? 'Ativo' : 'Inativo'}</td><td className="col-actions"><div className="table-actions"><button type="button" onClick={() => setRepresentanteForm({ id: x.id, representanteId: x.representanteId, funcao: x.funcao ?? '', ativo: x.ativo })}>Editar</button><button type="button" className="danger" onClick={() => void removeItem(`/cadastros/sacados/${sacadoId}/representantes/${x.id}`, 'Remover vínculo?')}>Remover</button></div></td></tr>)}{representantes.length === 0 && <tr><td colSpan={5}>Nenhum representante vinculado.</td></tr>}</tbody></table></section></section>}

      {activeTab === 'anexos' && <section className="entity-form-stack"><section className="entity-card"><div className="entity-grid cols-2"><label><span>Arquivo</span><input type="file" onChange={(e) => setAnexoFile(e.target.files?.[0] ?? null)} /></label><div className="entity-inline-actions"><button type="button" className="btn-main" onClick={() => void uploadAnexo()}>Enviar anexo</button></div></div></section>
      <section className="entity-table-wrap"><table><thead><tr><th>Arquivo</th><th>Tipo</th><th>Tamanho</th><th>Data</th><th className="col-actions">Ações</th></tr></thead><tbody>{anexos.map((x) => <tr key={x.id}><td>{x.nomeArquivo}</td><td>{x.contentType}</td><td>{x.tamanhoBytes}</td><td>{formatDateTime(x.createdAt)}</td><td className="col-actions"><div className="table-actions"><button type="button" className="danger" onClick={() => void removeItem(`/cadastros/sacados/${sacadoId}/anexos/${x.id}`, 'Remover anexo?')}>Remover</button></div></td></tr>)}{anexos.length === 0 && <tr><td colSpan={5}>Nenhum anexo cadastrado.</td></tr>}</tbody></table></section></section>}

      {activeTab === 'observacoes' && <section className="entity-form-stack"><section className="entity-card"><label className="span-all"><span>Texto</span><textarea value={observacaoTexto} onChange={(e) => setObservacaoTexto(e.target.value)} /></label><div className="entity-actions"><button type="button" className="btn-main" onClick={() => void addObservacao()}>Incluir observação</button></div></section>
      <section className="entity-table-wrap"><table><thead><tr><th>Autor</th><th>Data</th><th>Texto</th><th className="col-actions">Ações</th></tr></thead><tbody>{observacoes.map((x) => <tr key={x.id}><td>{x.autorEmail ?? '-'}</td><td>{formatDateTime(x.createdAt)}</td><td>{x.texto}</td><td className="col-actions"><div className="table-actions"><button type="button" className="danger" onClick={() => void removeItem(`/cadastros/sacados/${sacadoId}/observacoes/${x.id}`, 'Remover observação?')}>Remover</button></div></td></tr>)}{observacoes.length === 0 && <tr><td colSpan={4}>Nenhuma observação cadastrada.</td></tr>}</tbody></table></section></section>}

      {activeTab === 'historico' && <section className="entity-card"><div className="entity-table-wrap"><table><thead><tr><th>Ação</th><th>Entidade</th><th>Usuário</th><th>Data</th><th>TraceId</th><th>Payload</th></tr></thead><tbody>{historico.items.map((x) => <tr key={x.id}><td>{x.acao}</td><td>{x.entidade}</td><td>{x.userEmail ?? '-'}</td><td>{formatDateTime(x.createdAt)}</td><td className="trace-id-cell">{x.traceId}</td><td>{x.payloadJson ?? '-'}</td></tr>)}{historico.items.length === 0 && <tr><td colSpan={6}>Nenhum histórico encontrado.</td></tr>}</tbody></table></div></section>}
    </PageFrame>
  );
};
