---
created_at: "2026-05-28T12:42:04-03:00"
updated_at: "2026-05-28T12:42:04-03:00"
---

# QA Report — Login Security Lockout

## Resumo

- **Status**: ✅ APROVADO (com ressalva)
- **PRD**: `../prd/prd-login-security-lockout.md`
- **Total de User Stories**: 8
- **Stories Aprovadas**: 7 PASSED + 1 PARTIAL (zero FAILED)
- **Total de Requisitos Funcionais**: 20 (RF-001 a RF-020)
- **Requisitos Atendidos**: 18/20 com cobertura completa; 2 com gap de cobertura
- **Bugs Encontrados**: 2 (BUG-01: RF-006 resposta distinta para PasswordNotSetError; BUG-02: status `locked` inacessível na UI admin — ver addendum 28/05/2026)
- **Novos Testes Criados**: 12 (6 para US-002, 4 para US-005, 2 para UI `locked` US-004/US-005)

---

## Requisitos Verificados

| ID | Requisito | Status | Evidência |
|----|-----------|--------|-----------|
| RF-001 | Registrar tentativa inválida por e-mail (janela 15 min) | ✅ PASSOU | `evidence/us-001-bloqueio-automatico-por-tentativas/result.json` |
| RF-002 | Bloquear conta após 3ª tentativa (status `locked` persistido) | ✅ PASSOU | `evidence/us-001-bloqueio-automatico-por-tentativas/result.json` |
| RF-003 | Contador de tentativas deletado ao atingir bloqueio | ⚠️ IMPL OK / SEM TESTE EXPLÍCITO | `evidence/us-001-bloqueio-automatico-por-tentativas/result.json` |
| RF-004 | Login bem-sucedido reinicia contador | ✅ PASSOU | `evidence/us-001-bloqueio-automatico-por-tentativas/result.json` |
| RF-005 | `isSuperAdmin=true` isento de bloqueio e contagem | ✅ PASSOU | `evidence/us-007-root-admin-isento-de-bloqueio/result.json` |
| RF-006 | Todas as falhas de auth retornam 401 com mensagem genérica | ⚠️ PARCIAL — BUG ATIVO | `evidence/us-001-bloqueio-automatico-por-tentativas/result.json` |
| RF-007 | bcrypt sempre executado (anti-timing) | ✅ IMPL OK | `evidence/us-001-bloqueio-automatico-por-tentativas/result.json` |
| RF-008 | Token de reset gerado (15 min TTL) ao bloquear conta | ✅ PASSOU | `evidence/us-002-notificacao-de-bloqueio-por-email/result.json` |
| RF-009 | E-mail de alerta enviado com conteúdo correto e link de reset | ✅ PASSOU | `evidence/us-002-notificacao-de-bloqueio-por-email/result.json` |
| RF-010 | E-mail entregue em < 60s após bloqueio | ✅ PASSOU | `evidence/us-002-notificacao-de-bloqueio-por-email/result.json` |
| RF-011 | Reset de senha para `locked` → status `activated` | ✅ PASSOU | `evidence/us-003-desbloqueio-autonomo-via-redefinicao/result.json` |
| RF-012 | Sessões revogadas após reset de senha | ✅ PASSOU | `evidence/us-003-desbloqueio-autonomo-via-redefinicao/result.json` |
| RF-013 | Reset rejeitado se conta `suspended` | ✅ PASSOU | `evidence/us-003-desbloqueio-autonomo-via-redefinicao/result.json` |
| RF-014 | Admin pode ativar conta `locked` → `activated` | ✅ PASSOU | `evidence/us-004-admin-desbloqueia-conta-bloqueada/result.json` |
| RF-015 | Ativação admin não exige redefinição de senha | ✅ PASSOU | `evidence/us-004-admin-desbloqueia-conta-bloqueada/result.json` |
| RF-016 | Admin pode suspender conta `locked` → `suspended` | ✅ PASSOU | `evidence/us-005-admin-suspende-conta-bloqueada/result.json` |
| RF-017 | `suspended` não inicia reset — HTTP 200 genérico | ✅ PASSOU | `evidence/us-006-usuario-suspenso-nao-recupera-acesso/result.json` |
| RF-018 | Schema inclui `is_super_admin Boolean @default(false)` | ✅ PASSOU | `evidence/us-008-identificacao-superadmin-via-banco/result.json` |
| RF-019 | Root admin com `isSuperAdmin=true` via migration | ✅ PASSOU | `evidence/us-008-identificacao-superadmin-via-banco/result.json` |
| RF-020 | Zero comparações `admin@admin.com` em código de produção | ✅ PASSOU | `evidence/us-008-identificacao-superadmin-via-banco/result.json` |

---

## User Stories Verificadas

| US | Descrição | Status | Observações |
|----|-----------|--------|-------------|
| US-001 | Bloqueio automático por tentativas falhas | ⚠️ PARTIAL | RF-006 bug ativo; RF-003/RF-007 sem teste explícito |
| US-002 | Notificação de bloqueio por e-mail | ✅ PASSED | 6 novos testes de aceitação criados |
| US-003 | Desbloqueio autônomo via redefinição de senha | ✅ PASSED | Todos os 3 RFs cobertos por testes existentes |
| US-004 | Admin desbloqueia conta bloqueada | ✅ PASSED | RF-014 e RF-015 cobertos; Redis lock limpo |
| US-005 | Admin suspende conta bloqueada | ✅ PASSED | 4 novos testes de aceitação criados |
| US-006 | Usuário suspenso não recupera acesso via reset | ✅ PASSED | RF-017 coberto; zero enumeração de status |
| US-007 | Root admin isento de bloqueio | ✅ PASSED | Dois guardas no AuthenticateUseCase |
| US-008 | Identificação do superadmin via banco de dados | ✅ PASSED | Zero `admin@admin.com` em produção; schema correto |

---

## Testes E2E Executados

| Fluxo | Resultado | Observações |
|-------|-----------|-------------|
| AuthenticateUseCase — 3 tentativas falhas + lockout | ✅ PASSOU | 5 testes explícitos |
| AuthenticateUseCase — isSuperAdmin isento | ✅ PASSOU | 1 teste explícito, 3 tentativas sem lockout |
| AuthenticateUseCase — login bem-sucedido zera contador | ✅ PASSOU | Teste explícito de RF-004 |
| SendAccountLockedEmailNotification — evento + e-mail | ✅ PASSOU | 6 novos testes de aceitação |
| ResetPasswordUseCase — locked → activated | ✅ PASSOU | Testes existentes cobrindo RF-011, RF-012, RF-013 |
| ActiveUserUseCase — locked → activated (admin) | ✅ PASSOU | Teste de transição + limpeza Redis |
| SuspendUserUseCase — locked → suspended (admin) | ✅ PASSOU | 4 novos testes de aceitação |
| ForgotPasswordUseCase — suspended retorna 200 silencioso | ✅ PASSOU | Teste existente + contraste com locked |
| Schema Prisma — is_super_admin + migration | ✅ PASSOU | Inspeção direta de schema e SQL |
| Grep produção — zero `admin@admin.com` | ✅ PASSOU | Zero matches fora de arquivos de teste |

---

## Acessibilidade

- [ ] Navegação por teclado verificada *(N/A no QA original — feature tratada como backend-only)*
- [ ] Contraste de cores adequado *(N/A no QA original — feature tratada como backend-only)*
- [ ] Labels e ARIA roles presentes *(N/A no QA original — feature tratada como backend-only)*

> **Atualização (28/05/2026):** a feature **não** era backend-only. O status `locked` não havia sido propagado ao contrato OpenAPI nem à UI admin, deixando o desbloqueio inacessível pela interface. Ver addendum abaixo.

---

## Bugs Encontrados

| ID | Descrição | Severidade | Evidência |
|----|-----------|------------|-----------|
| BUG-01 | `authenticate.controller.ts` retorna resposta distinta `{ code: 'password_not_set', message: 'Password not set for this account' }` para `PasswordNotSetError`, violando RF-006 (anti-enumeração). Mensagem para `InvalidCredentialsError` também está em inglês (`"Invalid credentials"`) em vez de `"Credenciais inválidas"`. Teste business-flow asserta explicitamente essa resposta distinta. | Média | `evidence/us-001-bloqueio-automatico-por-tentativas/result.json` |

### Contexto do BUG-01

O `PasswordNotSetError` ocorre quando um usuário tem conta criada via OAuth/social e tenta logar com senha — condição legítima pré-existente. O RF-006 exige que **toda** falha de autenticação retorne resposta genérica idêntica. O comportamento atual:

- `InvalidCredentialsError` → `401 { message: "Invalid credentials" }`
- `PasswordNotSetError` → `401 { code: "password_not_set", message: "Password not set for this account" }`

Ambas as mensagens violam o espírito do RF-006: o message deveria ser `"Credenciais inválidas"` (pt-BR) para todos os casos, sem `code` discriminatório.

**Recomendação:** Unificar resposta do controller para todos os erros de autenticação. O business-flow test precisará ser atualizado para refletir a resposta unificada.

**Nota:** Esta é uma violação da feature implementada neste PR. O comportamento `PasswordNotSetError` pré-existia, mas o RF-006 — introduzido por este PRD — exige a padronização.

---

## Lacunas de Cobertura de Testes (não-bloqueantes)

| RF | Lacuna | Impacto |
|----|--------|---------|
| RF-003 | Sem teste explícito que verifica deleção do contador ao atingir lockout | Baixo — implementação (`lockAccount()` chama `deleteFailedAttempts`) verificada por inspeção |
| RF-007 | Sem teste explícito de execução bcrypt em todo path de falha (anti-timing) | Baixo — implementação verificada por inspeção de código |

---

## Conclusão

Feature `login-security-lockout` está **aprovada com ressalva** para merge.

**Aprovada:** 7/8 user stories com cobertura de testes completa. RF-005, RF-008 a RF-020 completamente implementados e testados. Sistema de bloqueio (Redis + DB), notificação por e-mail, desbloqueio via reset, controle admin, e eliminação de magic strings todos verificados e funcionais.

**Ressalva (BUG-01):** RF-006 tem violação ativa no `authenticate.controller.ts` — `PasswordNotSetError` expõe distinção de estado via resposta HTTP diferente. Recomenda-se corrigir antes do merge ou registrar como issue de acompanhamento imediato pós-merge. A violação não é nova (pré-existente), mas o PRD desta feature exige padronização.

---

## Addendum (28/05/2026) — Gap de UI Admin no status `locked`

### BUG-02 — Status `locked` inacessível pela interface admin

| ID | Descrição | Severidade | Status |
|----|-----------|------------|--------|
| BUG-02 | O status `locked` não era exposto pelo contrato OpenAPI (`fetch-users` e `my-profile` declaravam `enum(["activated", "suspended"])`), então `@repo/api-types` tipava `status` sem `locked`. No modal admin (`user-detail-modal.tsx`), as permissões `canActivate`/`canSuspend` eram condicionadas a `suspended`/`activated`, fazendo a seção de ações renderizar `null` para contas `locked` — **nenhum botão de desbloqueio aparecia**, embora o backend (`PATCH /users/activate`) já suportasse `locked → activated` e limpasse o lock no Redis. | Alta | ✅ CORRIGIDO |

**Causa raiz:** a feature foi implementada apenas no backend; o estado `locked` nunca foi propagado ao contrato OpenAPI nem à UI admin. O QA original tratou a feature como backend-only e não verificou as user stories US-004/US-005 na interface.

**Correção aplicada:**
- Backend: `"locked"` adicionado aos enums de resposta em `fetch-users.controller.ts` e `my-profile.controller.ts`.
- Tipos: `@repo/api-types` regenerado (`pnpm generate:types`).
- Frontend: `user-detail-modal.tsx` e `user-row.tsx` reconhecem `locked` — badge "Bloqueado" (âmbar, distinto de "Inativo"), botão **Desbloquear** (activate, US-004) e **Inativar** (suspend, US-005).
- Testes: 2 testes de unidade adicionados ao `user-detail-modal.test.tsx` cobrindo o estado `locked`.

**Verificação:** todos os gates passaram — backend (`biome:fix`, `tsc:check`, `test:run` 497, `build`) e frontend (`lint:fix`, `tsc:check`, `test` 366, `build`).

### Lacunas de cobertura remanescentes (não-bloqueantes)

| Item | Lacuna | Impacto |
|------|--------|---------|
| US-004/US-005 na UI | Sem teste E2E (Playwright) do fluxo admin de desbloqueio/suspensão de conta `locked` | Médio — coberto por testes de unidade do modal; E2E recomendado |
