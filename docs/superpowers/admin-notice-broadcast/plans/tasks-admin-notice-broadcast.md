# Tarefas: Aviso administrativo em broadcast

**Spec:** `../specs/admin-notice-broadcast-design.md`
**PRD:** `../prd/prd-admin-notice-broadcast.md`

**Tech Stack:** TypeScript (node, `package.json`) · monorepo pnpm/Turborepo · backend Fastify + Prisma + InversifyJS, testes Vitest (`npx vitest --run --config ./test/vite.config.app-domain.ts <arquivo>`; business-flow `./test/vite.config.business-flow.ts`; Prisma `./test/vite.config.integration.ts`) · frontend Next.js + TanStack Query, testes Vitest + Testing Library + MSW (`pnpm vitest run <arquivo>` em `apps/frontend`)

---

## Tarefas

- [x] 1. Tipo NOTICE no domínio, Prisma e schema do GET [FR-006] → `task-01.md`
- [x] 2. Persistência em lote de notificações (saveMany) [FR-006] → `task-02.md`
- [x] 3. Provedor de destinatários ativos [FR-011, FR-012] → `task-03.md`
- [ ] 4. Caso de uso de broadcast do aviso [FR-006, FR-010, FR-012] → `task-04.md`
- [ ] 5. Endpoint POST de broadcast e tipos gerados [FR-001, FR-002, FR-003, FR-012] → `task-05.md`
- [ ] 6. Autorização do endpoint de broadcast [FR-016] → `task-06.md`
- [ ] 7. Aviso no sino com identificação própria [FR-006, FR-007, FR-008, FR-009] → `task-07.md`
- [ ] 8. Schema, mutation e handler MSW do aviso [FR-002, FR-003] → `task-08.md`
- [ ] 9. Pré-visualização do aviso [FR-013] → `task-09.md`
- [ ] 10. Formulário e página Novo aviso [FR-001, FR-003, FR-004, FR-005, FR-013] → `task-10.md`
- [x] 11. Item Novo aviso no menu de administração [FR-014] → `task-11.md`
- [ ] 12. Acesso restrito da página Novo aviso [FR-015] → `task-12.md`

## Foco de Revisão

- Título ou mensagem só com espaços em branco → recusado com 400, nunca cria aviso vazio → `task-05`
- Usuário `activated` removido (`deleted_at` preenchido) → não recebe o aviso → `task-03`
- Nenhum usuário ativo → 201 com `recipients: 0`, sem erro e sem publicar na fila → `task-04`
- Falha ao publicar na fila para alguns usuários → resposta de sucesso e notificações persistidas → `task-04`
- Mensagem com HTML ou script → exibida como texto na pré-visualização e no sino, sem executar → `task-09`

## Ondas de Execução

- **Wave 1** (parallel): 1, 2, 3, 11
- **Wave 2** (sequential): 4
- **Wave 3** (sequential): 5
- **Wave 4** (parallel): 6, 7, 8
- **Wave 5** (sequential): 9
- **Wave 6** (sequential): 10
- **Wave 7** (sequential): 12
