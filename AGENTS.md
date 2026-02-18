# Repository Guidelines

## Project Structure & Module Organization
This is a Vite + React 19 + TypeScript frontend. Main source code lives in `src/`.
- `src/app/`: app shell, routing, layout, and auth context/guards.
- `src/features/`: domain pages (for example `cadastros`, `operacoes`, `financeiro`, `admin`, `securitizadora`).
- `src/shared/`: reusable UI, API client setup, and shared types.
- `public/`: static assets.
- `e2e/`: Playwright end-to-end specs (`*.spec.ts`).
- `dist/` and `test-results/`: generated output; do not edit manually.

## Build, Test, and Development Commands
Use npm scripts from `package.json`:
- `npm run dev`: start local dev server (default Vite port 5173).
- `npm run build`: type-check (`tsc -b`) and produce production build in `dist/`.
- `npm run preview`: serve the built app locally.
- `npm run lint`: run ESLint across the repository.
- `npm run e2e:install`: install Playwright browsers.
- `npm run e2e`: run E2E tests headless.
- `npm run e2e:headed`: run E2E tests with browser UI.

## Coding Style & Naming Conventions
- Language: TypeScript (`strict` mode enabled).
- Indentation: 2 spaces; keep imports grouped and ordered logically.
- Components/pages: `PascalCase` file names (example: `AdminUsuariosPage.tsx`).
- Utilities/types/CSS: descriptive names matching feature context (example: `cadastroCommon.ts`, `workers.css`).
- Follow ESLint config in `eslint.config.js` (TypeScript, React Hooks, React Refresh rules).

## Testing Guidelines
- Framework: Playwright (`@playwright/test`) with desktop and mobile projects.
- Place specs in `e2e/` and name them `*.spec.ts`.
- Keep tests deterministic by mocking backend routes when possible (see `e2e/app.spec.ts`).
- Run `npm run e2e` before opening a PR for routing, auth, or CRUD changes.

## Commit & Pull Request Guidelines
- Existing history favors short, imperative commit messages in Portuguese (example: `Adiciona ...`, `Corrige ...`).
- Prefer format: `<area>: <ação objetiva>` (example: `cadastros: corrige validação de CNPJ`).
- Avoid vague commits (for example single-letter subjects).
- Perform commits automatically after each implementation, following market-standard commit message conventions.
- PRs should include: objective, affected routes/modules, test evidence (`npm run lint`, `npm run e2e`), and screenshots/GIFs for UI changes.

## Security & Configuration Tips
- Configure API base URL via `.env.local` (example: `VITE_API_BASE_URL=https://localhost:7110`).
- Do not commit secrets; keep only safe defaults in `.env.example`.
- Preserve cookie-based auth flow; avoid storing auth tokens in `localStorage`/`sessionStorage`.
