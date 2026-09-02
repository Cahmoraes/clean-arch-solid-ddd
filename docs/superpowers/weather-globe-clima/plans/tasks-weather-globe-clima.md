# Tarefas: Weather Globe Clima

**Spec:** `../specs/weather-globe-clima-design.md`
**PRD:** `../prd/prd-weather-globe-clima.md`

**Goal:** Implementar o globo 3D panorâmico em `/clima`, com coordenadas vindas do contrato de clima, fallback acessível e interação view-only.

**Architecture:** O backend estende `GET /weather` com `latitude` e `longitude`; os tipos OpenAPI regenerados alimentam o frontend. O frontend adiciona um componente isolado de globo client-only, usando `@react-three/fiber`/Three.js, e compõe o layout panorâmico sem tornar o globo fonte de consulta.

**Tech Stack:** Next.js 16, React 19, TanStack Query, Tailwind CSS v4, shadcn-style UI primitives, Fastify/Nest-like backend modular, Zod/OpenAPI, `@react-three/fiber`, Three.js, Vitest.

---

## Tarefas

- [ ] 1. Estender contrato backend de clima com coordenadas [FR-012] → `task-01.md`
- [ ] 2. Adicionar dependências 3D e utilitários de coordenadas do globo [FR-003, FR-013] → `task-02.md`
- [ ] 3. Regenerar tipos compartilhados da API de clima [FR-012] → `task-03.md`
- [ ] 4. Criar fallback estático acessível do globo [FR-006, FR-009, FR-010, FR-011] → `task-04.md`
- [ ] 5. Criar globo 3D interativo view-only [FR-001, FR-002, FR-003, FR-007, FR-008, FR-013] → `task-05.md`
- [ ] 6. Integrar layout panorâmico na rota `/clima` [FR-001, FR-002, FR-004, FR-005, FR-006, FR-011, FR-013] → `task-06.md`

## Ondas de Execução

- **Wave 1** (parallel): 1, 2
- **Wave 2** (parallel): 3, 4
- **Wave 3** (sequential): 5
- **Wave 4** (sequential): 6

## Verificação de Barreira

A barreira de execução deve rodar a validação completa exigida pelo repo, resolvendo os scripts concretos por workspace quando o root não expõe o alias diretamente:

- `pnpm --filter backend biome:fix`
- `pnpm --filter frontend lint:fix`
- `pnpm --filter backend tsc:check`
- `pnpm --filter frontend tsc:check`
- `pnpm --filter backend test:run`
- `pnpm --filter backend test:business-flow`
- `pnpm --filter frontend test -- --run`
- `pnpm build`
- `pnpm generate:types` deve ter sido executado na Task 3 antes das tasks de integração frontend.
