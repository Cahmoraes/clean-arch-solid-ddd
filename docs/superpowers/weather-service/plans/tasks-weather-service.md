# Tarefas: Serviço de Meteorologia (backend + frontend)

**Spec:** `../specs/weather-service-design.md` (backend) e `../specs/weather-service-frontend-design.md` (frontend)
**PRD:** N/A

**Goal:** Endpoint público `GET /weather?city=` (geocoding + clima atual via Open-Meteo, sem cache/auth) e a página pública `/clima` que o consome.

**Architecture:** Backend: novo bounded context `apps/backend/src/weather/` (domain/application/infra), padrão de gateway (interface + adapter Open-Meteo + fake), `CircuitBreaker`+`Retry` em ambas as chamadas externas, `Either<Error, Success>` nos use cases, `WeatherController` registra schema OpenAPI via `OpenApiSchemaBuilder`. Frontend: novo feature folder `apps/frontend/src/features/weather/` + rota `app/(public)/clima/`, client component com `useSearchParams`/`router.replace`, TanStack Query sobre o cliente OpenAPI tipado (`@repo/api-types`), reaproveitamento total do design system (Button/Input/FormField/EmptyState).

**Tech Stack:** Backend: Fastify, Inversify, Zod, Vitest, zod-openapi. Frontend: Next.js App Router, TanStack Query, react-hook-form+zod, openapi-fetch, MSW, Vitest+Testing Library.

---

## Tarefas

- [x] 1. Domain layer: `CurrentWeather` VO + `CityNotFoundError` + `WeatherProviderUnavailableError` → `task-01.md`
- [x] 2. Frontend: schema Zod de validação do nome da cidade → `task-02.md`
- [x] 3. Frontend: componente `CurrentWeatherDisplay` (hero + tiles min/max) → `task-03.md`
- [x] 4. Backend: `GeocodingGateway` (interface) + `InMemoryGeocodingGateway` (fake) → `task-04.md`
- [x] 5. Backend: `WeatherGateway` (interface) + `InMemoryWeatherGateway` (fake) → `task-05.md`
- [x] 6. Frontend: componente `WeatherSearchForm` (input + sync de URL) → `task-06.md`
- [x] 7. Backend: `OpenMeteoGeocodingGateway` (adapter real, CircuitBreaker+Retry) → `task-07.md`
- [ ] 8. Backend: `OpenMeteoWeatherGateway` (adapter real, CircuitBreaker+Retry) → `task-08.md`
- [x] 9. Backend: `GetCurrentWeatherByCityUseCase` → `task-09.md`
- [ ] 10. Backend: `WeatherController` + rotas + schema OpenAPI + teste business-flow → `task-10.md`
- [ ] 11. Backend: injeção de dependência (`weather-types.ts`, `weather-module.ts`, `setup-weather-module.ts`) + `AGENTS.md` do módulo → `task-11.md`
- [ ] 12. Integração: regenerar `@repo/api-types` com o contrato `/weather` → `task-12.md`
- [ ] 13. Frontend: hook `useWeatherQuery` (TanStack Query + cliente OpenAPI) → `task-13.md`
- [ ] 14. Frontend: rota `WeatherPage` (`/clima`) — orquestração de estados + link de navegação → `task-14.md`

## Ondas de Execução

- **Wave 1** (parallel): 1, 2, 3
- **Wave 2** (parallel): 4, 5, 6
- **Wave 3** (parallel): 7, 8, 9
- **Wave 4** (sequential): 10
- **Wave 5** (sequential): 11
- **Wave 6** (sequential): 12
- **Wave 7** (sequential): 13
- **Wave 8** (sequential): 14

## Verificação (barreira de integração, por onda)

O repositório tem 9 configs de teste distintas — nenhum comando único roda "a suíte inteira". Os comandos relevantes a esta feature:

- Backend unitário: `pnpm --filter backend test` (config `test/vite.config.app-domain.ts`)
- Backend business-flow: `pnpm --filter backend test:business-flow` (config `test/vite.config.business-flow.ts`)
- Backend fitness functions: `pnpm --filter backend test:fitness` (config `test/vite.config.fitness.ts`) — ver nota abaixo sobre limitação conhecida
- Frontend: `pnpm --filter frontend test -- --run`
- Typecheck: `pnpm --filter backend tsc:check` e `pnpm --filter frontend tsc:check` (obrigatório após a Wave 6/task-12, já que o frontend só compila com `/weather` presente em `@repo/api-types`)

## Notas / Riscos Conhecidos (não endereçados por este plano)

- **Fitness function inerte para paths por módulo**: `apps/backend/.dependency-cruiser.js` define as regras de camada (`noDomainToApplicationExceptPermitted` etc.) com padrões `^src/domain`, `^src/application`, `^src/infra` — mas o repo usa paths *por módulo* (`src/weather/domain/...`), então essas regras não capturam violações de camada no novo módulo `src/weather/`. Isso é um gap pré-existente do repositório (afeta todos os módulos, não só `weather`) — fora de escopo deste plano; mencionado para visibilidade.
- **Sem precedente de `CircuitBreaker`+`Retry` combinados**: nenhum gateway existente compõe os dois. A composição usada nas tasks 07/08 (`Retry` externo envolvendo `CircuitBreaker`) foi inferida das assinaturas de tipo, não copiada de um uso real — primeira aplicação combinada no repositório.
