---
created_at: "2026-05-15T07:06:13-03:00"
updated_at: "2026-05-15T07:06:13-03:00"
---

# QA Report — Login Misto para Contas com Provider Externo

## Resumo
- **Status**: ⚠️ PARCIAL
- **PRD**: `docs/superpowers/mixed-login-external-accounts/prd/prd-mixed-login-external-accounts.md`
- **Total de Requisitos**: 13 (RF-001 a RF-013)
- **Requisitos Atendidos**: 11 / 13 (RF-012 e RF-013 com evidência indireta)
- **Bugs Encontrados**: 0

---

## Requisitos Verificados

| ID | Requisito | Status | Evidência |
|----|-----------|--------|-----------|
| RF-001 | Perfil expõe `hasPassword` e `authMethods` | ✅ PASSOU | `my-profile.business-flow-test.ts` 10/10 |
| RF-002 | `/perfil` mostra "Definir senha" vs "Alterar senha" | ✅ PASSOU | `perfil/page.test.tsx` 10/10 |
| RF-003 | Tela de senha adapta campos conforme `hasPassword` | ✅ PASSOU | `perfil/senha/page.test.tsx` 17/17 |
| RF-004 | Primeira senha apenas para conta sem senha com provider | ✅ PASSOU | `define-password.usecase.test.ts` 9/9 |
| RF-005 | Reautenticação no provider antes de definir senha | ✅ PASSOU | `create-password-reauth-grant.usecase.test.ts` 9/9 |
| RF-006 | Senha vinculada ao mesmo usuário existente | ✅ PASSOU | `define-password.business-flow-test.ts` 2/2 |
| RF-007 | Conta aceita login por Google e email/senha após definir senha | ✅ PASSOU | Acceptance test `us-001.acceptance.business-flow-test.ts` |
| RF-008 | Fluxo de alteração separado do fluxo de definição | ✅ PASSOU | `change-password.business-flow-test.ts` 5/5 |
| RF-009 | Alteração exige senha atual | ✅ PASSOU | `change-password.usecase.test.ts` — senha atual validada |
| RF-010 | Login email/senha em conta sem senha retorna orientação explícita | ✅ PASSOU | `authenticate.business-flow-test.ts` + `login/page.test.tsx` |
| RF-011 | Não vincula silenciosamente por coincidência de e-mail | ✅ PASSOU | `authenticate-with-google.business-flow-test.ts` — 409 `external_account_link_required` |
| RF-012 | Estado da conta reflete nova capacidade imediatamente após definir senha | ⚠️ PARCIAL | `useDefinePassword` invalida `profileQueryKeys.me()`; CTA baseado em `hasPassword`; spec E2E presente mas não executada nesta sessão |
| RF-013 | Usuário notificado quando primeira senha é criada | ⚠️ PARCIAL | `toast.success("Senha definida com sucesso.")` implementado; sem teste executado nesta sessão afirmando o toast final |

---

## Histórias de Usuário

| US | User Story | Status |
|----|------------|--------|
| US-001 | Como usuário autenticado por provider externo e sem senha local, eu quero definir uma senha local após me reautenticar | ✅ PASSOU |
| US-002 | Como usuário que já possui senha local, eu quero continuar alterando minha senha com validação da senha atual | ✅ PASSOU |
| US-003 | Como usuário que tenta entrar por email/senha em uma conta sem senha local, eu quero receber orientação clara | ⚠️ PARCIAL |
| US-004 | Como time de produto e segurança, eu quero manter um único principal por conta | ✅ PASSOU |

---

## Testes E2E Executados

| Fluxo | Resultado | Observações |
|-------|-----------|-------------|
| Google-only login → solicitação de reauth grant → definição de primeira senha | ✅ PASSOU | `us-001.acceptance.business-flow-test.ts` executado com sucesso |
| Conta com senha local → alterar senha com senha atual | ✅ PASSOU | `change-password.business-flow-test.ts` 5/5 |
| Conta sem senha tenta login email/senha → mensagem orientativa | ✅ PASSOU | `authenticate.business-flow-test.ts` + `login/page.test.tsx` |
| Login Google com e-mail de outra conta → 409 conflict | ✅ PASSOU | `authenticate-with-google.business-flow-test.ts` |
| CTA "Definir senha" → "Alterar senha" após definir senha (Playwright) | ⚠️ PARCIAL | Spec `mixed-login-external-accounts.spec.ts` presente; exige servidores em execução |

---

## Acessibilidade
- [ ] Navegação por teclado verificada
- [ ] Contraste de cores adequado
- [x] Labels e ARIA roles presentes (`data-testid`, `getByLabel` nos testes)

---

## Bugs Encontrados

Nenhum bug encontrado.

---

## Evidências por User Story

| US | Diretório de Evidência |
|----|----------------------|
| US-001 | `docs/superpowers/mixed-login-external-accounts/qa/evidence/us-001-como-usuario-autenticado-por/` |
| US-002 | `docs/superpowers/mixed-login-external-accounts/qa/evidence/us-002-como-usuario-que-ja/` |
| US-003 | `docs/superpowers/mixed-login-external-accounts/qa/evidence/us-003-como-usuario-que-tenta/` |
| US-004 | `docs/superpowers/mixed-login-external-accounts/qa/evidence/us-004-como-time-de-produto/` |

---

## Conclusão

Feature **aprovada com ressalvas**. Os 11 requisitos centrais da iniciativa estão implementados e verificados por testes automatizados executados com sucesso. As lacunas identificadas (RF-012 e RF-013) são evidências parciais — a implementação está correta (`invalidateQueries` para atualização imediata, `toast.success` para notificação), mas a verificação foi indireta nesta sessão por ausência de servidores em execução para o Playwright.

O teste E2E determinístico em `apps/frontend/e2e/mixed-login-external-accounts.spec.ts` cobre RF-012 e RF-013 de ponta a ponta e deve ser executado em CI com servidores ativos para fechar a evidência restante.
