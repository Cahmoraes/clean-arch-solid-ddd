---
created_at: "2026-05-09T10:14:02-03:00"
updated_at: "2026-05-09T10:14:02-03:00"
---

# PRD: Google Social Login

## Visão Geral

Usuários da aplicação precisam de uma forma rápida e segura de se cadastrar e fazer login sem precisar criar e memorizar uma senha. A funcionalidade de login com Google elimina essa fricção ao permitir que qualquer usuário autentique com sua conta Google existente, aproveitando a infraestrutura de segurança do Google. O backend recebe um ID Token emitido pelo Google, valida sua autenticidade, resolve ou cria o usuário correspondente, e emite os tokens JWT próprios da aplicação — mantendo o fluxo de sessão idêntico ao login tradicional.

---

## Objetivos

- Usuários podem se autenticar via Google sem criar uma senha
- Contas existentes (criadas via email/senha) são automaticamente vinculadas quando o email Google coincide
- Nenhuma conta duplicada é criada para o mesmo email
- O fluxo de sessão pós-login (JWT + refresh token) é idêntico ao login tradicional
- A autenticação tradicional por email/senha permanece 100% funcional e inalterada

---

## Histórias de Usuário

**US-001 — Novo usuário cadastrando-se via Google**
> Como visitante sem conta, eu quero clicar em "Entrar com Google" e ter minha conta criada automaticamente para que eu não precise preencher um formulário de cadastro.

**US-002 — Usuário existente (Google) fazendo login**
> Como usuário que já me autentiquei com Google anteriormente, eu quero clicar em "Entrar com Google" e acessar minha conta imediatamente para que o login seja rápido e sem fricção.

**US-003 — Usuário existente (email/senha) usando Google pela primeira vez**
> Como usuário que criei minha conta com email e senha, eu quero poder fazer login com meu Google (que usa o mesmo email) para que minha conta existente seja reconhecida e eu não tenha uma conta duplicada.

**US-004 — Tentativa com email Google não verificado**
> Como usuário com conta Google de email não verificado, quando tento fazer login com Google, eu quero receber uma mensagem clara de erro para que eu entenda por que o login falhou.

**US-005 — Tentativa com token inválido**
> Como sistema que recebe um token malformado ou expirado, eu quero rejeitar a solicitação com um erro 401 claro para que tentativas inválidas sejam descartadas com segurança.

---

## Funcionalidades Principais

### F-001 — Endpoint de autenticação Google

Um novo endpoint recebe o ID Token emitido pelo Google Identity Services no frontend, valida sua autenticidade com os servidores do Google, e responde com os tokens de sessão da aplicação.

**Requisitos funcionais:**

- **RF-001** — O endpoint aceita `POST /sessions/google` com body `{ idToken: string }`
- **RF-002** — O endpoint retorna `{ token: string, refreshToken: string }` com status 200 em caso de sucesso
- **RF-003** — O endpoint retorna status 401 quando o `idToken` é inválido, malformado ou expirado
- **RF-004** — O endpoint retorna status 422 quando o email da conta Google não está verificado
- **RF-005** — O endpoint é público (não requer autenticação prévia)
- **RF-006** — O token de acesso emitido é aceito por todas as rotas protegidas existentes

### F-002 — Resolução de usuário

A lógica de resolução determina se o usuário já existe ou deve ser criado, garantindo que não haja contas duplicadas.

**Requisitos funcionais:**

- **RF-007** — Se um usuário com o mesmo `google_id` já existe, o login é realizado diretamente (retorno imediato de tokens)
- **RF-008** — Se um usuário com o mesmo email existe e o email do Google está verificado (`email_verified: true`), o `google_id` é vinculado a essa conta e o login é realizado
- **RF-009** — Se nenhum usuário corresponde, uma nova conta é criada com nome e email vindos do Google, sem senha
- **RF-010** — A vinculação automática por email só ocorre quando `email_verified: true` no payload Google
- **RF-011** — O `google_id` (`sub` do Google) é armazenado como identificador único do provedor na conta do usuário

### F-003 — Integridade de método de autenticação

A criação de usuários garante que toda conta tenha ao menos um método de autenticação válido.

**Requisitos funcionais:**

- **RF-012** — Um usuário criado via Google pode não ter senha (campo `password_hash` nulo)
- **RF-013** — Um usuário criado via email/senha nunca terá `password_hash` nulo
- **RF-014** — Não é possível criar uma conta sem senha E sem `google_id`
- **RF-015** — O cadastro tradicional via `POST /users` continua exigindo senha obrigatoriamente

---

## Experiência do Usuário

O fluxo completo do ponto de vista do usuário:

1. O usuário clica no botão "Entrar com Google" na interface do frontend
2. O Google Identity Services abre o seletor de conta Google (popup ou redirect — responsabilidade do frontend)
3. O usuário seleciona ou confirma sua conta Google
4. O frontend recebe o ID Token do Google e envia ao backend via `POST /sessions/google`
5. O backend responde com `token` e `refreshToken`
6. O frontend armazena os tokens e redireciona o usuário para a área autenticada

O fluxo pós-login é **idêntico ao login tradicional** — o usuário não percebe diferença após a autenticação.

---

## Restrições Técnicas de Alto Nível

- A validação do ID Token deve ocorrer **no backend**, nunca apenas no frontend
- O `google_id` (campo `sub` do payload Google) é o identificador primário para vinculação — o email é apenas secundário
- A vinculação automática por email exige `email_verified: true` — emails não verificados não são vinculados automaticamente
- Os tokens JWT emitidos pelo backend seguem o mesmo padrão, expiração e estrutura dos tokens do login tradicional
- A variável de ambiente `GOOGLE_CLIENT_ID` deve ser configurada no servidor — sem ela, o serviço não pode validar tokens
- Nenhum token do Google (access token, refresh token) é armazenado ou utilizado além da validação do ID Token

---

## Fora de Escopo

- Outros provedores OAuth (GitHub, Facebook, Apple, etc.)
- Fluxo de vinculação manual de conta Google via página de configurações do usuário
- Remoção ou desvinculação de conta Google
- Fluxo para usuários Google-only definirem uma senha
- Implementação do botão/widget Google no frontend
- Acesso a APIs do Google em nome do usuário (Google Drive, Gmail, Calendar, etc.)
- Multi-factor authentication combinado com login Google
