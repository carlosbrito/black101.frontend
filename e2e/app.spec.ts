import { expect, test } from '@playwright/test';

type RecordItem = { id: string; [key: string]: any };

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
    ban: [] as RecordItem[],
    ced: [] as RecordItem[],
    rep: [{
      id: createId(),
      pessoaId: seededPersonId,
      nome: 'Representante Seed',
      cnpjCpf: '12345678901',
      email: 'rep@seed.local',
      telefone: '11999999999',
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

  await page.route('**/auth/csrf', async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        'content-type': 'application/json',
        'set-cookie': 'XSRF-TOKEN=mocked-token; Path=/; SameSite=Lax',
      },
      body: JSON.stringify({ token: 'mocked-token' }),
    });
  });

  await page.route('**/auth/login', async (route) => {
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
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'ok' }) });
  });

  await page.route('**/auth/me', async (route) => {
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
  });

  await page.route('**/auth/logout', async (route) => {
    state.loggedIn = false;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'ok' }) });
  });

  await page.route('**/cadastros/**', async (route) => {
    if (!['xhr', 'fetch'].includes(route.request().resourceType())) {
      await route.fallback();
      return;
    }

    const url = new URL(route.request().url());
    const method = route.request().method();
    const path = url.pathname;

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
    await page.locator('.table-wrap tbody tr').first().locator('button:has-text("Excluir")').click();
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

  const hasRows = await page.locator('.table-wrap tbody tr').count();
  if (hasRows > 0) {
    page.on('dialog', async (dialog) => dialog.accept());
    await page.locator('.table-wrap tbody tr').first().locator('button:has-text("Excluir")').click();
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
