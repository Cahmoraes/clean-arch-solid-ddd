---
created_at: "2026-05-17T18:31:18-03:00"
updated_at: "2026-05-17T18:31:18-03:00"
---

# QA Report — Recuperação de Senha Esquecida

## Resumo

- **Status**: ✅ APROVADO
- **PRD**: `docs/superpowers/forgot-password/prd/prd-forgot-password.md`
- **Total de Requisitos**: 23 (RF-001..RF-023)
- **Requisitos Atendidos**: 23 / 23
- **Bugs Encontrados**: 1 (corrigido — RF-022)

---

## Requisitos Verificados

| ID | Requisito | Status | Evidência |
|----|-----------|--------|-----------|
| RF-001 | POST /password/forgot aceita e-mail | ✅ PASSOU | `evidence/us-001-.../result.json` |
| RF-002 | Sempre 200 OK com mensagem genérica | ✅ PASSOU | `evidence/us-001-.../result.json` |
| RF-003 | Token CSPRNG 256-bit gerado e enviado por e-mail | ✅ PASSOU | `evidence/us-002-.../result.json` |
| RF-004 | Tokens anteriores invalidados ao gerar novo | ✅ PASSOU | `evidence/us-001-.../result.json` |
| RF-005 | Token expira em 15 min (TTL 900s) | ✅ PASSOU | `evidence/us-002-.../result.json` |
| RF-006 | Rate limit por IP (5/15min) e e-mail (3/1h, best-effort) | ✅ PASSOU | `evidence/us-001-.../result.json` |
| RF-007 | 429 quando limite de IP excedido | ✅ PASSOU | `evidence/us-001-.../result.json` |
| RF-008 | POST /password/reset aceita { token, newPassword } | ✅ PASSOU | `evidence/us-003-.../result.json` |
| RF-009 | Token inválido/expirado → 400 | ✅ PASSOU | `evidence/us-003-.../result.json` |
| RF-010 | Token de uso único invalidado imediatamente após uso | ✅ PASSOU | `evidence/us-003-.../result.json` |
| RF-011 | Nova senha sujeita às regras de validação (≥8 chars) | ✅ PASSOU | `evidence/us-003-.../result.json` |
| RF-012 | Todas as sessões JWT revogadas após reset | ✅ PASSOU | `evidence/us-004-.../result.json` |
| RF-013 | E-mail de alerta enviado após reset bem-sucedido | ✅ PASSOU | `evidence/us-005-.../result.json` |
| RF-014 | E-mail contém nome, link de reset e aviso de 15 min | ✅ PASSOU | `evidence/us-002-.../result.json` |
| RF-015 | E-mail contém aviso "Se você não solicitou..." | ✅ PASSOU | `evidence/us-002-.../result.json` |
| RF-016 | E-mail em HTML via @react-email/components | ✅ PASSOU | `evidence/us-002-.../result.json` |
| RF-017 | Página /recuperar-senha com formulário de e-mail | ✅ PASSOU | `evidence/us-006-.../result.json` |
| RF-018 | Após submit, mensagem genérica (sem revelar existência) | ✅ PASSOU | `evidence/us-006-.../result.json` |
| RF-019 | Página /redefinir-senha com campos nova senha + confirmação | ✅ PASSOU | `evidence/us-006-.../result.json` |
| RF-020 | Validação client-side que senhas coincidem | ✅ PASSOU | `evidence/us-006-.../result.json` |
| RF-021 | Redirect para /login após 3s em caso de sucesso | ✅ PASSOU | `evidence/us-006-.../result.json` |
| RF-022 | Token inválido/expirado exibe mensagem com link para /recuperar-senha | ✅ PASSOU | `evidence/us-006-.../result.json` (corrigido em commit `80818dd`) |
| RF-023 | Página de login tem link "Esqueceu sua senha?" | ✅ PASSOU | `evidence/us-006-.../result.json` |

---

## Histórias de Usuário Verificadas

| ID | História | Status | Testes |
|----|----------|--------|--------|
| US-001 | Solicitar link de recuperação via e-mail | ✅ PASSOU | 6+3+4 testes existentes |
| US-002 | Receber e-mail com link seguro de reset | ✅ PASSOU | 6+3+4 testes + inspeção de template |
| US-003 | Redefinir senha via link recebido por e-mail | ✅ PASSOU | 5+4 testes + acceptance test RF-011 |
| US-004 | Sessões encerradas após reset | ✅ PASSOU | Teste unitário + business-flow |
| US-005 | Notificação por e-mail de alteração de senha | ✅ PASSOU | 29 testes + 2 acceptance tests |
| US-006 | Resposta genérica independente do e-mail (anti-enumeração) | ✅ PASSOU | 3+279 testes + inspeção de código |

---

## Testes E2E Executados

| Fluxo | Resultado | Observações |
|-------|-----------|-------------|
| POST /password/forgot — e-mail inexistente retorna 200 | ✅ PASSOU | anti-enumeração verificada |
| POST /password/forgot — e-mail válido gera token no store | ✅ PASSOU | tokenHash salvo no InMemoryStore |
| POST /password/forgot — 6ª req do mesmo IP retorna 429 | ✅ PASSOU | rate limit por IP via @fastify/rate-limit |
| POST /password/reset — token válido → 204 + senha atualizada | ✅ PASSOU | bcrypt hash verificado |
| POST /password/reset — token inválido → 400 | ✅ PASSOU | InvalidResetTokenError mapeado |
| POST /password/reset — uso único → 2ª tentativa 400 | ✅ PASSOU | token deletado antes do update |
| Fluxo completo: reset → login com nova senha | ✅ PASSOU | HTTP login verificado |
| Login com senha antiga falha após reset | ✅ PASSOU | bcrypt rejeita senha antiga |

---

## Acessibilidade
- [ ] Navegação por teclado verificada
- [ ] Contraste de cores adequado
- [x] Labels e ARIA roles presentes (`aria-busy`, `data-testid`, `autoComplete`)

---

## Bugs Encontrados e Corrigidos

| ID | Descrição | Severidade | Commit |
|----|-----------|------------|--------|
| BUG-01 | RF-022: token expirado/inválido da API exibia apenas toast temporário, sem link persistente para /recuperar-senha | Média | `80818dd` |

---

## Fora de Escopo (não verificado)

- MFA/autenticação multifator
- Reset por SMS
- Auto-login após reset
- Histórico de senhas
- Página de administração

---

## Conclusão

Feature **aprovada para merge**. Todos os 23 requisitos funcionais foram implementados e verificados. O único bug encontrado (RF-022) foi corrigido durante o próprio ciclo de QA (commit `80818dd`). A suíte de testes cobre os fluxos críticos: anti-enumeração, uso único de token, revogação de sessões e fluxo HTTP completo de reset.
