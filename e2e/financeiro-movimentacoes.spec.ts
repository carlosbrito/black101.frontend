import { expect, test, type Page, type Route } from '@playwright/test';

type MovimentacaoApiItem = {
  id: string;
  tipoMovimento: number;
  pagamentoEfetuado: boolean;
  valorDespesa?: number;
  valorRecebimento?: number;
  valorPago?: number;
  descricao: string;
  fornecededor?: string;
  conta?: {
    id: string;
    descricao: string;
    banco?: { codigo?: number | null };
    agencia?: string | null;
    numeroConta?: string | null;
  };
  contaDestino?: {
    id: string;
    descricao: string;
    banco?: { codigo?: number | null };
    agencia?: string | null;
    numeroConta?: string | null;
  };
  planoDeConta?: { id: string; descricao: string } | null;
  cedente?: { id: string; pessoa?: { nome?: string } } | null;
  dataMovimento: string;
  dataPagamento?: string | null;
  dataVencimento?: string | null;
  numeroReferencia?: string | null;
  dateCreated: string;
};

type HistoricoItem = {
  id: string;
  acao: string;
  dateCreated: string;
  userEmail: string;
};

type ImportPreviewItem = {
  id: string;
  data: string;
  historico: string;
  docto: string;
  credito: number;
  debito: number;
  planoContaId: string;
  transferenciaContaId: string;
  baixa: boolean;
};

const createId = () => `${Date.now()}-${Math.floor(Math.random() * 100000)}`;

const extractMultipartValue = (body: string, fieldName: string) => {
  const directMatch = body.match(new RegExp(`name="${fieldName}"\\r\\n\\r\\n([^\\r\\n]*)`));
  if (directMatch?.[1] != null) {
    return directMatch[1];
  }

  const normalizedMatch = body.match(new RegExp(`name="${fieldName}"[\\s\\S]*?\\r\\n\\r\\n([^\\r\\n]*)`));
  return normalizedMatch?.[1] ?? '';
};

const setupFinanceiroApiMock = async (page: Page) => {
  const contaPrincipal = { id: 'conta-1', descricao: 'Conta Principal', banco: { codigo: 341 }, agencia: '1234', numeroConta: '00001-9' };
  const contaCaixa = { id: 'conta-2', descricao: 'Conta Caixa', banco: { codigo: 1 }, agencia: '0001', numeroConta: '22222-2' };
  const planoOperacional = { id: 'plano-1', descricao: 'Operacional' };
  const planoRecebiveis = { id: 'plano-2', descricao: 'Recebiveis' };
  const cedente = { id: 'ced-1', pessoa: { nome: 'Cedente XPTO' } };

  const state = {
    loggedIn: false,
    movimentos: [
      {
        id: 'mov-deb-1',
        tipoMovimento: 0,
        pagamentoEfetuado: false,
        valorDespesa: 1500,
        valorPago: 0,
        descricao: 'Pagamento fornecedor Alpha',
        fornecededor: 'Fornecedor Alpha',
        conta: contaPrincipal,
        planoDeConta: planoOperacional,
        cedente,
        dataMovimento: '2026-03-18T10:00:00Z',
        dataPagamento: null,
        dataVencimento: '2026-03-20T00:00:00Z',
        numeroReferencia: 'REF-001',
        dateCreated: '2026-03-18T10:00:00Z',
      },
      {
        id: 'mov-deb-2',
        tipoMovimento: 0,
        pagamentoEfetuado: false,
        valorDespesa: 820,
        valorPago: 0,
        descricao: 'Pagamento fornecedor Beta',
        fornecededor: 'Fornecedor Beta',
        conta: contaPrincipal,
        planoDeConta: planoOperacional,
        cedente,
        dataMovimento: '2026-03-18T11:00:00Z',
        dataPagamento: null,
        dataVencimento: '2026-03-22T00:00:00Z',
        numeroReferencia: 'REF-002',
        dateCreated: '2026-03-18T11:00:00Z',
      },
      {
        id: 'mov-cred-1',
        tipoMovimento: 1,
        pagamentoEfetuado: true,
        valorRecebimento: 5000,
        valorPago: 5000,
        descricao: 'Recebimento cliente Seed',
        fornecededor: 'Cliente Seed',
        conta: contaPrincipal,
        planoDeConta: planoRecebiveis,
        cedente,
        dataMovimento: '2026-03-18T12:00:00Z',
        dataPagamento: '2026-03-18T12:30:00Z',
        dataVencimento: '2026-03-18T12:00:00Z',
        numeroReferencia: 'REF-003',
        dateCreated: '2026-03-18T12:00:00Z',
      },
    ] satisfies MovimentacaoApiItem[],
    historicos: new Map<string, HistoricoItem[]>([
      ['mov-deb-1', [{ id: createId(), acao: 'Criação', dateCreated: '2026-03-18T10:00:00Z', userEmail: 'admin@black101.local' }]],
      ['mov-deb-2', [{ id: createId(), acao: 'Criação', dateCreated: '2026-03-18T11:00:00Z', userEmail: 'admin@black101.local' }]],
      ['mov-cred-1', [{ id: createId(), acao: 'Liquidação', dateCreated: '2026-03-18T12:30:00Z', userEmail: 'admin@black101.local' }]],
    ]),
    importPreview: [
      {
        id: 'preview-1',
        data: '2026-03-18',
        historico: 'Transferência recebida extrato',
        docto: 'DOC-9001',
        credito: 2100,
        debito: 0,
        planoContaId: 'plano-2',
        transferenciaContaId: 'Não Selecionado',
        baixa: true,
      },
    ] satisfies ImportPreviewItem[],
    exportRequests: 0,
    reportRequests: 0,
  };

  const csrfHandler = async (route: Route) => {
    await route.fulfill({
      status: 200,
      headers: {
        'content-type': 'application/json',
        'set-cookie': 'XSRF-TOKEN=mocked-token; Path=/; SameSite=Lax',
      },
      body: JSON.stringify({ token: 'mocked-token' }),
    });
  };

  const loginHandler = async (route: Route) => {
    const data = route.request().postDataJSON() as { password?: string };
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
  };

  const meHandler = async (route: Route) => {
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
        claims: ['E_MFI', 'R_MFI', 'R_MFI_LOTE', 'E_MFI_BLT', 'W_RCT', 'E_MFI_BAI'],
        contextoEmpresas: {
          empresasDisponiveis: [{ id: 'empresa-1', nome: 'FIDC Seed', documento: '12345678000199' }],
          empresasSelecionadasIds: ['empresa-1'],
        },
      }),
    });
  };

  await page.route('**/auth/csrf', csrfHandler);
  await page.route('**/auth/login', loginHandler);
  await page.route('**/auth/me', meHandler);
  await page.route('**/auth/logout', async (route) => {
    state.loggedIn = false;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'ok' }) });
  });

  await page.route('**/MovimentoFinanceiro/get/list**', async (route) => {
    const url = new URL(route.request().url());
    const keyword = (url.searchParams.get('keyword') ?? '').toLowerCase();
    const status = url.searchParams.get('status');
    const tipo = url.searchParams.get('tipo');

    let filtered = [...state.movimentos];
    if (keyword) {
      filtered = filtered.filter((item) =>
        [item.descricao, item.fornecededor, item.numeroReferencia]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword)),
      );
    }

    if (status) {
      filtered = filtered.filter((item) => (status === 'Baixado' ? item.pagamentoEfetuado : !item.pagamentoEfetuado));
    }

    if (tipo) {
      filtered = filtered.filter((item) => String(item.tipoMovimento) === tipo);
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: filtered,
        page: Number(url.searchParams.get('page') ?? 0),
        pageSize: Number(url.searchParams.get('pageSize') ?? 100),
        totalItems: filtered.length,
      }),
    });
  });

  await page.route('**/MovimentoFinanceiro/get/saldoContas**', async (route) => {
    const saldoPrincipal = state.movimentos.reduce((acc, item) => {
      if (item.conta?.id !== contaPrincipal.id) {
        return acc;
      }
      const valor = item.valorRecebimento ?? item.valorDespesa ?? item.valorPago ?? 0;
      return acc + (item.tipoMovimento === 1 ? valor : -valor);
    }, 25000);

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { conta: contaPrincipal, valorSaldo: saldoPrincipal },
        { conta: contaCaixa, valorSaldo: 8600 },
      ]),
    });
  });

  await page.route('**/conta/get/contas', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([contaPrincipal, contaCaixa]),
    });
  });

  await page.route('**/PlanoConta/get/planoContas', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([planoOperacional, planoRecebiveis]),
    });
  });

  await page.route('**/cedente/get/cedentes', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([cedente]),
    });
  });

  await page.route('**/MovimentoFinanceiro/get/unique/*', async (route) => {
    const id = route.request().url().split('/').pop() ?? '';
    const item = state.movimentos.find((current) => current.id === id);
    if (!item) {
      await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ detail: 'Movimentação não encontrada.' }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(item) });
  });

  await page.route('**/MovimentoFinanceiro/register', async (route) => {
    const body = route.request().postData() ?? '';
    const tipoMovimento = Number(extractMultipartValue(body, 'TipoMovimento'));
    const novoId = createId();
    const valor = Number(extractMultipartValue(body, 'Valor'));
    const valorPago = Number(extractMultipartValue(body, 'ValorPago'));
    const created: MovimentacaoApiItem = {
      id: novoId,
      tipoMovimento,
      pagamentoEfetuado: extractMultipartValue(body, 'PagamentoEfetuado') === 'true',
      valorDespesa: tipoMovimento === 0 ? valor : undefined,
      valorRecebimento: tipoMovimento === 1 ? valor : undefined,
      valorPago,
      descricao: extractMultipartValue(body, 'Descricao'),
      fornecededor: extractMultipartValue(body, 'Fornecededor'),
      conta: [contaPrincipal, contaCaixa].find((item) => item.id === extractMultipartValue(body, 'ContaId')) ?? contaPrincipal,
      planoDeConta: [planoOperacional, planoRecebiveis].find((item) => item.id === extractMultipartValue(body, 'PlanoDeContaId')) ?? planoOperacional,
      cedente: extractMultipartValue(body, 'CedenteId') ? cedente : null,
      dataMovimento: `${extractMultipartValue(body, 'DataMovimento')}T00:00:00Z`,
      dataPagamento: extractMultipartValue(body, 'DataPagamento') ? `${extractMultipartValue(body, 'DataPagamento')}T00:00:00Z` : null,
      dataVencimento: extractMultipartValue(body, 'DataVencimento') ? `${extractMultipartValue(body, 'DataVencimento')}T00:00:00Z` : null,
      numeroReferencia: extractMultipartValue(body, 'NumeroReferencia'),
      dateCreated: `${extractMultipartValue(body, 'DataMovimento')}T00:00:00Z`,
    };

    state.movimentos.unshift(created);
    state.historicos.set(novoId, [{ id: createId(), acao: 'Criação', dateCreated: created.dateCreated, userEmail: 'admin@black101.local' }]);

    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: novoId }) });
  });

  await page.route('**/MovimentoFinanceiro/update', async (route) => {
    const body = route.request().postData() ?? '';
    const id = extractMultipartValue(body, 'id');
    const target = state.movimentos.find((item) => item.id === id);
    if (!target) {
      await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ detail: 'Movimentação não encontrada.' }) });
      return;
    }

    target.descricao = extractMultipartValue(body, 'Descricao') || target.descricao;
    target.fornecededor = extractMultipartValue(body, 'Fornecededor') || target.fornecededor;
    target.numeroReferencia = extractMultipartValue(body, 'NumeroReferencia') || target.numeroReferencia;
    target.dataMovimento = `${extractMultipartValue(body, 'DataMovimento') || target.dataMovimento.slice(0, 10)}T00:00:00Z`;
    target.dataPagamento = extractMultipartValue(body, 'DataPagamento')
      ? `${extractMultipartValue(body, 'DataPagamento')}T00:00:00Z`
      : target.dataPagamento;
    target.dataVencimento = extractMultipartValue(body, 'DataVencimento')
      ? `${extractMultipartValue(body, 'DataVencimento')}T00:00:00Z`
      : target.dataVencimento;
    target.pagamentoEfetuado = extractMultipartValue(body, 'PagamentoEfetuado') === 'true';
    target.valorPago = Number(extractMultipartValue(body, 'ValorPago') || target.valorPago || 0);
    const valor = Number(extractMultipartValue(body, 'Valor'));
    if (target.tipoMovimento === 0) {
      target.valorDespesa = valor;
    }
    if (target.tipoMovimento === 1) {
      target.valorRecebimento = valor;
    }

    const history = state.historicos.get(id) ?? [];
    history.unshift({ id: createId(), acao: 'Edição', dateCreated: '2026-03-18T16:30:00Z', userEmail: 'admin@black101.local' });
    state.historicos.set(id, history);

    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id }) });
  });

  await page.route('**/MovimentoFinanceiro/remove/*', async (route) => {
    const id = route.request().url().split('/').pop() ?? '';
    state.movimentos = state.movimentos.filter((item) => item.id !== id);
    state.historicos.delete(id);
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });

  await page.route('**/MovimentoFinanceiro/removerLote', async (route) => {
    const body = route.request().postDataJSON() as { ids?: string[] };
    const ids = new Set(body.ids ?? []);
    state.movimentos = state.movimentos.filter((item) => !ids.has(item.id));
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });

  await page.route('**/MovimentoFinanceiro/baixaLote', async (route) => {
    const body = route.request().postDataJSON() as { ids?: string[]; dataPagamento?: string };
    const ids = new Set(body.ids ?? []);
    state.movimentos = state.movimentos.map((item) =>
      ids.has(item.id)
        ? {
            ...item,
            pagamentoEfetuado: true,
            dataPagamento: body.dataPagamento ? `${body.dataPagamento}T00:00:00Z` : item.dataPagamento,
            valorPago: item.valorDespesa ?? item.valorRecebimento ?? item.valorPago ?? 0,
          }
        : item,
    );
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });

  await page.route('**/MovimentoFinanceiro/abrirBaixaLote', async (route) => {
    const body = route.request().postDataJSON() as { ids?: string[] };
    const ids = new Set(body.ids ?? []);
    state.movimentos = state.movimentos.map((item) =>
      ids.has(item.id)
        ? {
            ...item,
            pagamentoEfetuado: false,
            dataPagamento: null,
          }
        : item,
    );
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });

  await page.route('**/historico/get/list**', async (route) => {
    const url = new URL(route.request().url());
    const id = url.searchParams.get('id') ?? '';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: state.historicos.get(id) ?? [] }),
    });
  });

  await page.route('**/MovimentoFinanceiro/import/extrato', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });

  await page.route('**/MovimentoFinanceiro/get/list/extrato', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(state.importPreview) });
  });

  await page.route('**/MovimentoFinanceiro/register/extrato', async (route) => {
    const body = route.request().postDataJSON() as {
      contaId?: string;
      movimentoFinanceiroExtratoPlanoContas?: Array<{
        id: string;
        planoContaId: string;
        transferenciaContaId: string | null;
        baixa: boolean;
      }>;
    };

    for (const item of body.movimentoFinanceiroExtratoPlanoContas ?? []) {
      const preview = state.importPreview.find((current) => current.id === item.id);
      if (!preview) {
        continue;
      }

      const novoId = createId();
      state.movimentos.unshift({
        id: novoId,
        tipoMovimento: preview.credito > 0 ? 1 : 0,
        pagamentoEfetuado: item.baixa,
        valorRecebimento: preview.credito > 0 ? preview.credito : undefined,
        valorDespesa: preview.debito > 0 ? preview.debito : undefined,
        valorPago: preview.credito > 0 ? preview.credito : preview.debito,
        descricao: preview.historico,
        fornecededor: preview.docto,
        conta: [contaPrincipal, contaCaixa].find((current) => current.id === body.contaId) ?? contaPrincipal,
        contaDestino: item.transferenciaContaId
          ? [contaPrincipal, contaCaixa].find((current) => current.id === item.transferenciaContaId) ?? undefined
          : undefined,
        planoDeConta: [planoOperacional, planoRecebiveis].find((current) => current.id === item.planoContaId) ?? planoOperacional,
        cedente,
        dataMovimento: `${preview.data}T00:00:00Z`,
        dataPagamento: item.baixa ? `${preview.data}T00:00:00Z` : null,
        dataVencimento: `${preview.data}T00:00:00Z`,
        numeroReferencia: preview.docto,
        dateCreated: `${preview.data}T00:00:00Z`,
      });
      state.historicos.set(novoId, [{ id: createId(), acao: 'Importação', dateCreated: `${preview.data}T00:00:00Z`, userEmail: 'admin@black101.local' }]);
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });

  await page.route('**/MovimentoFinanceiro/get/list/export**', async (route) => {
    state.exportRequests += 1;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ total: state.exportRequests }) });
  });

  await page.route('**/movimentofinanceiro/GerarRelatorioContabilidade', async (route) => {
    state.reportRequests += 1;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ total: state.reportRequests }) });
  });
};

const login = async (page: Page) => {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill('admin@black101.local');
  await page.locator('input[type="password"]').fill('Master@5859');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/$/);
};

const openRoute = async (page: Page) => {
  await page.goto('/financeiro/movimentacoes');
  await expect(page.getByRole('heading', { name: 'Movimentações Financeiras' })).toBeVisible();
  await expect(page.getByText('Conta Principal').first()).toBeVisible();
  await expect(page.getByText('Pagamento fornecedor Alpha')).toBeVisible();
};

test.describe('financeiro-movimentacoes', () => {
  test.beforeEach(async ({ page }) => {
    await setupFinanceiroApiMock(page);
  });

  test('fluxo principal com filtro, criacao, edicao, exclusao, historico e lote', async ({ page }) => {
    await login(page);
    await openRoute(page);

    await page.getByRole('button', { name: 'Filtros' }).click();
    const filterDialog = page.locator('.modal-card').filter({ has: page.getByRole('heading', { name: 'Filtrar movimentações' }) });
    await filterDialog.locator('#mov-keyword').fill('Alpha');
    await filterDialog.getByRole('button', { name: 'Aplicar' }).evaluate((element: HTMLButtonElement) => element.click());
    await expect(page.getByText('Pagamento fornecedor Alpha')).toBeVisible();
    await expect(page.getByText('Pagamento fornecedor Beta')).not.toBeVisible();

    await page.getByRole('button', { name: 'Filtros' }).click();
    const resetFilterDialog = page.locator('.modal-card').filter({ has: page.getByRole('heading', { name: 'Filtrar movimentações' }) });
    await resetFilterDialog.getByRole('button', { name: 'Limpar' }).evaluate((element: HTMLButtonElement) => element.click());
    await expect(page.getByText('Pagamento fornecedor Beta')).toBeVisible();

    await page.getByRole('button', { name: 'Nova movimentação' }).click();
    await page.getByRole('button', { name: 'Crédito' }).click();

    const formDialog = page.locator('.modal-card').filter({ has: page.getByRole('heading', { name: 'Nova Credito' }) });
    await formDialog.getByRole('combobox').nth(0).selectOption('conta-1');
    await formDialog.getByRole('combobox').nth(1).selectOption('plano-2');
    await formDialog.getByRole('combobox').nth(2).selectOption('ced-1');
    await formDialog.getByLabel('Valor', { exact: true }).fill('2300');
    await formDialog.getByLabel('Valor pago', { exact: true }).fill('2300');
    await formDialog.getByLabel('Número referência', { exact: true }).fill('REF-900');
    await formDialog.getByLabel('Destino/Origem', { exact: true }).fill('Cliente Prime');
    await formDialog.getByLabel('Descrição', { exact: true }).fill('Recebimento cliente Prime');
    await formDialog.getByRole('button', { name: 'Salvar' }).evaluate((element: HTMLButtonElement) => element.click());

    await expect(page.getByText('Movimentação criada.')).toBeVisible();
    await expect(page.getByText('Recebimento cliente Prime')).toBeVisible();

    const createdRow = page.locator('tbody tr').filter({ hasText: 'Recebimento cliente Prime' }).first();
    await createdRow.getByRole('button', { name: 'Editar' }).click();

    const editDialog = page.locator('.modal-card').filter({ has: page.getByRole('heading', { name: 'Editar Credito' }) });
    await editDialog.getByLabel('Descrição').fill('Recebimento cliente Prime ajustado');
    await editDialog.getByRole('button', { name: 'Salvar' }).evaluate((element: HTMLButtonElement) => element.click());

    await expect(page.getByText('Movimentação atualizada.')).toBeVisible();
    await expect(page.getByText('Recebimento cliente Prime ajustado')).toBeVisible();

    const alphaRow = page.locator('tbody tr').filter({ hasText: 'Pagamento fornecedor Alpha' }).first();
    await alphaRow.getByRole('button', { name: 'Detalhes' }).click();
    await expect(page.getByText('Criação')).toBeVisible();
    await page.getByRole('button', { name: 'Fechar' }).click();

    page.once('dialog', (dialog) => dialog.accept());
    const createdAdjustedRow = page.locator('tbody tr').filter({ hasText: 'Recebimento cliente Prime ajustado' }).first();
    await createdAdjustedRow.getByRole('button', { name: 'Excluir' }).click();
    await expect(page.getByText('Movimentação removida.')).toBeVisible();
    await expect(page.getByText('Recebimento cliente Prime ajustado')).not.toBeVisible();

    const batchRows = page.locator('tbody tr').filter({ hasText: 'Pagamento fornecedor' });
    await batchRows.nth(0).locator('input[type="checkbox"]').check();
    await batchRows.nth(1).locator('input[type="checkbox"]').check();

    await page.getByRole('button', { name: 'Baixa em lote' }).click();
    const settlementDialog = page.locator('.modal-card').filter({ has: page.getByRole('heading', { name: 'Baixa em lote' }) });
    await settlementDialog.getByLabel('Data pagamento', { exact: true }).fill('2026-03-18');
    await settlementDialog.getByRole('button', { name: 'Confirmar' }).evaluate((element: HTMLButtonElement) => element.click());
    await expect(page.getByText('Baixa em lote concluída.')).toBeVisible();

    await expect(batchRows.nth(0)).toContainText('Baixado');
    await expect(batchRows.nth(1)).toContainText('Baixado');

    await batchRows.nth(0).locator('input[type="checkbox"]').check();
    await batchRows.nth(1).locator('input[type="checkbox"]').check();
    await page.getByRole('button', { name: 'Reabertura em lote' }).click();
    await page.getByRole('button', { name: 'Reabrir' }).evaluate((element: HTMLButtonElement) => element.click());
    await expect(page.getByText('Reabertura em lote concluída.')).toBeVisible();

    await expect(batchRows.nth(0)).toContainText('Aberto');
    await expect(batchRows.nth(1)).toContainText('Aberto');
  });

  test('importacao em duas etapas e acoes extras do modulo', async ({ page }) => {
    await login(page);
    await openRoute(page);

    await page.getByRole('button', { name: 'Exportar Excel' }).click();
    await expect(page.getByText('Exportação solicitada.')).toBeVisible();

    await page.getByRole('button', { name: 'Gerar relatório' }).click();
    await expect(page.getByText('Relatório contábil solicitado.')).toBeVisible();

    await page.getByRole('button', { name: 'Importar' }).click();
    const importDialog = page.locator('.modal-card').filter({ has: page.getByRole('heading', { name: 'Importar movimentação financeira' }) });
    await importDialog.getByLabel('Conta').selectOption('conta-1');
    await importDialog.locator('input[type="file"]').setInputFiles({
      name: 'extrato.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('data;historico;valor\n2026-03-18;Transferencia recebida extrato;2100'),
    });
    await importDialog.getByRole('button', { name: 'Continuar' }).click();

    await expect(page.getByRole('heading', { name: 'Conferir importação' })).toBeVisible();
    await page.getByRole('button', { name: 'Importar selecionados' }).click();

    await expect(page.getByText('Importação concluída.')).toBeVisible();
    await expect(page.getByText('Transferência recebida extrato')).toBeVisible();
  });
});
