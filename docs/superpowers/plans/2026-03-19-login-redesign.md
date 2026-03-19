# Login Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the login experience with the deep-blue glassmorphism theme while preserving the existing authentication flows (2FA, captcha, Entra) and accessibility constraints.

**Architecture:** Use `LoginPage` as the orchestrator that keeps state while delegating rendering to focused subcomponents (credentials form, captcha, 2FA panel, aside). Wrap everything in a gradient `PageFrame`/`login-hero` grid that swaps to a stacked mobile view with collapsible trust cards.

**Tech Stack:** React 19 + TypeScript + Vite, CSS modules/global styles (per repository pattern), Vitest + Playwright for tests, axe/contrast tooling for accessibility checks.

---

### Task 1: Rebuild the login shell layout

**Files:**
- Modify: `src/features/login/LoginPage.tsx`
- Create: `src/features/login/components/LoginCredentialsForm.tsx`
- Create: `src/features/login/components/LoginCaptcha.tsx`
- Create: `src/features/login/components/LoginTwoFactorPanel.tsx`
- Create: `src/features/login/components/LoginAside.tsx`

- [ ] **Step 1: Sketch the new layout structure in `LoginPage`**

```tsx
return (
  <PageFrame className="login-hero">
    <section className="login-card">
      <LoginCredentialsForm {...credentialsProps} />
      <LoginCaptcha {...captchaProps} />
      <LoginTwoFactorPanel {...twoFactorProps} />
    </section>
    <LoginAside data-testid="login-aside" />
  </PageFrame>
);
```

Dependency: existing `LoginPage` state/handlers and the spec’s grid/aside requirements.
Validation: TypeScript compiles; page renders both sections before styling is applied (smoke check via `npm run dev`).

- [ ] **Step 2: Wire `LoginPage` state/handlers into the new component props**

Dependency: current handlers (`handleSubmit`, `handleTwoFactorSubmit`, `handleEntraLogin`, captcha callbacks) and `LoginPage` state object.
Validation: Props are correctly typed and the compiler enforces all required callbacks (errors appear if handlers are missing).

- [ ] **Step 3: Ensure 2FA/captcha/Entra flows reuse existing logic**

Dependency: cached hooks for Turnstile, timers, and backend calls already defined in `LoginPage`.
Validation: Running `npm run lint` shows no unused imports, and manual spot-check via dev server confirms 2FA sections still display when required.

### Task 2: Build composable UI components

**Files:**
- Modify: `src/features/login/components/LoginCredentialsForm.tsx`
- Modify: `src/features/login/components/LoginCaptcha.tsx`
- Modify: `src/features/login/components/LoginTwoFactorPanel.tsx`
- Modify: `src/features/login/components/LoginAside.tsx`

- [ ] **Step 1: Implement `LoginCredentialsForm` with icon inputs, errors, and actions**

```tsx
<form onSubmit={onSubmit}>
  <Input icon="mail" value={email} onChange={onChange('email')} />
  <Input icon="lock" type="password" .../>
  <Checkbox checked={remember} />
  <button className="btn-main" disabled={loading}></button>
</form>
<span role="alert" aria-live="assertive">{errorMessage}</span>
```

Dependency: design spec for gradients/button states and `aria-live` requirements.
Validation: Vitest unit test asserts `onSubmit` fires, `role="alert"` present, button disabled while `loading`.

- [ ] **Step 2: Encapsulate captcha and Turnstile success/error handling**

Dependency: Turnstile wrapper in repo; existing `siteKey` constant.
Validation: Unit test checks `onSuccess`/`onError` callbacks are wired, and `data-testid="captcha-panel"` is rendered.

- [ ] **Step 3: Implement `LoginTwoFactorPanel` with tabs, timer bar, and regenerate flow**

Dependency: Timer hook or state already used; method switch logic from legacy UI.
Validation: Unit tests cover tab switching (`onMethodChange`), regen button disabled while `loading`, error message uses `aria-live`.

- [ ] **Step 4: Build the “trust card” aside with keyboard focus states**

Dependency: Static data list (benefits/stats) defined near spec.
Validation: Cards render with `tabindex="0"` and focus outline, mobile layout able to switch to stacked view (can be previewed via responsive devtools).

### Task 3: Apply theming and glassmorphism styling

**Files:**
- Modify: `src/app/styles.css` (or theme entry) to declare CSS variables
- Create: `src/features/login/login.css`
- Modify: `src/features/login/LoginPage.tsx` to import `login.css`

- [ ] **Step 1: Declare theme variables (`--login-bg`, `--login-gradient`, etc.) in `:root`**

```css
:root {
  --login-bg: #010f2c;
  --login-gradient: radial-gradient(circle at 15% 15%, #1b428d, var(--login-bg));
  --login-card-blur: 32px;
}
```

Dependency: `src/app/styles.css` import order (must execute before component styles).
Validation: Running `npm run build` ensures CSS variables are referenced without missing declarations.

- [ ] **Step 2: Write `login.css` covering background, card, buttons, inputs, trust cards**

Dependency: class names used in components (`login-hero`, `login-card`, `btn-main`).
Validation: Visual check via `npm run dev` that gradient backdrop, blurred card, and button hover states roughly match spec (use devtools to inspect computed values).

- [ ] **Step 3: Add responsive overrides for <768px (remove aside, stack cards)**

Dependency: media queries should mirror spec (“hide column, stack trust cards”). `@media (max-width: 768px)` block in `login.css`.
Validation: DevTools responsive mode shows aside moving below form, width ~90%, gradients still present; automated viewport screenshot (per Task 5) will confirm.

### Task 4: Responsive tweaks and accessibility polish

**Files:**
- Modify: `src/features/login/login.css`
- Modify: `src/features/login/components/*.tsx` (aria attributes/focus states)

- [ ] **Step 1: Ensure inputs/buttons have focus outlines and contrast ratios per spec**

Dependency: color palette from Task 3; `input` classes referencing `--login-button-gradient` etc.
Validation: Use `npx axe --tags wcag2aa` on login page (or `npm run test:axe` if exists) to confirm no contrast violations, and manual check for focus outlines.

- [ ] **Step 2: Add `aria-live="assertive"` spans and ensure keyboard order**

Dependency: existing error state locations.
Validation: Vitest accessibility tests or manual Tab through form to confirm focus order; failing test step will catch missing `aria-live`.

- [ ] **Step 3: Document responsive behavior for mobile (aside stack + gradient adjustments) in comments or README block**

Dependency: Mobile behavior from spec.
Validation: Brief note in doc verifying `@media` rule exists with explanation, so reviewers know why stack occurs.

### Task 5: Testing regimen

**Files:**
- Modify: `src/features/login/components/LoginCredentialsForm.test.tsx`
- Modify: `src/features/login/components/LoginTwoFactorPanel.test.tsx`
- Modify: `e2e/login.spec.ts`
- Add: visual snapshots under `test-results/visual` or Playwright screenshot folder

- [ ] **Step 1: Add Vitest unit tests for form, captcha, and 2FA interactions**

Dependency: new components imported into spec; mocks for `onSubmit`/`onRegenerateQr`.
Command: `npm run test -- --runInBand src/features/login/components/LoginCredentialsForm.test.tsx`
Validation: Tests assert button disables on `loading`, `aria-live` errors, and event callbacks fire.

- [ ] **Step 2: Update `e2e/login.spec.ts` for new selectors and flows**

Dependency: new data-testid attributes (`login-aside`, `trust-card`, `captcha-panel`).
Command: `npm run e2e`
Validation: Specs cover success path (credentials + 2FA) + error states (bad code, Entra login), Tab navigation, and mock Turnstile/QR flows.

- [ ] **Step 3: Capture visual regression screenshots (desktop/mobile)**

Dependency: Playwright screenshot hooks (use `page.screenshot`)
Command: `npm run e2e:headed -- --project=chromium`
Validation: Save screenshots for card + aside; compare with baseline or drop into review to ensure gradient/blur align; note any visible regressions.

- [ ] **Step 4: Run contrast tooling**

Dependency: `npx axe` or `npm run lint:accessibility` (whatever repo uses) targeting login route.
Command: `npx axe -t login` (or existing script) focusing on color contrast.
Validation: No contrast errors for primary text vs. background.

### Task 6: Documentation updates

**Files:**
- Modify/Create: `docs/design/login-redesign.md`
- Modify: `docs/superpowers/specs/2026-03-19-login-redesign-design.md` (if clarifications needed)

- [ ] **Step 1: Document theme variables and how `login.css` wires into `styles.css`**

Dependency: Theme variables defined in Task 3.
Validation: Document lists each variable with purpose and mentions where to import `login.css`.

- [ ] **Step 2: Capture key responsive/accessibility decisions**

Dependency: responsive rules (stacked aside, gradient adjustments) and `aria-live` usage.
Validation: Reader can reproduce layout by following doc; cross-reference spec points.

### Post-plan review

- [ ] Dispatch plan-document-reviewer subagent with context (plan path + spec path). Mention this plan is stored at `docs/superpowers/plans/2026-03-19-login-redesign.md` and review should focus on component breakdown, CSS order, and test coverage.

