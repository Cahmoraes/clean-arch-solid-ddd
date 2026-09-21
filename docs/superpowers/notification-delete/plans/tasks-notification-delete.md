# Tarefas: Exclusão de notificação no bell

**Spec:** `../specs/notification-delete-design.md`
**PRD:** `../prd/prd-notification-delete.md`

**Tech Stack:** node · Fastify + Inversify + Prisma (backend), Next.js + TanStack Query (frontend) · Vitest (backend: configs app-domain e business-flow; frontend: vitest.config.ts)

---

## Tarefas

- [ ] 1. Exclusão no domínio e no caso de uso [FR-004, FR-005, FR-006, FR-007] → `task-01.md`
- [ ] 2. Endpoint DELETE, IoC, OpenAPI e business-flow [FR-005, FR-006] → `task-02.md`
- [ ] 3. Mutation deleteNotification com cache otimista [FR-002, FR-003, FR-008, FR-009, FR-010] → `task-03.md`
- [ ] 4. Item do bell com botão de excluir [FR-001, FR-012, FR-013] → `task-04.md`
- [ ] 5. Fiação do dropdown e do bell e estado da lista após excluir [FR-001, FR-011] → `task-05.md`

## Restrições Globais

- Exclusão lógica em `UserNotification.deletedAt` via `DELETE /notifications/:id`; zero migration (spec, D1)
- `DELETE /api/v1/notifications/:id`, protegido, resposta 204. O OpenAPI descreve 204, 401 e 404 (spec, Estrutura de Componentes)
- 404 quando não encontrada, de outro usuário ou já excluída (spec, D1)
- Opção B escolhida: o botão de excluir aparece no hover ou foco da linha e ocupa o lugar da hora; em `@media (hover: none)` fica sempre visível (spec, Especificação Visual)
- Botão de 32px, ícone `Trash2` de 16px, `rounded-md`, hover em `bg-destructive-soft text-destructive` (spec, Especificação Visual)
- `opacity-60` das linhas lidas atinge só o botão principal, não o de excluir (spec, Especificação Visual)
- Sem desfazer, sem lixeira e sem confirmação (spec, Visão Geral)

## Foco de Revisão

- Excluir de novo uma notificação já excluída via API: 404, nunca 204 → `task-01`
- Clique duplo no botão: o segundo DELETE devolve 404 e o item não reaparece → `task-03`
- Item excluído ainda pendente de reaplicação do SSE não reaparece na lista → `task-03`
- Dispositivo touch: o botão de excluir fica visível sem hover → `task-04`
- Excluir a última notificação carregada com mais páginas disponíveis volta a buscar, e sem mais páginas mostra o estado vazio → `task-05`
