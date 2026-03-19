# Login Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current login page with the premium glassmorphic experience while preserving all backend behaviors.

**Architecture:** The existing `LoginPage` remains the stateful orchestrator, while glassmorphic styling and responsive layout are extracted into focused components (`LoginCredentialsForm`, `LoginCaptcha`, `LoginTwoFactorPanel`, `LoginAside`) that rely on shared CSS variables and consistent grid placement.

**Tech Stack:** React 19 + Vite + TypeScript, CSS Custom Properties, Vitest for unit tests, Playwright for e2e, axe/vitest accessibility tooling.

**Relevant skills:** @frontend-ui-ux-angular-react @frontend-dev-guidelines

---

### Task 1: Layout & Theme

- **Files:**
- Modify: `C:/rep/refacFront/black101.frontend/src/app/styles.css`
- Create: `C:/rep/refacFront/black101.frontend/src/features/login/login.css`
- Test: `npm run lint`

- [ ] **Step 1: Declare login theme variables in `:root`**
  Dependency: ensures these variables are available before components render.
  Action: add `--login-bg`, `--login-gradient`, `--login-button-gradient-start`, `--login-button-gradient-end`, `--login-card-blur`, `--login-shadow`, `--login-card-bg` alongside any existing theme palette; include comments tying each to the spec (radial gradient, card blur).
  Validation: `npm run lint` should still pass and `npm run build` should not error due to undefined variables.

- [ ] **Step 2: Create `login.css` with background, card, button, and aside utility classes**
  Dependency: theme variables defined in Step 1.
  Action: write CSS implementing the radial gradient hero, glassmorphic card (`login-card`), gradient button (`btn-main`), field focus state, `login-aside`, responsive breakpoints (e.g., `@media (max-width: 767px)`), and utilities for `login-hero`, `login-hero__trust-card`, `login-card__alert`.
  Validation: run `npm run lint` to catch syntax issues and eyeball by importing in dev server if necessary.

- [ ] **Step 3: Import `login.css` into the login feature**
  Dependency: CSS file exists; ensures styles apply.
  Action: update `src/features/login/LoginPage.tsx` (or its layout wrapper) to `import "./login.css";` and wrap existing markup in new classes (`login-hero`, `login-card`, etc.).
  Validation: `npm run lint` or `npm run build` and a quick `npm run dev` check to confirm styles load without missing files.


### Task 2: Component updates

- **Files:**
- Modify: `C:/rep/refacFront/black101.frontend/src/features/login/LoginPage.tsx`
- Create: `C:/rep/refacFront/black101.frontend/src/features/login/components/LoginCredentialsForm.tsx`
- Create: `C:/rep/refacFront/black101.frontend/src/features/login/components/LoginCaptcha.tsx`
- Create: `C:/rep/refacFront/black101.frontend/src/features/login/components/LoginTwoFactorPanel.tsx`
- Create: `C:/rep/refacFront/black101.frontend/src/features/login/components/LoginAside.tsx`
- Test: `npm run lint src/features/login`

- [ ] **Step 1: Stub the new components with full prop contracts**
  Dependency: requires understanding of existing handlers housed in `LoginPage`.
  Action: implement each component as a presentational unit with props matching the spec (`email`, `password`, `remember`, `loading`, `errorMessage`, captcha callbacks, 2FA payloads, static trust data); add `role="alert"` + `aria-live="assertive"` for error spans and placeholder markup for cards.
  Validation: TypeScript should compile without prop mismatches; run `npm run lint src/features/login/components`.

- [ ] **Step 2: Rebuild `LoginPage` layout to render the new components side by side**
  Dependency: components ready and CSS imports in place.
  Action: switch the JSX in `LoginPage` to the grid layout described (card + aside), pass down existing state/handlers (`handleSubmit`, `handleTwoFactorSubmit`, `handleEntraLogin`, captcha props), and add conditional rendering for `<768px` (e.g., render aside below card when window width < 768 via CSS).
  Validation: `npm run lint` plus `npm run build`; `npm run dev` confirm login form still submits (manual for now).

- [ ] **Step 3: Wire icons, labels, and focus states for inputs/buttons**
  Dependency: new form structure from Step 2 and CSS classes defined.
  Action: add icons (SVG or font) inside inputs with `aria-hidden="true"`, include `remember` checkbox and “Esqueci minha senha” link, ensure button has `btn-main` class.
  Validation: check `npm run lint` for JSX; run `npm run test -- LoginCredentialsForm` after adding tests (Task 5) to catch regressions.


### Task 3: Responsive behavior & interactions

**Files:**
- Modify: `C:/rep/refacFront/black101.frontend/src/features/login/login.css`
- Modify: `C:/rep/refacFront/black101.frontend/src/features/login/components/LoginPage.tsx`
- Modify: `C:/rep/refacFront/black101.frontend/src/features/login/components/LoginAside.tsx`
- Test: `npm run dev` (responsive inspect) + `npm run e2e --login`

- [ ] **Step 1: Define responsive rules for grid + aside**
  Dependency: CSS structure from Task 1.
  Action: ensure `login-aside` hides on `<768px`, trust cards stack below the main card with horizontal scroll and consistent padding; include `section[data-testid="login-aside"]` transition states matching spec.
  Validation: confirm with browser devtools (mobile emulation) running `npm run dev` and verifying `login-aside` is repositioned.

- [ ] **Step 2: Implement keyboard focus + hover interactions**
  Dependency: buttons/inputs exist from Task 2.
  Action: add `:focus-visible` outlines and `btn-main` hover translate; ensure `trust-card` has `tabindex="0"` and focus ring in CSS.
  Validation: `npm run lint` and manual Tab/keyboard testing in dev server; optionally run `npx axe --tags wcag2aa` after Task 4.

- [ ] **Step 3: Keep Captcha/2FA panels responsive**
  Dependency: component layout and CSS.
  Action: confirm `LoginCaptcha` and `LoginTwoFactorPanel` resize to 90% width on mobile and include `data-testid` hooks.
  Validation: e2e tests (Task 5) targeting selectors confirm panel repositions; `npm run dev` check.


### Task 4: Accessibility improvements

**Files:**
- Modify: `C:/rep/refacFront/black101.frontend/src/features/login/components/LoginCredentialsForm.tsx`
- Modify: `C:/rep/refacFront/black101.frontend/src/features/login/components/LoginTwoFactorPanel.tsx`
- Modify: `C:/rep/refacFront/black101.frontend/src/features/login/components/LoginAside.tsx`
- Test: `npx axe --tags wcag2aa src/features/login`

- [ ] **Step 1: Add live regions/alerts and ensure contrast**
  Dependency: markup from Task 2 plus CSS variables (for contrast calculations).
  Action: wrap error messages in `span role="alert" aria-live="assertive">`, verify text uses `var(--login-card-bg)` combos abiding ≥4.5:1 (use manual calculations or mention expected values).
  Validation: run `npx axe --tags wcag2aa` and confirm alerts flagged as live regions with no contrast warnings.

- [ ] **Step 2: Make trust cards accessible**
  Dependency: `LoginAside` structure from Task 2.
  Action: add `tabindex="0"` and `aria-label` summarizing card content, focus outline color referencing `--login-shadow`, limit paragraphs to 2 lines, break text for translations.
  Validation: `npx axe` should report focusable elements with visible focus, `npm run lint` for JSX/attributes.

- [ ] **Step 3: Ensure keyboard operability of forms**
  Dependency: previously wired inputs/buttons/captcha.
  Action: confirm form can be submitted by Enter (inputs default) and `LoginTwoFactorPanel` buttons disable while `loading` true; mention date/time for QR timer accessible (aria-label on timer indicator).
  Validation: unit tests hitting `onSubmit` and injection for `loading` (Task 5) plus `npx axe` focus order check.


### Task 5: Tests

**Files:**
- Create: `C:/rep/refacFront/black101.frontend/src/features/login/components/__tests__/LoginCredentialsForm.spec.tsx`
- Create: `C:/rep/refacFront/black101.frontend/src/features/login/components/__tests__/LoginCaptcha.spec.tsx`
- Create: `C:/rep/refacFront/black101.frontend/src/features/login/components/__tests__/LoginTwoFactorPanel.spec.tsx`
- Modify: `C:/rep/refacFront/black101.frontend/e2e/login.spec.ts`
- Test: `npm run test -- components` + `npm run e2e`

- [ ] **Step 1: Write Vitest coverage for new components**
  Dependency: component props fully typed (Task 2) and CSS classes defined (Task 1).
  Action: confirm error rendering, `onSubmit`/`onRegenerateQr` callbacks, `loading` disables buttons via snapshots/assertions; use `@testing-library/react`.
  Validation: `npm run test -- LoginCredentialsForm.spec.tsx LoginCaptcha.spec.tsx LoginTwoFactorPanel.spec.tsx` should pass.

- [ ] **Step 2: Update Playwright login spec**
  Dependency: selectors updated to new structure (data-testid hooks, class names).
  Action: mock Turnstile and 2FA flows, test login (credentials form + captcha), Entra login, QR regenerate, manual code error, and Tab+Enter navigation verifying `aria-live` updates.
  Validation: `npm run e2e -- login` completes successfully; record failing selectors if not updated yet.

- [ ] **Step 3: Capture visual regression baseline**
  Dependency: final layout from Task 3.
  Action: take desktop/mobile screenshots for hero/card/aside using Playwright `page.screenshot`, compare manually or via existing pipeline.
  Validation: confirm gradient/blur matches spec; store references per team conventions.


### Task 6: Documentation

**Files:**
- Modify/Create: `C:/rep/refacFront/black101.frontend/docs/design/login-redesign.md`
- Modify: `C:/rep/refacFront/black101.frontend/src/app/styles.css` (if needed) to reference doc
- Test: `npm run lint` (docs unaffected)

- [ ] **Step 1: Document theme variables and CSS entry point**
  Dependency: variables declared in Task 1.
  Action: explain each `--login-*` variable, note how `login.css` is imported via `LoginPage`.
  Validation: confirm doc mentions location and purpose; run `npm run lint` (docs unaffected but ensures no untracked changes).

- [ ] **Step 2: Capture usage notes for trust cards/responsive behavior**
  Dependency: responsive rules from Task 3.
  Action: describe aside cards, how mobile stacks, and highlight `section[data-testid="login-aside"]` behavior.
  Validation: peer review reference? note cross-check with spec, mention verifying once after plan.

- [ ] **Step 3: List accessibility considerations**
  Dependency: results from Task 4.
  Action: include summary of live regions, focus order, contrast checks, tests used (`npx axe`, keyboard verification), and mention testers should rerun after tweaks.
  Validation: doc references align with acceptance criteria; no runnable command needed but mention manual review.
