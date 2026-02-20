import { expect, test } from '@playwright/test';

type RecordItem = { id: string; [key: string]: unknown };

const createId = () => `${Date.now()}${Math.floor(Math.random() * 100000)}`;

const createPaged = (items: RecordItem[], page = 1, pageSize = 10) => ({
  items,
  page,
  pageSize,
  totalItems: items.length,
  totalPages: Math.max(1, Math.ceil(items.length / pageSize)),
});

const setupApiMock = async (page: import('@playwright/test').Page) => {
  const people = new Map<string, RecordItem>();

  const seededPersonId = createId();
  const seededCedenteId = createId();
  people.set(seededPersonId, {
    id: seededPersonId,
    nome: 'Representante Seed',
    cnpjCpf: '12345678901',
    documentoNormalizado: '12345678901',
    tipoPessoa: 'Fisica',
    email: 'rep@seed.local',
    telefone: '11999999999',
    cidade: 'Sao Paulo',
    uf: 'SP',
    observacoesGerais: null,
    ativo: true,
    enderecos: [],
    contatos: [],
    qsas: [],
  });

  const state = {
    loggedIn: false,
    adm: [] as RecordItem[],
    age: [] as RecordItem[],
    tes: [] as RecordItem[],
    con: [] as RecordItem[],
    cus: [] as RecordItem[],
    ges: [] as RecordItem[],
    frn: [] as RecordItem[],
    emi: [] as RecordItem[],
    inv: [] as RecordItem[],
    pre: [] as RecordItem[],
    ban: [] as RecordItem[],
    bac: [] as RecordItem[],
    des: [] as RecordItem[],
    ced: [{
      id: seededCedenteId,
      pessoaId: seededPersonId,
      nome: 'Cedente Seed',
      cnpjCpf: '12345678000199',
      cidade: 'Sao Paulo',
      uf: 'SP',
      ativo: true,
      status: 'ABERTO',
    }],
    rep: [{
      id: createId(),
      pessoaId: seededPersonId,
      nome: 'Representante Seed',
      cnpjCpf: '12345678901',
      email: 'rep@seed.local',
      telefone: '11999999999',
      ativo: true,
    }],
    operacoes: [{
      id: createId(),
      numero: 'OP-SEED-1',
      descricao: 'Operacao Seed',
      valor: 1000,
      dataOperacao: '2026-02-18T10:00:00Z',
      status: 'Aberta',
    }],
    importacoes: [{
      id: createId(),
      fidcId: '00000000-0000-0000-0000-000000000001',
      origem: 'CNAB',
      tipoArquivo: 'CNAB',
      modalidade: 'DUPLICATA',
      cedenteId: seededCedenteId,
      fileName: 'falha-seed.rem',
      fileHash: 'abc123',
      status: 'FINALIZADO_FALHA',
      errorSummary: 'Falha de validação de linhas.',
      ultimoCodigoFalha: 'CNAB_SEM_LINHAS_VALIDAS',
      tentativas: 1,
      createdAt: '2026-02-18T08:00:00Z',
      completedAt: '2026-02-18T08:01:00Z',
      userEmail: 'admin@black101.local',
      eventos: [
        { id: createId(), status: 'PROCESSANDO', message: 'Arquivo recebido.', createdAt: '2026-02-18T08:00:00Z' },
        { id: createId(), status: 'FINALIZADO_FALHA', message: 'Falha de validação de linhas.', createdAt: '2026-02-18T08:01:00Z' },
      ],
    }],
    users: [{
      id: createId(),
      nomeCompleto: 'Administrador Black101',
      email: 'admin@black101.local',
      ativo: true,
    }],
    roles: [{
      id: createId(),
      nome: 'ADMIN',
      ativo: true,
    }],
  };
  const cedenteTabs = new Map<string, Record<string, RecordItem | RecordItem[]>>();
  const ensureCedenteTabs = (cedenteId: string) => {
    const current = cedenteTabs.get(cedenteId);
    if (current) return current;

    const created: Record<string, RecordItem | RecordItem[]> = {
      complemento: { id: createId(), cedenteId, autoAprovacao: false, desabilitarAcoesConsultorAposAtivo: false },
      contatos: [],
      representantes: [],
      contas: [],
      documentos: [],
      parametrizacao: [],
      contratos: [],
      atualizacoes: [],
      despesas: [],
      juridico: [],
      pendencias: [],
      anexos: [],
      observacoes: [],
    };

    cedenteTabs.set(cedenteId, created);
    return created;
  };
  ensureCedenteTabs(seededCedenteId).parametrizacao = [
    { id: createId(), cedenteId: seededCedenteId, modalidadeNome: 'DUPLICATA' },
    { id: createId(), cedenteId: seededCedenteId, modalidadeNome: 'CCB' },
  ];

  const ensurePersonByDocument = (documento: string) => {
    const normalized = String(documento ?? '').replace(/\D/g, '');
    const existing = Array.from(people.values()).find((item) => String(item.cnpjCpf ?? '').replace(/\D/g, '') === normalized);
    if (existing) return existing;

    const personId = createId();
    const created = {
      id: personId,
      nome: `Pessoa ${normalized.slice(-6) || 'Auto'}`,
      cnpjCpf: normalized,
      documentoNormalizado: normalized,
      tipoPessoa: normalized.length > 11 ? 'Juridica' : 'Fisica',
      email: null,
      telefone: null,
      cidade: 'Sao Paulo',
      uf: 'SP',
      observacoesGerais: null,
      ativo: true,
      enderecos: [],
      contatos: [],
      qsas: [],
    };
    people.set(personId, created);
    return created;
  };

  const csrfHandler = async (route: import('@playwright/test').Route) => {
    await route.fulfill({
      status: 200,
      headers: {
        'content-type': 'application/json',
        'set-cookie': 'XSRF-TOKEN=mocked-token; Path=/; SameSite=Lax',
      },
      body: JSON.stringify({ token: 'mocked-token' }),
    });
  };

  const loginHandler = async (route: import('@playwright/test').Route) => {
    const data = route.request().postDataJSON() as { password: string };
    if (data.password !== 'Master@5859') {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Usuário ou senha inválidos.' }),
      });
      return;
    }

    state.loggedIn = true;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'ok', model: { token: 'legacy-pre-token' }, code: 200 }),
    });
  };

  const meHandler = async (route: import('@playwright/test').Route) => {
    if (!state.loggedIn) {
      await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ detail: 'não autenticado' }) });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: { id: '1', name: 'Administrador Black101', email: 'admin@black101.local' },
        roles: ['ADMIN'],
        claims: ['CAD_ADM_L'],
      }),
    });
  };

  const logoutHandler = async (route: import('@playwright/test').Route) => {
    state.loggedIn = false;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'ok' }) });
  };

  await page.route('**/auth/csrf', csrfHandler);
  await page.route('**/auth/login', loginHandler);
  await page.route('**/auth/me', meHandler);
  await page.route('**/auth/logout', logoutHandler);

  await page.route('**/authentication/login', loginHandler);
  await page.route('**/authentication/logout', logoutHandler);
  await page.route('**/api/authentication/login', loginHandler);
  await page.route('**/api/authentication/logout', logoutHandler);
  await page.route('**/authentication/gettoken', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ model: 'legacy-session-token', code: 200 }),
    });
  });
  await page.route('**/api/authentication/gettoken', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ model: 'legacy-session-token', code: 200 }),
    });
  });
  const validateQrcodeHandler = async (route: import('@playwright/test').Route) => {
    const body = route.request().postDataJSON() as { code?: string };
    const isValid = String(body.code ?? '') === '123456';
    if (isValid) {
      state.loggedIn = true;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ model: { token: isValid ? 'legacy-pre-token' : '' }, code: 200 }),
    });
  };
  await page.route('**/authentication/validateQrcode', validateQrcodeHandler);
  await page.route('**/api/authentication/validateQrcode', validateQrcodeHandler);
  const generateQrCodeHandler = async (route: import('@playwright/test').Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        model: { qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMBgUY8ailAAAAASUVORK5CYII=' },
        code: 200,
      }),
    });
  };
  await page.route('**/authentication/generateQrCode**', generateQrCodeHandler);
  await page.route('**/api/authentication/generateQrCode**', generateQrCodeHandler);
  const resetTotpHandler = async (route: import('@playwright/test').Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ model: { reenviado: true, mensagem: 'Email enviado com sucesso' }, code: 200 }),
    });
  };
  await page.route('**/authentication/reset-totp', resetTotpHandler);
  await page.route('**/api/authentication/reset-totp', resetTotpHandler);
  await page.route('**/user/get/context', async (route) => {
    if (!state.loggedIn) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'não autenticado' }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        model: {
          id: '1',
          nome: 'Administrador Black101',
          email: 'admin@black101.local',
          fidcs: [
            { id: '00000000-0000-0000-0000-000000000001', nome: 'FIDC Seed', cnpjCpf: '12345678000199' },
          ],
          roles: ['ADMIN'],
          claims: ['CAD_ADM_L'],
        },
        code: 200,
      }),
    });
  });
  await page.route('**/api/user/get/context', async (route) => {
    if (!state.loggedIn) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'não autenticado' }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        model: {
          id: '1',
          nome: 'Administrador Black101',
          email: 'admin@black101.local',
          fidcs: [
            { id: '00000000-0000-0000-0000-000000000001', nome: 'FIDC Seed', cnpjCpf: '12345678000199' },
          ],
          roles: ['ADMIN'],
          claims: ['CAD_ADM_L'],
        },
        code: 200,
      }),
    });
  });

  await page.route('**/user/get/list**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(createPaged(state.users)),
    });
  });
  await page.route('**/api/user/get/list**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(createPaged(state.users)),
    });
  });

  const registerUserHandler = async (route: import('@playwright/test').Route) => {
    const body = route.request().postDataJSON() as { pessoaId?: string; email?: string };
    state.users.push({
      id: createId(),
      nomeCompleto: `Usuário ${String(body.pessoaId ?? '').slice(0, 6) || 'Novo'}`,
      email: body.email ?? `user${Date.now()}@black101.local`,
      ativo: true,
    });

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: createId() }),
    });
  };
  await page.route('**/user/register', registerUserHandler);
  await page.route('**/api/user/register', registerUserHandler);

  await page.route('**/grupo/get/list**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(createPaged(state.roles)),
    });
  });
  await page.route('**/api/grupo/get/list**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(createPaged(state.roles)),
    });
  });

  const registerGroupHandler = async (route: import('@playwright/test').Route) => {
    const body = route.request().postDataJSON() as { nome?: string };
    state.roles.push({
      id: createId(),
      nome: body.nome ?? 'NOVO_PERFIL',
      ativo: true,
    });

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: createId() }),
    });
  };
  await page.route('**/grupo/register', registerGroupHandler);
  await page.route('**/api/grupo/register', registerGroupHandler);

  await page.route('**/api/banco/**', async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    const path = url.pathname;

    if (path === '/banco/get/list' && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(createPaged(state.ban)),
      });
      return;
    }

    if (/^\/banco\/get\/unique\/[^/]+$/.test(path) && method === 'GET') {
      const id = path.split('/').pop() ?? '';
      const found = state.ban.find((item) => item.id === id);
      await route.fulfill({
        status: found ? 200 : 404,
        contentType: 'application/json',
        body: JSON.stringify(found ?? {}),
      });
      return;
    }

    if (path === '/banco/register' && method === 'POST') {
      const body = route.request().postDataJSON() as RecordItem;
      const id = createId();
      state.ban.push({
        id,
        nome: body.nome ?? 'Banco',
        codigo: body.codigo ?? '000',
        ativo: true,
      });
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id }) });
      return;
    }

    if (path === '/banco/update' && method === 'PUT') {
      const body = route.request().postDataJSON() as RecordItem;
      const id = String(body.id ?? '');
      const idx = state.ban.findIndex((item) => item.id === id);
      if (idx >= 0) {
        state.ban[idx] = { ...state.ban[idx], ...body };
      }
      await route.fulfill({ status: 204, body: '' });
      return;
    }

    if (/^\/banco\/remove\/[^/]+$/.test(path) && method === 'DELETE') {
      const id = path.split('/').pop() ?? '';
      const idx = state.ban.findIndex((item) => item.id === id);
      if (idx >= 0) {
        state.ban.splice(idx, 1);
      }
      await route.fulfill({ status: 204, body: '' });
      return;
    }

    await route.fallback();
  });

  await page.route('**/api/despesa/**', async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    const path = url.pathname;

    if (path === '/despesa/get/list' && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(createPaged(state.des)),
      });
      return;
    }

    if (/^\/despesa\/get\/unique\/[^/]+$/.test(path) && method === 'GET') {
      const id = path.split('/').pop() ?? '';
      const found = state.des.find((item) => item.id === id);
      await route.fulfill({
        status: found ? 200 : 404,
        contentType: 'application/json',
        body: JSON.stringify(found ?? {}),
      });
      return;
    }

    if (path === '/despesa/register' && method === 'POST') {
      const body = route.request().postDataJSON() as RecordItem;
      const id = createId();
      state.des.push({
        id,
        nome: body.nome ?? 'Despesa',
        segmento: Number(body.segmento ?? 2),
        tipo: Number(body.tipo ?? 2),
        valorBase: Number(body.valor ?? 0),
        status: 1,
      });
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id }) });
      return;
    }

    if (path === '/despesa/update' && method === 'PUT') {
      const body = route.request().postDataJSON() as RecordItem;
      const id = String(body.id ?? '');
      const idx = state.des.findIndex((item) => item.id === id);
      if (idx >= 0) {
        state.des[idx] = {
          ...state.des[idx],
          ...body,
          valorBase: Number(body.valor ?? state.des[idx].valorBase ?? 0),
          tipo: Number(body.tipo ?? state.des[idx].tipo ?? 2),
        };
      }
      await route.fulfill({ status: 204, body: '' });
      return;
    }

    if (/^\/despesa\/(activate|deactivate)\/[^/]+$/.test(path) && method === 'PUT') {
      const id = path.split('/').pop() ?? '';
      const idx = state.des.findIndex((item) => item.id === id);
      if (idx >= 0) {
        state.des[idx] = { ...state.des[idx], status: path.includes('/activate/') ? 1 : 0 };
      }
      await route.fulfill({ status: 204, body: '' });
      return;
    }

    if (/^\/despesa\/remove\/[^/]+$/.test(path) && method === 'DELETE') {
      const id = path.split('/').pop() ?? '';
      const idx = state.des.findIndex((item) => item.id === id);
      if (idx >= 0) {
        state.des.splice(idx, 1);
      }
      await route.fulfill({ status: 204, body: '' });
      return;
    }

    await route.fallback();
  });

  await page.route('**/api/pessoa/**', async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    const path = url.pathname;

    if (/^\/pessoa\/get\/cnpjcpf\/[^/]+$/.test(path) && method === 'GET') {
      const documento = decodeURIComponent(path.split('/').pop() ?? '').replace(/\D/g, '');
      const person = ensurePersonByDocument(documento);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(person) });
      return;
    }

    if (path === '/pessoa/register' && method === 'POST') {
      const body = route.request().postDataJSON() as RecordItem;
      const cnpjCpf = String(body.cnpjCpf ?? '').replace(/\D/g, '');
      const existing = Array.from(people.values()).find((item) => String(item.cnpjCpf ?? '').replace(/\D/g, '') === cnpjCpf);
      if (existing) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: existing.id }) });
        return;
      }

      const id = createId();
      people.set(id, {
        id,
        ...body,
        cnpjCpf,
        contatos: body.contatos ?? [],
      });
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id }) });
      return;
    }

    if (path === '/pessoa/update' && method === 'PUT') {
      const body = route.request().postDataJSON() as RecordItem;
      const id = String(body.id ?? '');
      const current = people.get(id);
      if (current) {
        people.set(id, { ...current, ...body });
      }
      await route.fulfill({ status: 204, body: '' });
      return;
    }

    await route.fallback();
  });

  await page.route('**/api/agente/**', async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    const path = url.pathname;

    if (path === '/agente/get/list' && method === 'GET') {
      const rows = state.age.map((item) => {
        const person = people.get(String(item.pessoaId));
        return {
          id: item.id,
          status: item.status ?? 0,
          pessoa: person
            ? {
                id: person.id,
                nome: person.nome,
                cnpjCpf: person.cnpjCpf,
                contatos: person.contatos ?? [],
              }
            : null,
        };
      });

      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(createPaged(rows)) });
      return;
    }

    if (/^\/agente\/get\/unique\/[^/]+$/.test(path) && method === 'GET') {
      const id = path.split('/').pop() ?? '';
      const found = state.age.find((item) => item.id === id);
      if (!found) {
        await route.fulfill({ status: 404, body: '{}' });
        return;
      }

      const person = people.get(String(found.pessoaId));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: found.id,
          status: found.status ?? 0,
          pessoa: person
            ? {
                id: person.id,
                nome: person.nome,
                cnpjCpf: person.cnpjCpf,
                contatos: person.contatos ?? [],
              }
            : null,
        }),
      });
      return;
    }

    if (path === '/agente/register' && method === 'POST') {
      const body = route.request().postDataJSON() as { pessoaId?: string };
      const existing = state.age.find((item) => String(item.pessoaId) === String(body.pessoaId ?? ''));
      const id = existing?.id ?? createId();
      if (!existing) {
        state.age.push({ id, pessoaId: body.pessoaId ?? '', status: 0 });
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id }) });
      return;
    }

    if (path === '/agente/update' && method === 'PUT') {
      const body = route.request().postDataJSON() as { id?: string; status?: number };
      const idx = state.age.findIndex((item) => item.id === String(body.id ?? ''));
      if (idx >= 0) {
        state.age[idx] = { ...state.age[idx], status: Number(body.status ?? 0) };
      }
      await route.fulfill({ status: 204, body: '' });
      return;
    }

    if (/^\/agente\/remove\/[^/]+$/.test(path) && method === 'DELETE') {
      const id = path.split('/').pop() ?? '';
      const idx = state.age.findIndex((item) => item.id === id);
      if (idx >= 0) {
        state.age.splice(idx, 1);
      }
      await route.fulfill({ status: 204, body: '' });
      return;
    }

    await route.fallback();
  });

  await page.route('**/api/testemunha/**', async (route) => {
    const method = route.request().method();
    const path = new URL(route.request().url()).pathname;

    if (path === '/testemunha/get/list' && method === 'GET') {
      const rows = state.tes.map((item) => {
        const person = people.get(String(item.pessoaId));
        return {
          id: item.id,
          status: item.status ?? 0,
          pessoa: person
            ? {
                id: person.id,
                nome: person.nome,
                cnpjCpf: person.cnpjCpf,
                contatos: person.contatos ?? [],
              }
            : null,
        };
      });

      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(createPaged(rows)) });
      return;
    }

    if (/^\/testemunha\/get\/unique\/[^/]+$/.test(path) && method === 'GET') {
      const id = path.split('/').pop() ?? '';
      const found = state.tes.find((item) => item.id === id);
      if (!found) {
        await route.fulfill({ status: 404, body: '{}' });
        return;
      }

      const person = people.get(String(found.pessoaId));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: found.id,
          status: found.status ?? 0,
          pessoa: person
            ? {
                id: person.id,
                nome: person.nome,
                cnpjCpf: person.cnpjCpf,
                contatos: person.contatos ?? [],
              }
            : null,
        }),
      });
      return;
    }

    if (path === '/testemunha/register' && method === 'POST') {
      const body = route.request().postDataJSON() as { pessoaId?: string };
      const existing = state.tes.find((item) => String(item.pessoaId) === String(body.pessoaId ?? ''));
      const id = existing?.id ?? createId();
      if (!existing) {
        state.tes.push({ id, pessoaId: body.pessoaId ?? '', status: 0 });
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id }) });
      return;
    }

    if (path === '/testemunha/update' && method === 'PUT') {
      const body = route.request().postDataJSON() as { id?: string; status?: number };
      const idx = state.tes.findIndex((item) => item.id === String(body.id ?? ''));
      if (idx >= 0) {
        state.tes[idx] = { ...state.tes[idx], status: Number(body.status ?? 0) };
      }
      await route.fulfill({ status: 204, body: '' });
      return;
    }

    if (/^\/testemunha\/remove\/[^/]+$/.test(path) && method === 'DELETE') {
      const id = path.split('/').pop() ?? '';
      const idx = state.tes.findIndex((item) => item.id === id);
      if (idx >= 0) {
        state.tes.splice(idx, 1);
      }
      await route.fulfill({ status: 204, body: '' });
      return;
    }

    await route.fallback();
  });

  await page.route('**/api/representante/**', async (route) => {
    const method = route.request().method();
    const path = new URL(route.request().url()).pathname;

    if (path === '/representante/get/list' && method === 'GET') {
      const rows = state.rep.map((item) => {
        const person = people.get(String(item.pessoaId));
        return {
          id: item.id,
          status: item.status ?? 0,
          pessoa: person
            ? {
                id: person.id,
                nome: person.nome,
                cnpjCpf: person.cnpjCpf,
                contatos: person.contatos ?? [],
              }
            : null,
        };
      });

      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(createPaged(rows)) });
      return;
    }

    if (/^\/representante\/get\/unique\/[^/]+$/.test(path) && method === 'GET') {
      const id = path.split('/').pop() ?? '';
      const found = state.rep.find((item) => item.id === id);
      if (!found) {
        await route.fulfill({ status: 404, body: '{}' });
        return;
      }

      const person = people.get(String(found.pessoaId));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: found.id,
          status: found.status ?? 0,
          pessoa: person
            ? {
                id: person.id,
                nome: person.nome,
                cnpjCpf: person.cnpjCpf,
                contatos: person.contatos ?? [],
              }
            : null,
        }),
      });
      return;
    }

    if (path === '/representante/register' && method === 'POST') {
      const body = route.request().postDataJSON() as { pessoaId?: string };
      const existing = state.rep.find((item) => String(item.pessoaId) === String(body.pessoaId ?? ''));
      const id = existing?.id ?? createId();
      if (!existing) {
        state.rep.push({ id, pessoaId: body.pessoaId ?? '', status: 0 });
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id }) });
      return;
    }

    if (path === '/representante/update' && method === 'PUT') {
      const body = route.request().postDataJSON() as { id?: string; status?: number };
      const idx = state.rep.findIndex((item) => item.id === String(body.id ?? ''));
      if (idx >= 0) {
        state.rep[idx] = { ...state.rep[idx], status: Number(body.status ?? 0) };
      }
      await route.fulfill({ status: 204, body: '' });
      return;
    }

    if (/^\/representante\/remove\/[^/]+$/.test(path) && method === 'DELETE') {
      const id = path.split('/').pop() ?? '';
      const idx = state.rep.findIndex((item) => item.id === id);
      if (idx >= 0) {
        state.rep.splice(idx, 1);
      }
      await route.fulfill({ status: 204, body: '' });
      return;
    }

    if (path === '/representante/get/documentos' && method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      return;
    }

    if (path === '/representante/documento' && method === 'POST') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: createId() }) });
      return;
    }

    if (/^\/representante\/documento\/[^/]+$/.test(path) && method === 'DELETE') {
      await route.fulfill({ status: 204, body: '' });
      return;
    }

    await route.fallback();
  });

  await page.route('**/api/bancarizador/**', async (route) => {
    const method = route.request().method();
    const path = new URL(route.request().url()).pathname;

    if (path === '/bancarizador/get/list' && method === 'POST') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(createPaged(state.bac)) });
      return;
    }

    if (path === '/bancarizador/get/cnpjcpf/gestora' && method === 'GET') {
      const documento = new URL(route.request().url()).searchParams.get('cnpjcpf') ?? '';
      const normalized = documento.replace(/\D/g, '');
      const existing = state.bac.find((item) => String(item.cnpjCpf ?? '').replace(/\D/g, '') === normalized);
      if (existing) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            bancarizadorId: existing.id,
            pessoaId: null,
            nome: existing.nome,
            cnpjCpf: existing.cnpjCpf,
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          bancarizadorId: null,
          pessoaId: null,
          nome: `Pessoa ${normalized.slice(-6) || 'Auto'}`,
          cnpjCpf: normalized,
        }),
      });
      return;
    }

    if (/^\/bancarizador\/get\/unique\/[^/]+$/.test(path) && method === 'GET') {
      const id = path.split('/').pop() ?? '';
      const found = state.bac.find((item) => item.id === id);
      if (!found) {
        await route.fulfill({ status: 404, body: '{}' });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(found) });
      return;
    }

    if (path === '/bancarizador/register' && method === 'POST') {
      const body = route.request().postDataJSON() as RecordItem;
      const id = createId();
      state.bac.push({
        id,
        nome: body.nome ?? 'Bancarizador',
        cnpjCpf: body.cnpjCpf ?? '',
        observacao: body.observacao ?? null,
        status: 1,
      });
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id }) });
      return;
    }

    if (path === '/bancarizador/update' && method === 'PUT') {
      const body = route.request().postDataJSON() as RecordItem;
      const id = String(body.id ?? '');
      const idx = state.bac.findIndex((item) => item.id === id);
      if (idx >= 0) {
        state.bac[idx] = { ...state.bac[idx], observacao: body.observacao ?? state.bac[idx].observacao ?? null };
      }
      await route.fulfill({ status: 204, body: '' });
      return;
    }

    if (/^\/bancarizador\/remove$/.test(path) && method === 'DELETE') {
      const body = route.request().postDataJSON() as { ids?: string[] };
      const ids = new Set((body.ids ?? []).map((id) => String(id)));
      state.bac = state.bac.filter((item) => !ids.has(String(item.id)));
      await route.fulfill({ status: 204, body: '' });
      return;
    }

    if (/^\/bancarizador\/(activate|deactivate)\/[^/]+$/.test(path) && method === 'PUT') {
      const id = path.split('/').pop() ?? '';
      const idx = state.bac.findIndex((item) => item.id === id);
      if (idx >= 0) {
        state.bac[idx] = { ...state.bac[idx], status: path.includes('/activate/') ? 1 : 2 };
      }
      await route.fulfill({ status: 204, body: '' });
      return;
    }

    await route.fallback();
  });

  const registerPessoaEntityRoutes = (
    apiName: string,
    listMethod: 'GET' | 'POST',
    bucket: RecordItem[],
    supportsStatus = true,
    removeMethod: 'DELETE' | 'POST' = 'DELETE',
  ) => {
    void page.route(`**/api/${apiName}/**`, async (route) => {
      const url = new URL(route.request().url());
      const method = route.request().method();
      const path = url.pathname;

      if (path === `/${apiName}/get/list` && method === listMethod) {
        const rows = bucket.map((item) => {
          const person = people.get(String(item.pessoaId));
          return {
            id: item.id,
            status: item.status ?? 0,
            pessoa: person
              ? {
                  id: person.id,
                  nome: person.nome,
                  cnpjCpf: person.cnpjCpf,
                  cidade: person.cidade,
                  uf: person.uf,
                  contatos: person.contatos ?? [],
                }
              : null,
          };
        });

        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(createPaged(rows)) });
        return;
      }

      if (new RegExp(`^/${apiName}/get/unique/[^/]+$`).test(path) && method === 'GET') {
        const id = path.split('/').pop() ?? '';
        const found = bucket.find((item) => item.id === id);
        if (!found) {
          await route.fulfill({ status: 404, body: '{}' });
          return;
        }
        const person = people.get(String(found.pessoaId));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: found.id,
            status: found.status ?? 0,
            pessoa: person
              ? {
                  id: person.id,
                  nome: person.nome,
                  cnpjCpf: person.cnpjCpf,
                  cidade: person.cidade,
                  uf: person.uf,
                  contatos: person.contatos ?? [],
                }
              : null,
          }),
        });
        return;
      }

      if (path === `/${apiName}/register` && method === 'POST') {
        const contentType = (await route.request().headerValue('content-type')) ?? '';
        let pessoaId = '';

        if (contentType.includes('multipart/form-data')) {
          const body = route.request().postData() ?? '';
          const cnpjCpfMatch = body.match(/name="cnpjCpf"\r\n\r\n([^\r\n]+)/i);
          const person = ensurePersonByDocument(cnpjCpfMatch?.[1] ?? '');
          pessoaId = String(person.id);
        } else {
          const body = route.request().postDataJSON() as { pessoaId?: string };
          pessoaId = String(body.pessoaId ?? '');
        }

        const existing = bucket.find((item) => String(item.pessoaId) === pessoaId);
        const id = existing?.id ?? createId();
        if (!existing) {
          bucket.push({
            id,
            pessoaId,
            status: supportsStatus ? 0 : undefined,
          });
        }
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id }) });
        return;
      }

      if (path === `/${apiName}/update` && method === 'PUT') {
        const body = route.request().postDataJSON() as { id?: string; status?: number };
        const id = String(body.id ?? '');
        const idx = bucket.findIndex((item) => item.id === id);
        if (idx >= 0 && supportsStatus) {
          bucket[idx] = { ...bucket[idx], status: Number(body.status ?? 0) };
        }
        await route.fulfill({ status: 204, body: '' });
        return;
      }

      if (removeMethod === 'DELETE' && new RegExp(`^/${apiName}/remove/[^/]+$`).test(path) && method === 'DELETE') {
        const id = path.split('/').pop() ?? '';
        const idx = bucket.findIndex((item) => item.id === id);
        if (idx >= 0) {
          bucket.splice(idx, 1);
        }
        await route.fulfill({ status: 204, body: '' });
        return;
      }

      if (removeMethod === 'POST' && path === `/${apiName}/remove` && method === 'POST') {
        const body = route.request().postDataJSON() as { prestadorServicoId?: string; id?: string };
        const id = String(body.prestadorServicoId ?? body.id ?? '');
        const idx = bucket.findIndex((item) => item.id === id);
        if (idx >= 0) {
          bucket.splice(idx, 1);
        }
        await route.fulfill({ status: 204, body: '' });
        return;
      }

      await route.fallback();
    });
  };

  registerPessoaEntityRoutes('consultora', 'GET', state.con, true, 'DELETE');
  registerPessoaEntityRoutes('custodiante', 'GET', state.cus, true, 'DELETE');
  registerPessoaEntityRoutes('gestora', 'GET', state.ges, true, 'DELETE');
  registerPessoaEntityRoutes('fornecedor', 'GET', state.frn, true, 'DELETE');
  registerPessoaEntityRoutes('emitente', 'POST', state.emi, false, 'DELETE');
  registerPessoaEntityRoutes('investidor', 'GET', state.inv, false, 'DELETE');
  registerPessoaEntityRoutes('prestadorservico', 'GET', state.pre, false, 'POST');

  await page.route('**/api/cedente/**', async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    const path = url.pathname;

    if ((path === '/cedente/get/list' || path === '/api/cedente/get/list') && method === 'POST') {
      const rows = state.ced.map((item) => ({
        id: item.id,
        nome: item.nome,
        cnpjCpf: item.cnpjCpf,
      }));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(createPaged(rows)),
      });
      return;
    }

    if ((path === '/cedente/get/modalidades' || path === '/api/cedente/get/modalidades') && method === 'GET') {
      const cedenteId = url.searchParams.get('cedenteId') ?? '';
      const tabs = ensureCedenteTabs(cedenteId);
      const parametrizacao = Array.isArray(tabs.parametrizacao) ? tabs.parametrizacao : [];
      const rows = parametrizacao.map((item) => ({
        modalidade: String((item as Record<string, unknown>).modalidadeNome ?? 'DUPLICATA'),
        habilitado: true,
        tipoCalculoOperacao: 'PRAZO',
      }));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(rows),
      });
      return;
    }

    await route.fallback();
  });

  await page.route('**/cadastros/**', async (route) => {
    if (!['xhr', 'fetch'].includes(route.request().resourceType())) {
      await route.fallback();
      return;
    }

    const url = new URL(route.request().url());
    const method = route.request().method();
    const path = url.pathname;

    if (path === '/cadastros/administradoras/auto-cadastro' && method === 'POST') {
      const body = route.request().postDataJSON() as { documento?: string };
      const person = ensurePersonByDocument(body.documento ?? '');
      const existing = state.adm.find((item) => String(item.pessoaId) === String(person.id));
      if (existing) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: existing.id, pessoaId: person.id, status: 'existing', mensagem: 'Administradora já cadastrada.' }),
        });
        return;
      }

      const id = createId();
      state.adm.push({
        id,
        pessoaId: person.id,
        nome: person.nome,
        cnpjCpf: person.cnpjCpf,
        cidade: person.cidade,
        uf: person.uf,
        ativo: true,
      });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id, pessoaId: person.id, status: 'created', mensagem: 'Administradora criada.' }),
      });
      return;
    }

    if (path === '/cadastros/agentes/auto-cadastro' && method === 'POST') {
      const body = route.request().postDataJSON() as { documento?: string };
      const person = ensurePersonByDocument(body.documento ?? '');
      const existing = state.age.find((item) => String(item.pessoaId) === String(person.id));
      if (existing) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: existing.id, pessoaId: person.id, status: 'existing', mensagem: 'Agente já cadastrado.' }),
        });
        return;
      }

      const id = createId();
      state.age.push({
        id,
        pessoaId: person.id,
        nome: person.nome,
        documento: person.cnpjCpf,
        email: person.email ?? '',
        telefone: person.telefone ?? '',
        ativo: true,
      });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id, pessoaId: person.id, status: 'created', mensagem: 'Agente criado.' }),
      });
      return;
    }

    if (path === '/cadastros/cedentes/auto-cadastro' && method === 'POST') {
      const body = route.request().postDataJSON() as { documento?: string };
      const person = ensurePersonByDocument(body.documento ?? '');
      const existing = state.ced.find((item) => String(item.pessoaId) === String(person.id));
      if (existing) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ cedenteId: existing.id, pessoaId: person.id, status: 'existing', mensagem: 'Cedente já cadastrado.' }),
        });
        return;
      }

      const id = createId();
      state.ced.push({
        id,
        pessoaId: person.id,
        nome: person.nome,
        cnpjCpf: person.cnpjCpf,
        cidade: person.cidade ?? '',
        uf: person.uf ?? '',
        ativo: true,
        status: 'ABERTO',
      });
      ensureCedenteTabs(id);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ cedenteId: id, pessoaId: person.id, status: 'created', mensagem: 'Cedente criado.' }),
      });
      return;
    }

    if (path === '/cadastros/cedentes/ativos' && method === 'GET') {
      const ativos = state.ced
        .filter((item) => item.ativo !== false)
        .map((item) => ({
          id: item.id,
          nome: item.nome,
          cnpjCpf: item.cnpjCpf,
        }));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ativos) });
      return;
    }

    if (path === '/cadastros/pessoas' && method === 'GET') {
      const document = (url.searchParams.get('documento') ?? '').replace(/\D/g, '');
      const person = Array.from(people.values()).find((item) => (item.cnpjCpf as string).replace(/\D/g, '') === document);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(person ?? null) });
      return;
    }

    if (path === '/cadastros/pessoas' && method === 'POST') {
      const body = route.request().postDataJSON() as RecordItem;
      const id = createId();
      const created = {
        id,
        ...body,
        documentoNormalizado: String(body.cnpjCpf ?? '').replace(/\D/g, ''),
        tipoPessoa: String(body.cnpjCpf ?? '').replace(/\D/g, '').length > 11 ? 'Juridica' : 'Fisica',
        ativo: true,
        enderecos: body.enderecos ?? [],
        contatos: body.contatos ?? [],
        qsas: body.qsas ?? [],
      };

      people.set(id, created);
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id }) });
      return;
    }

    if (path.startsWith('/cadastros/pessoas/') && method === 'PUT') {
      const id = path.split('/').pop() ?? '';
      const body = route.request().postDataJSON() as RecordItem;
      const current = people.get(id);
      if (current) {
        people.set(id, { ...current, ...body });
      }
      await route.fulfill({ status: 204, body: '' });
      return;
    }

    if (path.startsWith('/cadastros/pessoas/') && method === 'GET') {
      const id = path.split('/').pop() ?? '';
      const current = people.get(id);
      if (!current) {
        await route.fulfill({ status: 404, body: '{}' });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(current) });
      return;
    }

    if (path.startsWith('/cadastros/cedentes')) {
      const segments = path.split('/').filter(Boolean);
      const cedenteId = segments[2] ?? '';

      if (segments.length === 2) {
        if (method === 'GET') {
          await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(createPaged(state.ced)) });
          return;
        }

        if (method === 'POST') {
          const body = route.request().postDataJSON() as RecordItem;
          const pessoa = people.get(String(body.pessoaId));
          const id = createId();
          state.ced.push({
            id,
            pessoaId: body.pessoaId,
            nome: pessoa?.nome ?? 'Cedente',
            cnpjCpf: pessoa?.cnpjCpf ?? '',
            cidade: pessoa?.cidade ?? '',
            uf: pessoa?.uf ?? '',
            ativo: true,
            status: 'Aberto',
          });
          ensureCedenteTabs(id);

          await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id }) });
          return;
        }
      }

      if (segments.length === 3) {
        const idx = state.ced.findIndex((item) => item.id === cedenteId);
        if (method === 'GET') {
          const row = state.ced.find((item) => item.id === cedenteId);
          if (!row) {
            await route.fulfill({ status: 404, body: '{}' });
            return;
          }
          await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(row) });
          return;
        }

        if (method === 'PUT') {
          const body = route.request().postDataJSON() as RecordItem;
          if (idx >= 0) {
            const current = state.ced[idx];
            const pessoa = body.pessoaId ? people.get(String(body.pessoaId)) : people.get(String(current.pessoaId));
            state.ced[idx] = {
              ...current,
              ...body,
              nome: pessoa?.nome ?? current.nome,
              cnpjCpf: pessoa?.cnpjCpf ?? current.cnpjCpf,
              cidade: pessoa?.cidade ?? current.cidade,
              uf: pessoa?.uf ?? current.uf,
            };
          }
          await route.fulfill({ status: 204, body: '' });
          return;
        }

        if (method === 'DELETE') {
          if (idx >= 0) {
            state.ced.splice(idx, 1);
          }
          cedenteTabs.delete(cedenteId);
          await route.fulfill({ status: 204, body: '' });
          return;
        }
      }

      if (cedenteId) {
        const tabStore = ensureCedenteTabs(cedenteId);
        const tab = segments[3] ?? '';
        const rowId = segments[4] ?? '';
        const isDownload = segments[5] === 'download' && method === 'GET';

        if (isDownload) {
          await route.fulfill({
            status: 200,
            headers: {
              'content-type': 'application/octet-stream',
              'content-disposition': `attachment; filename="arquivo-${rowId || 'mock'}.txt"`,
            },
            body: 'mock-file',
          });
          return;
        }

        if (tab === 'historico' && method === 'GET') {
          await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(createPaged([])) });
          return;
        }

        if (tab === 'complemento') {
          if (method === 'GET') {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify(tabStore.complemento ?? { cedenteId }),
            });
            return;
          }

          if (method === 'PUT') {
            const body = route.request().postDataJSON() as RecordItem;
            tabStore.complemento = { ...(tabStore.complemento as RecordItem), ...body, cedenteId };
            await route.fulfill({ status: 204, body: '' });
            return;
          }
        }

        const tabRows = (tabStore[tab] as RecordItem[] | undefined) ?? [];

        if (method === 'GET') {
          await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(tabRows) });
          return;
        }

        if (method === 'POST') {
          const body = route.request().postDataJSON() as RecordItem;
          const id = createId();
          tabRows.push({ id, cedenteId, ...body });
          tabStore[tab] = tabRows;
          await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id }) });
          return;
        }

        if (method === 'PUT') {
          const body = route.request().postDataJSON() as RecordItem;
          const idx = tabRows.findIndex((item) => item.id === rowId);
          if (idx >= 0) {
            tabRows[idx] = { ...tabRows[idx], ...body };
          }
          tabStore[tab] = tabRows;
          await route.fulfill({ status: 204, body: '' });
          return;
        }

        if (method === 'DELETE') {
          const idx = tabRows.findIndex((item) => item.id === rowId);
          if (idx >= 0) {
            tabRows.splice(idx, 1);
          }
          tabStore[tab] = tabRows;
          await route.fulfill({ status: 204, body: '' });
          return;
        }
      }
    }

    const pick = () => {
      if (path.startsWith('/cadastros/administradoras')) return state.adm;
      if (path.startsWith('/cadastros/agentes')) return state.age;
      if (path.startsWith('/cadastros/testemunhas')) return state.tes;
      if (path.startsWith('/cadastros/bancarizadores')) return state.bac;
      if (path.startsWith('/cadastros/cedentes')) return state.ced;
      if (path.startsWith('/cadastros/representantes')) return state.rep;
      return state.ban;
    };

    const list = pick();

    if (path.includes('/complemento') && method === 'GET') {
      const adminId = path.split('/')[3] ?? '';
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ administradoraId: adminId, nomeApresentacao: '' }) });
      return;
    }

    if ((path.includes('/status') || path.includes('/tipos-recebiveis') || path.includes('/anexos') || path.includes('/observacoes')) && method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      return;
    }

    if (path.includes('/historico') && method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(createPaged([])) });
      return;
    }

    if ((path.includes('/representantes') || path.includes('/status') || path.includes('/tipos-recebiveis') || path.includes('/anexos') || path.includes('/observacoes') || path.includes('/complemento')) && ['POST', 'PUT', 'DELETE'].includes(method)) {
      await route.fulfill({ status: method === 'POST' ? 200 : 204, contentType: 'application/json', body: method === 'POST' ? JSON.stringify({ id: createId() }) : '' });
      return;
    }

    if (method === 'GET' && path.split('/').length > 3) {
      const id = path.split('/')[3] ?? '';
      const item = list.find((x) => x.id === id);
      if (!item) {
        await route.fulfill({ status: 404, body: '{}' });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(item) });
      return;
    }

    if (method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(createPaged(list)) });
      return;
    }

    if (method === 'POST') {
      const body = route.request().postDataJSON() as RecordItem;
      const id = createId();

      if (path.startsWith('/cadastros/administradoras')) {
        const pessoa = people.get(String(body.pessoaId));
        list.push({
          id,
          pessoaId: body.pessoaId,
          nome: pessoa?.nome ?? 'Administradora',
          cnpjCpf: pessoa?.cnpjCpf ?? '',
          cidade: pessoa?.cidade ?? '',
          uf: pessoa?.uf ?? '',
          ativo: true,
        });
      } else if (path.startsWith('/cadastros/representantes')) {
        const pessoa = people.get(String(body.pessoaId));
        list.push({
          id,
          pessoaId: body.pessoaId,
          nome: pessoa?.nome ?? 'Representante',
          cnpjCpf: pessoa?.cnpjCpf ?? '',
          email: pessoa?.email ?? '',
          telefone: pessoa?.telefone ?? '',
          ativo: true,
        });
      } else {
        list.push({ id, ...body });
      }

      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id }) });
      return;
    }

    if (method === 'PUT') {
      const body = route.request().postDataJSON() as RecordItem;
      const id = path.split('/')[3] ?? '';
      const idx = list.findIndex((x) => x.id === id);
      if (idx >= 0) {
        const current = list[idx];
        if ((path.startsWith('/cadastros/administradoras') || path.startsWith('/cadastros/representantes')) && body.pessoaId) {
          const pessoa = people.get(String(body.pessoaId));
          list[idx] = {
            ...current,
            ...body,
            nome: pessoa?.nome ?? current.nome,
            cnpjCpf: pessoa?.cnpjCpf ?? current.cnpjCpf,
            email: pessoa?.email ?? current.email,
            telefone: pessoa?.telefone ?? current.telefone,
            cidade: pessoa?.cidade ?? current.cidade,
            uf: pessoa?.uf ?? current.uf,
          };
        } else {
          list[idx] = { ...current, ...body };
        }
      }
      await route.fulfill({ status: 204, body: '' });
      return;
    }

    if (method === 'DELETE') {
      const id = path.split('/')[3] ?? '';
      const idx = list.findIndex((x) => x.id === id);
      if (idx >= 0) {
        list.splice(idx, 1);
      }
      await route.fulfill({ status: 204, body: '' });
      return;
    }

    await route.fallback();
  });

  await page.route('**/operacoes/**', async (route) => {
    if (!['xhr', 'fetch'].includes(route.request().resourceType())) {
      await route.fallback();
      return;
    }

    const url = new URL(route.request().url());
    const method = route.request().method();
    const path = url.pathname;

    if (path === '/operacoes' && method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(createPaged(state.operacoes)) });
      return;
    }

    if (path === '/operacoes' && method === 'POST') {
      const body = route.request().postDataJSON() as RecordItem;
      const id = createId();
      state.operacoes.push({ id, ...body });
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id }) });
      return;
    }

    if (path.startsWith('/operacoes/') && method === 'PUT') {
      const id = path.split('/')[2] ?? '';
      const body = route.request().postDataJSON() as RecordItem;
      const index = state.operacoes.findIndex((item) => item.id === id);
      if (index >= 0) {
        state.operacoes[index] = { ...state.operacoes[index], ...body };
      }
      await route.fulfill({ status: 204, body: '' });
      return;
    }

    if (path.startsWith('/operacoes/') && method === 'DELETE') {
      const id = path.split('/')[2] ?? '';
      const index = state.operacoes.findIndex((item) => item.id === id);
      if (index >= 0) {
        state.operacoes.splice(index, 1);
      }
      await route.fulfill({ status: 204, body: '' });
      return;
    }

    if (path === '/operacoes/importacoes' && method === 'GET') {
      const pageParam = Number(url.searchParams.get('page') ?? '1');
      const pageSizeParam = Number(url.searchParams.get('pageSize') ?? '10');
      const pageNumber = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
      const pageSizeNumber = Number.isFinite(pageSizeParam) && pageSizeParam > 0 ? pageSizeParam : 10;
      const start = (pageNumber - 1) * pageSizeNumber;
      const end = start + pageSizeNumber;
      const pageItems = state.importacoes
        .slice(start, end)
        .map((item) => Object.fromEntries(Object.entries(item).filter(([key]) => key !== 'eventos')));
      const response = {
        items: pageItems,
        page: pageNumber,
        pageSize: pageSizeNumber,
        totalItems: state.importacoes.length,
        totalPages: Math.max(1, Math.ceil(state.importacoes.length / pageSizeNumber)),
      };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(response) });
      return;
    }

    if (path === '/operacoes/importacoes' && method === 'POST') {
      const body = route.request().postData() ?? '';
      const fileNameMatch = body.match(/filename="([^"]+)"/);
      const modalidadeMatch = body.match(/name="modalidade"\r\n\r\n([^\r\n]+)/);
      const cedenteIdMatch = body.match(/name="cedenteId"\r\n\r\n([^\r\n]+)/);
      const tipoArquivoMatch = body.match(/name="tipoArquivo"\r\n\r\n([^\r\n]+)/);
      const tipoBancoMatch = body.match(/name="tipoBanco"\r\n\r\n([^\r\n]+)/);
      const tipoCnabMatch = body.match(/name="tipoCnab"\r\n\r\n([^\r\n]+)/);

      const id = createId();
      const now = new Date().toISOString();
      const created = {
        id,
        fidcId: '00000000-0000-0000-0000-000000000001',
        origem: tipoArquivoMatch?.[1] ?? 'CNAB',
        tipoArquivo: tipoArquivoMatch?.[1] ?? 'CNAB',
        tipoBanco: tipoBancoMatch?.[1] ?? null,
        tipoCnab: tipoCnabMatch?.[1] ?? null,
        modalidade: modalidadeMatch?.[1] ?? null,
        cedenteId: cedenteIdMatch?.[1] ?? seededCedenteId,
        fileName: fileNameMatch?.[1] ?? 'arquivo.rem',
        fileHash: 'mockhash',
        status: 'PROCESSANDO',
        errorSummary: null,
        ultimoCodigoFalha: null,
        tentativas: 0,
        ultimaTentativaEm: now,
        correlationId: createId(),
        ultimoMessageId: createId(),
        createdAt: now,
        completedAt: null,
        userEmail: 'admin@black101.local',
        eventos: [{ id: createId(), status: 'PROCESSANDO', message: 'Arquivo recebido e enfileirado.', createdAt: now }],
      };

      state.importacoes.unshift(created);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ importacaoId: id }) });
      return;
    }

    if (/^\/operacoes\/importacoes\/[^/]+$/.test(path) && method === 'GET') {
      const id = path.split('/')[3] ?? '';
      const found = state.importacoes.find((item) => item.id === id);
      if (!found) {
        await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ detail: 'Importação não encontrada.' }) });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(found) });
      return;
    }

    if (/^\/operacoes\/importacoes\/[^/]+\/reprocessar$/.test(path) && method === 'POST') {
      const id = path.split('/')[3] ?? '';
      const found = state.importacoes.find((item) => item.id === id);
      if (!found) {
        await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ detail: 'Importação não encontrada.' }) });
        return;
      }

      const now = new Date().toISOString();
      found.status = 'PROCESSANDO';
      found.errorSummary = null;
      found.ultimoCodigoFalha = null;
      found.tentativas = Number(found.tentativas ?? 0) + 1;
      found.ultimaTentativaEm = now;
      found.completedAt = null;
      found.eventos.push({
        id: createId(),
        status: 'REPROCESSAR',
        message: 'Reprocessamento solicitado manualmente.',
        createdAt: now,
      });

      await route.fulfill({ status: 204, body: '' });
      return;
    }

    await route.fallback();
  });
};

const login = async (
  page: import('@playwright/test').Page,
  password = 'Master@5859',
  expectSuccess = true,
) => {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill('admin@black101.local');
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: 'Login' }).click();

  if (expectSuccess) {
    await expect(page).toHaveURL(/\/$/);
    return;
  }

  await expect(page).toHaveURL(/\/login/);
};

const assertNoPageHorizontalOverflow = async (page: import('@playwright/test').Page) => {
  const hasOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth - window.innerWidth > 1;
  });
  expect(hasOverflow).toBeFalsy();
};

test.beforeEach(async ({ page }) => {
  await setupApiMock(page);
});

test('login com sucesso', async ({ page }) => {
  await login(page);
  await expect(page.getByText('Portal Black101')).toBeVisible();
});

test('login com falha', async ({ page }) => {
  await login(page, 'SenhaErrada@123', false);
  await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
});

test('login legado com 2fa', async ({ page }) => {
  await page.route('**/auth/login', async (route) => {
    await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ detail: 'not found' }) });
  });
  await page.route('**/auth/me', async (route) => {
    await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ detail: 'not found' }) });
  });
  await page.route('**/api/authentication/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        model: { requiresTwoFactorCode: true, requiresTwoFactorSetup: false, qrCode: '' },
        code: 200,
      }),
    });
  });
  await page.route('**/api/authentication/validateQrcode', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ model: { token: 'legacy-pre-token' }, code: 200 }),
    });
  });
  await page.route('**/api/user/get/context', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        model: {
          id: '1',
          nome: 'Administrador Black101',
          email: 'admin@black101.local',
          fidcs: [{ id: '00000000-0000-0000-0000-000000000001', nome: 'FIDC Seed', cnpjCpf: '12345678000199' }],
          roles: ['ADMIN'],
          claims: ['CAD_ADM_L'],
        },
        code: 200,
      }),
    });
  });

  await page.goto('/login');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByText('Código 2FA')).toBeVisible();
  await page.locator('input[type="text"]').first().fill('123456');
  await page.getByRole('button', { name: 'Validar código' }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('navegação do mega menu', async ({ page }, testInfo) => {
  await login(page);
  await expect(page.getByText('Portal Black101')).toBeVisible();

  const isMobile = testInfo.project.name.includes('mobile');
  const mobileToggle = page.getByRole('button', { name: 'Menu' });
  if (isMobile && await mobileToggle.isVisible()) {
    await mobileToggle.click();
  }

  const cadastrosButton = page.getByRole('button', { name: 'Cadastros' }).first();
  await cadastrosButton.click({ force: true });

  const adminLink = page.locator('a[href="/cadastro/administradoras"]').first();
  if (await adminLink.isVisible()) {
    await adminLink.click({ force: true });
  } else {
    await page.goto('/cadastro/administradoras');
  }
  await expect(page).toHaveURL(/\/cadastro\/administradoras/);
});

test('layout sem overflow horizontal global', async ({ page }) => {
  await login(page);

  await assertNoPageHorizontalOverflow(page);
  await page.goto('/cadastro/administradoras');
  await assertNoPageHorizontalOverflow(page);
  await page.goto('/operacoes/importacoes');
  await assertNoPageHorizontalOverflow(page);
  await page.goto('/operacoes/workers');
  await assertNoPageHorizontalOverflow(page);
});

test('datatable usa cards no mobile para listas simples', async ({ page }, testInfo) => {
  await login(page);
  await page.goto('/cadastro/bancos');

  const cardsContainer = page.locator('.table-wrap--mobile-cards .table-mobile-cards').first();

  if (testInfo.project.name.includes('mobile')) {
    await expect(page.locator('.table-wrap--mobile-cards').first()).toBeVisible();
    const cardsDisplay = await cardsContainer.evaluate((element) => window.getComputedStyle(element).display);
    expect(cardsDisplay).toBe('block');
  } else {
    const cardsDisplay = await cardsContainer.evaluate((element) => window.getComputedStyle(element).display);
    expect(cardsDisplay).toBe('none');
  }
});

const runCrudAgentesFull = async (page: import('@playwright/test').Page, suffix: string) => {
  const nome = `Agente ${suffix}`;
  await page.goto('/cadastro/agentes');
  await page.getByRole('button', { name: 'Novo agente' }).click();

  await page.locator('.modal-card label:has-text("CPF/CNPJ") input').first().fill('529.982.247-25');
  await page.getByRole('button', { name: 'Avançar' }).click();
  await expect(page).toHaveURL(/\/cadastro\/agentes\//);

  await page.locator('label:has-text("Nome") input').first().fill(nome);
  await page.locator('label:has-text("E-mail") input').first().fill(`agente${suffix}@mail.com`);
  await page.locator('label:has-text("Telefone") input').first().fill('(11) 99999-0000');

  await page.getByRole('button', { name: 'Salvar' }).click();

  await page.locator('label:has-text("Nome") input').first().fill(`Agente Edit ${suffix}`);
  await page.getByRole('button', { name: 'Salvar' }).click();
  await page.getByRole('button', { name: 'Voltar para listagem' }).click();
  await expect(page).toHaveURL(/\/cadastro\/agentes$/);

  const hasRows = await page.locator('.table-wrap tbody tr').count();
  if (hasRows > 0) {
    page.on('dialog', async (dialog) => dialog.accept());
    const deleteButtons = page.getByRole('button', { name: 'Excluir' });
    const deleteCount = await deleteButtons.count();
    if (deleteCount > 0) {
      await deleteButtons.first().click();
    }
  }
};

const runCrudBasicoPessoaFull = async (
  page: import('@playwright/test').Page,
  suffix: string,
  options: {
    listUrl: string;
    createButton: string;
    editedNamePrefix: string;
  },
) => {
  await page.goto(options.listUrl);
  await page.getByRole('button', { name: options.createButton }).click();

  await page.locator('.modal-card label:has-text("CPF/CNPJ") input').first().fill('04.252.011/0001-10');
  await page.getByRole('button', { name: 'Avançar' }).click();
  await expect(page).toHaveURL(new RegExp(`${options.listUrl}/`));

  await page.locator('label:has-text("Nome") input').first().fill(`${options.editedNamePrefix} ${suffix}`);
  await page.locator('label:has-text("E-mail") input').first().fill(`basico${suffix}@mail.com`);
  await page.locator('label:has-text("Telefone") input').first().fill('(11) 98888-0000');
  await page.locator('label:has-text("Cidade") input').first().fill('Sao Paulo');
  await page.locator('label:has-text("UF") input').first().fill('SP');
  await page.getByRole('button', { name: 'Salvar' }).click();

  await page.getByRole('button', { name: 'Voltar para listagem' }).click();
  await expect(page).toHaveURL(new RegExp(`${options.listUrl}$`));

  const deleteButtons = page.getByRole('button', { name: 'Excluir' });
  if (await deleteButtons.count()) {
    page.on('dialog', async (dialog) => dialog.accept());
    await deleteButtons.first().click();
  }
};

const runCrudBancosFull = async (page: import('@playwright/test').Page, suffix: string) => {
  const nome = `Banco ${suffix}`;
  await page.goto('/cadastro/bancos');
  await page.getByRole('button', { name: 'Novo banco' }).click();

  await page.locator('label:has-text("Nome") input').first().fill(nome);
  await page.locator('label:has-text("Código") input').first().fill(suffix);
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page).toHaveURL(/\/cadastro\/bancos\//);

  await page.locator('label:has-text("Nome") input').first().fill(`Banco Edit ${suffix}`);
  await page.getByRole('button', { name: 'Salvar' }).click();
  await page.getByRole('button', { name: 'Voltar para listagem' }).click();
  await expect(page).toHaveURL(/\/cadastro\/bancos$/);

  const deleteButtons = page.getByRole('button', { name: 'Excluir' });
  if (await deleteButtons.count()) {
    page.on('dialog', async (dialog) => dialog.accept());
    await deleteButtons.first().click();
  }
};

const runCrudCedentesFull = async (page: import('@playwright/test').Page, suffix: string) => {
  const nome = `Cedente ${suffix}`;
  await page.goto('/cadastro/cedentes');
  await page.getByRole('button', { name: 'Novo cedente' }).click();

  await page.locator('.modal-card label:has-text("CPF/CNPJ") input').first().fill('04.252.011/0001-10');
  await page.getByRole('button', { name: 'Avançar' }).click();
  await expect(page).toHaveURL(/\/cadastro\/cedentes\//);

  await page.locator('label:has-text("Nome") input').first().fill(nome);
  await page.locator('label:has-text("E-mail") input').first().fill(`cedente${suffix}@mail.com`);
  await page.locator('label:has-text("Telefone") input').first().fill('(11) 98888-0000');
  await page.locator('label:has-text("Cidade") input').first().fill('Sao Paulo');
  await page.locator('label:has-text("UF") input').first().fill('SP');

  await page.getByRole('button', { name: 'Salvar' }).click();

  await page.getByRole('button', { name: 'Voltar para listagem' }).click();
  await expect(page).toHaveURL(/\/cadastro\/cedentes$/);

  const hasRows = await page.locator('.table-wrap tbody tr').count();
  if (hasRows > 0) {
    page.on('dialog', async (dialog) => dialog.accept());
    await page.locator('.table-wrap tbody tr').first().locator('button:has-text("Excluir")').click();
  }
};

const runCrudAdministradorasFull = async (page: import('@playwright/test').Page, suffix: string) => {
  const nome = `Administradora ${suffix}`;
  await page.goto('/cadastro/administradoras');
  await page.getByRole('button', { name: 'Nova administradora' }).click();

  await page.locator('.modal-card label:has-text("CPF/CNPJ") input').first().fill('39.665.333/0001-75');
  await page.getByRole('button', { name: 'Avançar' }).click();
  await expect(page).toHaveURL(/\/cadastro\/administradoras\//);

  await page.locator('label:has-text("Nome") input').first().fill(nome);
  await page.locator('label:has-text("Cidade") input').first().fill('Sao Paulo');
  await page.locator('label:has-text("UF") input').first().fill('SP');

  await page.getByRole('button', { name: 'Salvar' }).click();

  await page.locator('label:has-text("Cidade") input').first().fill('Campinas');
  await page.getByRole('button', { name: 'Salvar' }).click();

  await page.getByRole('button', { name: 'Voltar para listagem' }).click();
  await expect(page).toHaveURL(/\/cadastro\/administradoras$/);

  const hasRows = await page.locator('.table-wrap tbody tr').count();
  if (hasRows > 0) {
    page.on('dialog', async (dialog) => dialog.accept());
    await page.locator('.table-wrap tbody tr').first().locator('button:has-text("Excluir")').click();
  }
};

test('crud administradoras', async ({ page }) => {
  await login(page);
  const suffix = Date.now().toString().slice(-6);
  await runCrudAdministradorasFull(page, suffix);
});

test('crud agentes', async ({ page }) => {
  await login(page);
  const suffix = Date.now().toString().slice(-6);
  await runCrudAgentesFull(page, suffix);
});

test('crud consultoras', async ({ page }) => {
  await login(page);
  const suffix = Date.now().toString().slice(-6);
  await runCrudBasicoPessoaFull(page, suffix, {
    listUrl: '/cadastro/consultoras',
    createButton: 'Nova consultora',
    editedNamePrefix: 'Consultora',
  });
});

test('crud investidores', async ({ page }) => {
  await login(page);
  const suffix = Date.now().toString().slice(-6);
  await runCrudBasicoPessoaFull(page, suffix, {
    listUrl: '/cadastro/investidores',
    createButton: 'Novo investidor',
    editedNamePrefix: 'Investidor',
  });
});

test('modalidades por cedente', async ({ page }, testInfo) => {
  await login(page);
  await page.goto('/cadastro/modalidades');
  await expect(page.locator('.toolbar select')).toBeVisible();
  if (testInfo.project.name.includes('mobile')) {
    await expect(page.locator('.table-mobile-cards').getByText('DUPLICATA').first()).toBeVisible();
  } else {
    await expect(page.getByRole('cell', { name: 'DUPLICATA' }).first()).toBeVisible();
  }
});

test('crud prestadores', async ({ page }) => {
  await login(page);
  const suffix = Date.now().toString().slice(-6);
  await runCrudBasicoPessoaFull(page, suffix, {
    listUrl: '/cadastro/prestadores',
    createButton: 'Novo prestador',
    editedNamePrefix: 'Prestador',
  });
});

test('crud bancos', async ({ page }) => {
  await login(page);
  const suffix = Date.now().toString().slice(-4);
  await runCrudBancosFull(page, suffix);
});

test('crud cedentes', async ({ page }) => {
  await login(page);
  const suffix = Date.now().toString().slice(-5);
  await runCrudCedentesFull(page, suffix);
});

test('importacoes: envia arquivo e abre detalhes', async ({ page }) => {
  await login(page);
  await page.goto('/operacoes/importacoes');

  const cedenteField = page.locator('.upload-card .form-grid label').filter({ hasText: 'Cedente*' }).first();
  const modalidadeField = page.locator('.upload-card .form-grid label').filter({ hasText: 'Modalidade' }).first();
  const [cedenteBox, modalidadeBox] = await Promise.all([cedenteField.boundingBox(), modalidadeField.boundingBox()]);
  expect(cedenteBox).not.toBeNull();
  expect(modalidadeBox).not.toBeNull();
  expect((cedenteBox as { y: number }).y).toBeLessThan((modalidadeBox as { y: number }).y);

  await page.locator('select').first().selectOption({ index: 1 });
  await expect(page.locator('.upload-card .form-grid label:has-text("Modalidade") option')).toHaveCount(3);
  await expect(page.locator('.upload-card .form-grid label:has-text("Modalidade") option').nth(1)).toHaveText('DUPLICATA');
  await expect(page.locator('.upload-card .form-grid label:has-text("Modalidade") option').nth(2)).toHaveText('CCB');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'lote-teste.rem',
    mimeType: 'text/plain',
    buffer: Buffer.from('OP001;Operacao teste;1200.50;2026-02-18'),
  });

  await page.getByRole('button', { name: 'Enviar para processamento' }).click();
  await expect(page.getByText('Detalhes da importação')).toBeVisible();
  await expect(page.locator('.drawer-card .pill').first()).toHaveText('PROCESSANDO');
});

test('importacoes: reprocessa item com falha', async ({ page }) => {
  await login(page);
  await page.goto('/operacoes/importacoes');

  await page.getByRole('button', { name: 'Detalhes' }).first().evaluate((element) => {
    (element as HTMLButtonElement).click();
  });
  await page.locator('.drawer-card').getByRole('button', { name: 'Reprocessar' }).click();

  await expect(page.getByText('Detalhes da importação')).toBeVisible();
  await expect(page.locator('.drawer-card .pill').first()).toHaveText('PROCESSANDO');
});
