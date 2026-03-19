# Repaginação da Página de Login (2026-03-19)

## Visão geral
- Objetivo: manter o comportamento funcional migrado do legado (2FA, captcha, login Entra) e entregar uma experiência visual premium com **fundo azul profundo**, **gradientes suaves** e cards translúcidos inspirados em glassmorphism.
- Público-alvo: usuários internos só precisam de um caminho rápido para autenticar (login principal), mas a nova estética deve ajudar a reforçar a segurança e confiança da plataforma.
- Premissas: não estamos substituindo regras de negócio (2FA, captcha, Entra, erros do backend), apenas reaplicando-as com nova camada visual. O layout atual (`src/features/login/LoginPage.tsx`) continua como base funcional.

## Direção visual
- Plano de fundo: gradiente radial que vai de azul profundo (#010f2c) para um azul mais claro (#1b428d), com brilho pontual na parte superior esquerda para sugerir profundidade; em mobile (<768px) reduzimos saturação e ocultamos a coluna lateral, convertendo bullets de benefícios em um bloco empilhado abaixo do card principal.
- Card principal: painel central com bordas arredondadas (16px), fundo branco translúcido com blur (glassmorphism), drop shadow suave; o conteúdo segue a hierarquia: título, formulário de credenciais, captcha, estado de erro/alerta e botões de ação. Em telas estreitas ocupa ~90% da largura, mantendo padding interno consistente.
- Detalhes: botão principal `btn-main` com gradiente linear (#6a99ff → #2c6ef1), hover com leve deslocamento (translateY(-1px)) e sombra intensificada; campos de input têm bordas iluminadas e placeholder translúcido. A coluna lateral é substituída por “cards de confiança” que se expandem por cima do fundo azul em desktop e deslizam sob o card no mobile.

## Componentes e layout
1. `LoginFeature` (container)
   - Usa `PageFrame` ou wrapper similar.
   - Layout em grid: card do formulário + coluna lateral (ilustração/resumo de benefícios). Em <768px, renderiza apenas o card principal e empilha a coluna (com `section[data-testid="login-aside"]`) abaixo, mantendo o gradiente completo.
2. `LoginCredentialsForm`
   - Inputs com ícones (email, lock) e animações de foco. Props: `email`, `password`, `remember`, `loading`, `errorMessage`, `onChange`, `onSubmit`.
   - Checkbox “manter conexão”, link “esqueci minha senha” e botão “Entrar” full-width.
   - Mensagens de erro renderizadas abaixo dos campos (`span` com `role="alert"` + `aria-live="assertive"`).
3. `LoginCaptcha`
   - Mantém o Turnstile, encapsulado em `div[data-testid="captcha-panel"]`, com props `siteKey`, `onSuccess`, `onError` e `loading`.
4. `LoginTwoFactorPanel`
   - Contêiner com abas internas para QR ou código manual, mantendo o fluxo já migrado. Props: `method`, `qr`, `codeValue`, `error`, `loading`, `onMethodChange`, `onSubmitCode`, `onRegenerateQr`.
   - Timer (linha de progresso) no QR, botão “Regenerar QR” e método alternativo “Enviar código para app”. O botão “Enviar” fica desabilitado enquanto `loading` for verdadeiro; `error` é renderizado abaixo do campo (mesma estrutura `aria-live` do formulário principal).
5. `LoginAside`
   - Lista de bullets com blur background, pequenas cards com estatísticas/ilustrações (SVG) que recebem `tabindex="0"` e têm foco visível; em mobile se transformam em seção stack com scroll horizontal, limitando texto a dois parágrafos e incluindo quebra automática para traduções longas.

## Estado, dados e comportamento
- O estado permanece em `LoginPage`. Os novos componentes recebem props/handlers assim:
  - `LoginCredentialsForm`: `email`, `password`, `remember`, `errorMessage`, `loading`, `onChange`, `onSubmit`.
  - `LoginCaptcha`: `siteKey`, `onSuccess`, `onError`.
  - `LoginTwoFactorPanel`: `method`, `qrPayload`, `codeValue`, `error`, `loading`, `onMethodChange`, `onSubmitCode`, `onRegenerateQr`.
  - `LoginAside`: dados estáticos de benefícios/segurança e `aria-live` para alertas de confiança.
- O fluxo de eventos (`handleSubmit`, `handleTwoFactorSubmit`, `handleEntraLogin`) se mantém dentro de `LoginPage`, com toasts/alerts existentes sendo aproveitados para mostrar erros de backend.
- Nova camada CSS usa classes (`login-hero`, `login-card`, `login-aside`) e variáveis de tema (`--login-bg`, `--login-gradient`, `--login-button-gradient-start`, `--login-button-gradient-end`, `--login-card-blur`, `--login-shadow`) definidas em `:root`/theme global para evitar conflitos.

## Acessibilidade e testes
- Garantir contraste (textos principais ≥ 4.5:1) mesmo com vidro translúcido; cartões laterais mantêm contraste ≥ 3:1 sobre o gradiente.
- Keyboard: inputs, botões, links e cards laterais (`data-testid="trust-card"`) seguem tab order natural; alertas usam `aria-live="assertive"` com outline azul suave ao focar.
- Testes:
  1. **Unitário**: com Vitest validar `LoginCredentialsForm`, `LoginCaptcha` e `LoginTwoFactorPanel` (erro exibido, `onSubmit` acionado, botão “Enviar” bloqueado durante `loading`, `onRegenerateQr` chamado).
  2. **E2E**: atualizar `e2e/login.spec.ts` para os seletores novos, mockar captcha e 2FA (QR + código manual), testar login Entra, gerar QR, simular erro de código e navegar via Tab+Enter garantindo mensagens de erro lidas por `aria-live`.
  3. **Visual regression**: capturar screenshots desktop/mobile para card principal e coluna lateral e comparar saturação gradiente/vidro, com especial atenção em <768px.
  4. **Contraste**: script manual ou `npx axe --tags wcag2aa` para confirmar `font-color` vs `--login-card-bg` ≥ 4.5:1 e `text-aside` ≥ 3:1.

- Documentação: registrar variáveis de tema (`--login-bg`, `--login-gradient`, `--login-button-gradient-start`, `--login-button-gradient-end`, `--login-card-blur`, `--login-shadow`) e explicar como `login.css` é importado em `src/app/styles.css`.

## Entrega
- Atualizar `src/features/login/LoginPage.tsx` e subcomponentes (`components/`) com o novo layout/categoria `login-theme`.
- Criar estilos em `src/features/login/login.css` (ou similar) usando variáveis definidas na raiz (`:root`).
- Documentar o novo estilo em `docs/design/login-redesign.md` (ou similar) se o time desejar.
