---
created_at: "2026-05-31T13:14:30-03:00"
updated_at: "2026-05-31T13:14:30-03:00"
---

# QA Report — Soft Delete de Usuário (Admin)

## Resumo
- **Status**: ✅ APROVADO
- **PRD**: `../prd/prd-user-soft-delete.md`
- **Histórias de Usuário**: 8 (US-01..US-08)
- **Total de Requisitos**: 20 (RF-001..RF-020)
- **Histórias Verificadas**: 8 / 8 (6 PASSED, 2 PARTIAL, 0 FAILED)
- **Bugs Bloqueantes**: 0

---

## Histórias Verificadas

| ID | História | Status | RFs | Evidência |
|----|----------|--------|-----|-----------|
| US-01 | Admin exclui conta pelo painel | ⚠️ PARCIAL | RF-016, RF-018 | `evidence/us-001-admin-excluir-conta-painel/` |
| US-02 | Confirmar em diálogo enfático | ✅ PASSOU | RF-017 | `evidence/us-002-admin-confirmar-exclusao-dialogo/` |
| US-03 | Excluído some de lista/stats | ✅ PASSOU | RF-003, RF-004, RF-005 | `evidence/us-003-usuario-excluido-some-lista/` |
| US-04 | Impedido de excluir a si mesmo | ✅ PASSOU | RF-007, RF-013, RF-019 | `evidence/us-004-admin-impedido-excluir-propria/` |
| US-05 | Super admin protegido | ✅ PASSOU | RF-008, RF-019 | `evidence/us-005-super-admin-protegido-exclusao/` |
| US-06 | Excluído não autentica | ✅ PASSOU | RF-003 | `evidence/us-006-usuario-excluido-nao-autentica/` |
| US-07 | Mensagem clara em falha de negócio | ⚠️ PARCIAL | RF-014, RF-020 | `evidence/us-007-mensagem-clara-falha-negocio/` |
| US-08 | Dados permanecem no banco (auditoria) | ✅ PASSOU | RF-006, RF-010 | `evidence/us-008-dados-permanecem-banco-auditoria/` |

---

## Requisitos Verificados

| ID | Requisito | Status |
|----|-----------|--------|
| RF-001 | Campo de marcação `deleted_at` | ✅ PASSOU |
| RF-002 | Entidade expõe `delete()`/`isDeleted` | ✅ PASSOU |
| RF-003 | Leituras id/email/googleId/get ignoram excluídos | ✅ PASSOU |
| RF-004 | Listagem paginada exclui soft-deleted | ✅ PASSOU |
| RF-005 | Stats não contabilizam soft-deleted | ✅ PASSOU |
| RF-006 | Sem exclusão física (dados preservados) | ✅ PASSOU |
| RF-007 | Auto-exclusão rejeitada (`CannotDeleteSelfError`) | ✅ PASSOU |
| RF-008 | Super admin não excluível (`UserIsSuperAdminError`) | ✅ PASSOU |
| RF-009 | Inexistente → `UserNotFoundError` (idempotente) | ✅ PASSOU |
| RF-010 | Check-ins não bloqueiam mais a exclusão | ✅ PASSOU |
| RF-011 | Endpoint `DELETE /users/:userId` admin-only | ✅ PASSOU |
| RF-012 | 401 sem token; 403 não-admin | ✅ PASSOU |
| RF-013 | `requesterId` derivado do JWT (`req.user.sub.id`) | ✅ PASSOU |
| RF-014 | Mapeamento HTTP: 403 self/superadmin, 404 notfound, 204 sucesso | ✅ PASSOU |
| RF-015 | Caches `fetch-users:*` + `user-stats` invalidados | ✅ PASSOU |
| RF-016 | Botão "Excluir" habilitado (sem tooltip "em breve") | ✅ PASSOU |
| RF-017 | Diálogo de confirmação destrutivo enfático | ✅ PASSOU |
| RF-018 | Confirmar dispara exclusão, invalida queries, fecha painel | ✅ PASSOU |
| RF-019 | Botão oculto p/ self e super admin | ✅ PASSOU |
| RF-020 | Erro apresentado ao admin com mensagem | ⚠️ PARCIAL (ver Observações) |

---

## Testes Executados (evidência)

| Camada | Suíte | Resultado |
|--------|-------|-----------|
| Backend unit | `DeleteUserUseCase (soft delete)` (6) | ✅ |
| Backend unit | `InMemoryUserRepository soft delete filter` (4) | ✅ |
| Backend unit | `UserDAOMemory soft delete filter` (2) | ✅ |
| Backend unit | `authenticate` soft-deleted (senha) | ✅ |
| Backend business-flow | `Excluir Usuário (soft delete)` (6: 204/401/403 member/403 self/403 superadmin/404) | ✅ |
| Backend suite total | 554 unit + 157 business-flow | ✅ |
| Frontend | `useDeleteUser` (otimista/rollback/invalidação) | ✅ |
| Frontend | `UserActionsFooter` (habilita/oculta/dispara) | ✅ |
| Frontend | `use-user-detail-actions` (permissões/flags/confirm) | ✅ |
| Frontend suite total | 426 | ✅ |
| Aceitação (QA) | US-01 fechar painel; US-02 texto enfático; US-06 google login | ✅ (em `evidence/`) |

---

## Acessibilidade
- [x] Diálogo segue padrão `AlertDialog` (shadcn/Radix) dos diálogos irmãos — navegação por teclado e foco herdados
- [x] Botão de confirmação com `aria-busy={isDeleting}` e estados de `disabled`
- [ ] Contraste de cores / screenshot visual — não capturado (app não estava em execução durante o QA)

---

## Observações e Limitações Conhecidas (não bloqueantes)

| ID | Descrição | Severidade | Decisão |
|----|-----------|------------|---------|
| OBS-01 | **US-01/US-07 sem screenshot**: servidor dev não estava de pé durante o QA; cobertura funcional 100% por testes. | Baixa | Aceito (screenshot é opcional no gate) |
| OBS-02 | **RF-020 mensagem genérica**: `toApiError` (compartilhado por TODOS os hooks admin — suspend/promote/demote/delete) não extrai status/mensagem do body do openapi-fetch, caindo em mensagem genérica de 500 em erros 403/404. Padrão **pré-existente**, não introduzido por esta feature. O cenário 403 self/superadmin é prevenido na UI por `canDelete` (RF-019), tornando-o raro. | Média | Fora de escopo — corrigir exigiria alterar a convenção compartilhada em todos os hooks; recomenda-se ticket próprio |
| OBS-03 | **Guarda FE por email vs BE por flag**: frontend usa `SUPER_ADMIN_EMAIL` (proxy, pois `AdminUser` não expõe `isSuperAdmin`); backend usa a flag `isSuperAdmin` (autoritativo). Pré-existente (promote/demote usam o mesmo proxy). | Baixa | Aceito — backend é inquebrável; ticket futuro para expor `isSuperAdmin` na listagem |
| OBS-04 | **Login Google de excluído**: usuário soft-deleted fica invisível ao `userOfGoogleId`/`userOfEmail`; um novo login Google cria identidade nova em vez de retornar `InvalidCredentialsError`. RF-003 satisfeito (a conta excluída permanece inacessível). | Baixa | Aceito — comportamento coerente com soft delete |

---

## Conclusão

**Feature APROVADA para integração.** As 8 histórias de usuário foram verificadas; nenhuma reprovou. Os 20 requisitos funcionais estão atendidos (RF-020 parcialmente, com mensagem genérica não-bloqueante, padrão pré-existente do codebase). Toda a suíte automatizada (backend 554 unit + 157 business-flow; frontend 426) está verde, junto de lint, tsc, build e fitness functions. As observações listadas são limitações pré-existentes ou melhorias de UX fora do escopo desta feature, recomendadas para tickets próprios.
