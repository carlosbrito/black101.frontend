# Black101.FrontEnd

## Executar localmente

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## E2E (Playwright)

```bash
npm run e2e:install
npm run e2e
```

## Variável opcional

```bash
# .env.local
VITE_API_BASE_URL=https://localhost:7110
```

## Implementado
- Login com fluxo cookie-based (sem localStorage/sessionStorage para token/claims)
- Mega menu horizontal responsivo com estrutura completa do legado
- CRUD paginado para:
  - Administradoras
  - Agentes
  - Bancos
- Base administrativa:
  - Usuários
  - Grupos/Perfis
  - Auditoria
- Páginas não implementadas mapeadas para `Em construção`
