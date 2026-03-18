# Migração do Login Legado para React Design

**Objetivo**

Migrar completamente o módulo de login do legado Angular para o frontend React, preservando integralmente os fluxos operacionais do legado e mantendo a experiência visual alinhada ao padrão atual do `black101.frontend`.

## Escopo funcional

O módulo React deve cobrir:

- login tradicional com e-mail e senha;
- suporte ao fluxo moderno `/auth/*` com fallback para autenticação legado `/authentication/*`;
- captcha Cloudflare/Turnstile no login tradicional;
- login via Microsoft Entra reaproveitando a integração atual do React;
- autenticação em dois fatores legado com:
  - configuração inicial;
  - escolha entre Black101 Authenticator e Google Authenticator;
  - QR code inicial;
  - QR code expirável com regeneração;
  - entrada de código de 6 dígitos;
  - reset do autenticador por e-mail;
  - validação final do código;
- troca de token legado via `authentication/gettoken`;
- hidratação do contexto do usuário e da empresa após autenticação;
- preservação do redirecionamento pós-login.

## Princípios de implementação

- manter o `AuthContext` como fronteira de integração com backend e sessão;
- mover a orquestração de fluxo visual para a feature de login;
- preservar o visual React atual, sem tentar reproduzir o layout Angular;
- migrar fielmente as regras de negócio e as bifurcações do legado;
- tornar o fluxo testável por estados explícitos e componentes menores.

## Arquitetura proposta

### `AuthContext`

Permanece responsável por:

- login moderno;
- fallback legado;
- login via Entra;
- troca de token legado;
- refresh de contexto/autorização;
- chamadas de 2FA (`validateQrcode`, `generateQrCode`, `reset-totp`);
- atualização de contexto de empresa.

Também deve normalizar melhor o resultado do login para a UI.

### Feature `src/features/login/`

Organização proposta:

- `LoginPage.tsx`
  container principal do fluxo;
- `components/LoginCredentialsForm.tsx`
  credenciais, captcha e ações primárias;
- `components/LoginTwoFactorFlow.tsx`
  shell da etapa 2FA;
- `components/LoginTwoFactorMethodPicker.tsx`
  escolha entre autenticadores e reset por e-mail;
- `components/LoginTwoFactorQrPanel.tsx`
  QR code, instruções, timer e regeneração;
- `components/LoginTwoFactorCodeForm.tsx`
  entrada e validação visual do código;
- `utils/loginFlow.ts`
  tipos e helpers puros de estado/transição.

## Estados do fluxo

Estados mínimos:

- `credentials`
- `two_factor_method_selection`
- `two_factor_setup_qr`
- `two_factor_qr_login`
- `two_factor_code`

Sinais auxiliares:

- `loading`
- `error`
- `selectedTwoFactorType`
- `requiresTwoFactorSetup`
- `resetKey`
- `qrCode`
- `qrCodeExpired`

## Regras de negócio migradas do legado

### Login tradicional

- o formulário só pode submeter quando captcha estiver válido;
- falha no login mantém usuário na etapa de credenciais;
- o resultado do login pode autenticar imediatamente ou exigir 2FA.

### 2FA já configurado

- quando o backend exigir 2FA sem QR obrigatório, o usuário pode:
  - informar código do Black101 Authenticator;
  - informar código do Google Authenticator;
  - optar por reset do autenticador por e-mail;
- reset por e-mail deve usar `reset-totp` e passar `resetKey=true` na validação final.

### 2FA com setup

- quando `requiresTwoFactorSetup=true`, o usuário deve escolher o autenticador;
- ao escolher, o React chama `generateQrCode`;
- a tela mostra QR, instruções e a entrada do código;
- ao validar corretamente, o fluxo continua para autenticação final.

### QR code fornecido pelo backend

- quando o login legado já retornar `qrCode`, o usuário entra direto no modo QR;
- o QR deve expirar visualmente após o timer definido;
- QR expirado pode ser regenerado pela própria tela;
- o tipo selecionado de autenticador deve ser preservado.

### Microsoft Entra

- reaproveitar integração atual;
- alinhar o pós-autenticação com o mesmo pipeline de contexto/sessão do login tradicional;
- falhas devem retornar a interface para estado estável.

## Tratamento de erro

- captcha inválido bloqueia envio e informa o usuário;
- falha ao gerar ou regenerar QR não derruba o fluxo;
- falha no `reset-totp` mantém usuário no fluxo 2FA com erro explícito;
- código inválido mostra erro local e preserva o estado do método escolhido;
- falha no Entra reabilita a tela para nova tentativa;
- falha no refresh de contexto após autenticação invalida a sessão parcial.

## Estratégia de testes

### Unitários

- normalização do resultado de login;
- transições de estado do fluxo;
- timer/expiração do QR;
- payload da validação 2FA.

### Componente

- login tradicional com sucesso;
- login legado com setup 2FA;
- login legado com escolha de autenticador;
- reset por e-mail;
- regeneração de QR;
- fallback de erro no Entra.

### E2E

- login tradicional com captcha/mock válido;
- login legado com 2FA completo;
- login via Entra;
- fallback moderno para legado.

## Critério de pronto

A migração do login estará pronta quando:

- todos os fluxos do legado estiverem navegáveis no React;
- o `AuthContext` continuar compatível com autenticação moderna e legado;
- o fluxo de 2FA estiver funcional com setup, QR, código e reset por e-mail;
- o login via Entra permanecer operacional;
- houver cobertura mínima unitária, de componente e Playwright para os fluxos críticos.
