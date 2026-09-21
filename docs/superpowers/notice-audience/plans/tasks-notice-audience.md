# Tarefas: Público-alvo do aviso administrativo

**Spec:** `../specs/notice-audience-design.md`
**PRD:** `../prd/prd-notice-audience.md`

**Tech Stack:** node (`package.json`, monorepo pnpm/Turborepo) · backend Fastify 5 + Inversify + Prisma + Zod 4 (`apps/backend`) · frontend Next.js 16 / React 19 + Tailwind 4 + TanStack Query + react-hook-form/Zod (`apps/frontend`) · test runner Vitest (backend unit `npx vitest --run --config ./test/vite.config.app-domain.ts <arquivo>`, business-flow `npx vitest run --config ./test/vite.config.business-flow.ts <arquivo>`, integração Prisma `npx vitest run --config ./test/vite.config.integration.ts <arquivo>`, todos a partir de `apps/backend`; frontend `pnpm exec vitest run <arquivo>` a partir de `apps/frontend`)

---

## Tarefas

- [x] 1. Value object NoticeAudience no domínio de notificação [FR-015] → `task-01.md`
- [x] 2. Porta ActiveRecipientsProvider e provider in-memory filtram por público [FR-007, FR-008, FR-009, FR-011] → `task-02.md`
- [x] 3. Provider Prisma filtra destinatários por papel [FR-007, FR-008, FR-009, FR-011] → `task-03.md`
- [x] 4. Caso de uso repassa o público e trata público sem usuários [FR-010, FR-012, FR-013] → `task-04.md`
- [x] 5. Controller aceita audience opcional com padrão ALL e recusa valor inválido [FR-015, FR-016] → `task-05.md`
- [x] 6. Fluxo de negócio do broadcast por público e acesso restrito [FR-007, FR-008, FR-009, FR-010, FR-012, FR-017] → `task-06.md`
- [x] 7. Tipos regenerados, schema e hook do frontend enviam o público [FR-002, FR-005] → `task-07.md`
- [x] 8. AudienceSelector em cartões de rádio acessíveis [FR-001, FR-002, FR-003, FR-004] → `task-08.md`
- [x] 9. Pré-visualização mostra o público e subtítulo da página [FR-014] → `task-09.md`
- [x] 10. NoticeForm integra o seletor, o envio e o reset [FR-001, FR-005, FR-006] → `task-10.md`
- [x] 11. Adendo de documentação em admin-notice-broadcast [FR-012] → `task-11.md`

## Ondas de Execução

- **Wave 1** (parallel): 1, 11
- **Wave 2** (sequential): 2
- **Wave 3** (parallel): 3, 4
- **Wave 4** (sequential): 5
- **Wave 5** (parallel): 6, 7
- **Wave 6** (parallel): 8, 9
- **Wave 7** (sequential): 10

## Restrições Globais

- Valores do público: `ALL`, `MEMBERS`, `ADMINS` (spec, "Componentes")
- `audience: z.enum(["ALL","MEMBERS","ADMINS"]).default("ALL")` no body do broadcast; valor inválido responde 400; a resposta continua `{ recipients }` (spec, "Componentes")
- O `NoticeAudience` vive no domínio `notification` e não conhece `Role`; a tradução audiência para papel vive só na implementação Prisma (spec, D1)
- Rótulos no frontend: `ALL` = "Todos", `MEMBERS` = "Alunos", `ADMINS` = "Administradores" (spec, "Componentes")
- `audience` não é persistido: sem coluna nem tabela nova (spec, D3)
- Fan-out síncrono em blocos de 500, `saveMany` e publicação em `notificationCreated` permanecem como estão (spec, "Componentes")
- O remetente não recebe tratamento especial: recebe o aviso somente se a audiência incluir administradores (spec, "Fluxo de Dados")
- Interfaces TypeScript sem prefixo `I`; contexto `notification` não pode depender do contexto `user` (`pnpm --filter backend fit:validate-dependencies` sem violação) (spec, "Características Arquiteturais")

## Foco de Revisão

- Público sem nenhum usuário ativo (por exemplo, só Administradores e nenhum admin ativo) → envio conclui com 0 destinatários, sem erro e sem notificação criada → `task-04`
- Usuário suspenso, bloqueado ou removido com o papel do público escolhido → não recebe o aviso → `task-03`
- `audience` em minúsculas, string vazia ou `null` no body → 400 e nenhuma notificação criada → `task-05`
- Trocar o público depois de digitar título e mensagem → texto digitado é preservado → `task-10`
