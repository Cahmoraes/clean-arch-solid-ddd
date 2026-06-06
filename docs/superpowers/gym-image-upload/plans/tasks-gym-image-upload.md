# Tarefas: Upload de Imagem de Academia

> **For agentic workers:** REQUIRED SUB-SKILL: Use super.subagent-driven-development (recommended, sequential), super.parallel-subagent-in-tree (parallel waves in the shared tree, no worktrees), or super.parallel-subagent-development (parallel waves in isolated worktrees — see the `## Ondas de Execução` section below) to implement tasks. Progress is tracked at the task level via the checkbox (`- [ ]`) list below — each task file contains the full implementation steps for its task.

**Spec:** `../specs/gym-image-upload-design.md`
**PRD:** `../prd/prd-gym-image-upload.md`

**Goal:** Permitir que admins associem uma imagem (com crop interativo) a cada academia no cadastro e numa nova tela de edição, armazenando os arquivos em um diretório do backend e exibindo-os nos cards e no detalhe com tratamento visual de UX.

**Architecture:** Backend Fastify + Clean Architecture: `Gym` ganha um campo opcional `imageKey`; novos use cases `UpdateGymUseCase` e `SetGymImageUseCase`; processamento e armazenamento de imagem isolados atrás das portas `ImageProcessor` (sharp) e `ImageStorage` (filesystem local); endpoints `PUT /gyms/:gymId` (JSON) e `POST /gyms/:gymId/image` (multipart); serving estático via `@fastify/static` em `/uploads`. Frontend Next.js: componentes `GymImage` (exibição) e `GymImageUploader` (crop com react-easy-crop), mutations `useUpdateGym`/`useSetGymImage`, e nova página de edição.

**Tech Stack:** TypeScript, Fastify 5, Inversify, Prisma, sharp, @fastify/multipart, @fastify/static, Vitest + supertest; Next.js 16, React 19, TanStack Query, react-easy-crop, react-hook-form + Zod, Tailwind v4, MSW + Vitest.

---

## Tarefas

- [x] 1. Domínio Gym: campo opcional `imageKey` + migration Prisma [FR-003] → `task-01.md`
- [x] 2. Repositórios de Gym: mapear `imageKey` + método `update` [FR-006, FR-008] → `task-02.md`
- [x] 3. Expor `imageKey` nos endpoints de leitura (detalhe + listagem + busca) [FR-013, FR-014] → `task-03.md`
- [x] 4. `UpdateGymUseCase` + teste unitário [FR-006, FR-009] → `task-04.md`
- [x] 5. Portas de imagem + implementações (sharp/fs) + deps + env [FR-005, FR-008] → `task-05.md`
- [x] 6. `SetGymImageUseCase` + teste unitário [FR-007, FR-008] → `task-06.md`
- [x] 7. Plugins Fastify (multipart + static) + guard do rawBody [FR-005, FR-014] → `task-07.md`
- [x] 8. `UpdateGymController` + rota `PUT /gyms/:gymId` + wiring + business-flow [FR-006, FR-009, FR-015] → `task-08.md`
- [ ] 9. `GymImageController` + rota `POST /gyms/:gymId/image` + wiring + business-flow [FR-005, FR-007, FR-015] → `task-09.md`
- [ ] 10. Regenerar tipos OpenAPI + validar dependency-cruiser [FR-006, FR-013] → `task-10.md`
- [x] 11. Frontend: `imageKey` em `GymSummary` + path multipart + helper de URL [FR-013, FR-014] → `task-11.md`
- [x] 12. Componente `GymImage` (cover + gradiente + zoom + placeholder) [FR-010, FR-011, FR-012, FR-013] → `task-12.md`
- [x] 13. Integrar `GymImage` no `GymCard` e no detalhe [FR-010, FR-014] → `task-13.md`
- [x] 14. Componente `GymImageUploader` (crop com react-easy-crop) [FR-001, FR-002, FR-004] → `task-14.md`
- [x] 15. Mutations `useUpdateGym` + `useSetGymImage` [FR-006, FR-007] → `task-15.md`
- [x] 16. Integrar uploader na página de cadastro [FR-001, FR-002] → `task-16.md`
- [x] 17. Página de edição `/admin/academias/[id]/editar` [FR-006, FR-007, FR-015] → `task-17.md`

## Ondas de Execução

<!-- Derivado dos campos **Depends on:** de cada task via agrupamento topológico. -->

- **Wave 1** (parallel): 1, 5, 11, 14
- **Wave 2** (parallel): 2, 7, 12, 15
- **Wave 3** (parallel): 3, 4, 6, 13, 16, 17
- **Wave 4** (sequential): 8
- **Wave 5** (sequential): 9
- **Wave 6** (sequential): 10
