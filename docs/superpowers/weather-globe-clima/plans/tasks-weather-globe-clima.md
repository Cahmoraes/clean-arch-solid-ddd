# Tarefas: Globo 3D na rota `/clima`

**Spec:** `../specs/weather-globe-clima-design.md`
**PRD:** `../prd/prd-weather-globe-clima.md`

**Goal:** Adicionar um globo 3D decorativo (`react-globe.gl`) à rota pública `/clima`, que gira automaticamente e anima até a coordenada da cidade buscada, sem afetar o fluxo funcional existente de consulta de clima.

**Architecture:** O backend estende de forma aditiva `GET /weather?city=` para incluir `latitude`/`longitude` (VO `CurrentWeather` + `weatherResponseSchema`), regenerando `@repo/api-types`. O frontend ganha um componente `WeatherGlobe` isolado (fallback estático para no-WebGL/`prefers-reduced-motion`, `ErrorBoundary` local, cleanup de contexto WebGL no unmount), carregado via `next/dynamic({ ssr: false })` na página `/clima` para manter o chunk fora do bundle inicial, reforçado por uma fitness function estrutural.

**Tech Stack:** Monorepo pnpm workspaces + Turborepo · Backend: Node.js/TypeScript, Fastify, Zod, InversifyJS (DI), Vitest (`test:run` para unit, `test:business-flow` para HTTP) · Frontend: Next.js App Router, React, TypeScript, TanStack Query, Vitest (ambiente `happy-dom`, `pnpm --filter frontend test -- --run`), Testing Library, MSW.

---

## Tarefas

- [x] 1. `CurrentWeather` VO passa a incluir `Coordinate` [FR-004] → `task-01.md`
- [x] 2. `weatherResponseSchema` expõe `latitude`/`longitude` e regenera `@repo/api-types` [FR-004] → `task-02.md`
- [x] 3. `WeatherGlobe` — esqueleto, detecção de suporte e fallback estático acessível [FR-005, FR-006, FR-007] → `task-03.md`
- [x] 4. `WeatherGlobe` — rotação automática e animação de câmera até a busca [FR-001, FR-003, FR-009, FR-012, FR-013] → `task-04.md`
- [x] 5. `WeatherGlobe` — `ErrorBoundary` local e cleanup no unmount [FR-008, FR-010] → `task-05.md`
- [x] 6. Integrar `WeatherGlobe` na página `/clima` via `next/dynamic({ ssr: false })` [FR-002] → `task-06.md`
- [x] 7. Fitness function — nenhuma importação estática de `react-globe.gl` fora do `next/dynamic` [FR-011] → `task-07.md`
- [x] 8. `WeatherGlobe` — textura de mapa-múndi, rotação manual e tamanho 240px [FR-014, FR-015, FR-016, FR-017, FR-018] → `task-08.md`

## Ondas de Execução

- **Wave 1** (parallel): 1, 3
- **Wave 2** (parallel): 2, 4
- **Wave 3** (sequential): 5
- **Wave 4** (sequential): 6
- **Wave 5** (sequential): 7
- **Wave 6** (sequential): 8
