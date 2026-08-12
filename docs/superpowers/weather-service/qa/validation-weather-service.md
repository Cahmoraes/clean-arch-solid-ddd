# weather-service - Independent Validation

**Date**: 2026-08-12
**Spec**: docs/superpowers/weather-service/specs/weather-service-design.md (+ weather-service-frontend-design.md)
**PRD**: none
**Diff range**: f2a8c076..0529d116
**Verifier**: INDEPENDENT
**Sensor depth**: 10 mutations across 8 logic files — get-current-weather-by-city.usecase.ts: 1/2 branches, weather-controller.ts: 2/5 branches, open-meteo-geocoding-gateway.ts: 2/4 branches, open-meteo-weather-gateway.ts: 1/2 branches, circuit-breaker.ts: 1/3 branches, use-weather-query.ts: 1/3 branches, weather-search-form.tsx: 1/2 branches, page.tsx: 1/3 branches

**Re-verification round**: HEAD avançou de `bd89cc79` para `0529d116` (`test: adiciona testes para registerCity (AC-15) e link Clima (AC-47)`) — round de fix que fechou os 2 gaps do round anterior sem tocar código de produção (apenas 2 arquivos de teste alterados, +17/-0 linhas). Ver evidência atualizada de AC-15 e AC-47 abaixo.


---

## Gate Check

- **Command**: `pnpm --filter backend test` · `pnpm --filter backend test:business-flow` · `pnpm --filter frontend test -- --run`
- **Result**: Backend unit 730 passed/0 failed (exit 0); Backend business-flow 201 passed/0 failed (exit 0); Frontend 835 passed/0 failed (exit 0)
- **Baseline**: reused from controller's full-suite run @ 0529d116 (HEAD matches, `git status --porcelain` shows only the pre-existing unrelated files `AGENTS.md`, `sdd/guia-sdd.md`, `config/` mais o novo diretório `docs/superpowers/weather-service/qa/` — nenhum arquivo de código-fonte da feature está sujo)
- **Typecheck/build**: `pnpm --filter backend tsc:check` → exit 0; `pnpm --filter frontend tsc:check` → exit 0; `pnpm --filter backend build` (tsup) → exit 0; `pnpm --filter frontend build` (next build) → exit 0, com a rota `/clima` presente no output (`○ /clima`). Verificado no round anterior @ bd89cc79; este round não alterou código de produção, portanto o resultado permanece válido (reused, não re-executado).

**Re-check deste round**: Backend unit 731 passed/0 failed (exit 0) — 1 a mais que o round anterior (730), refletindo o novo teste de `registerCity`; Backend business-flow 201 passed/0 failed (exit 0); Frontend 835 passed/0 failed (exit 0). Todos consistentes com a baseline medida pelo controller @ 0529d116.

---

## Spec-Anchored Acceptance Criteria

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion expression | Result |
| --- | --- | --- | --- |
| AC-01 WHEN cidade conhecida + provider ok THEN retorna `CurrentWeather` completo | `{city, temperature:{current,min,max}}` | `apps/backend/src/weather/application/use-case/get-current-weather-by-city.usecase.test.ts:18-26` - `expect(result.force.success().value).toEqual({city:"São Paulo", temperature:{current:24,min:18,max:27}})` | ✅ PASS |
| AC-02 WHEN cidade desconhecida THEN `CityNotFoundError`, `weatherGateway` nunca chamado | `isFailure()` + `CityNotFoundError` + 0 chamadas | `get-current-weather-by-city.usecase.test.ts:28-36` - `expect(result.force.failure().value.name).toBe("CityNotFoundError")` + `expect(getCurrentWeatherSpy).not.toHaveBeenCalled()` | ✅ PASS |
| AC-03 WHEN geocoding indisponível THEN `WeatherProviderUnavailableError` (503), `weatherGateway` não chamado | `isFailure()` + `WeatherProviderUnavailableError` + 0 chamadas | `get-current-weather-by-city.usecase.test.ts:38-49` - `expect(getCurrentWeatherSpy).not.toHaveBeenCalled()` | ✅ PASS |
| AC-04 WHEN provider de clima indisponível THEN `WeatherProviderUnavailableError` | `isFailure()` + nome do erro | `get-current-weather-by-city.usecase.test.ts:51-60` | ✅ PASS |
| AC-05 WHEN `GET /weather?city=` sucesso THEN HTTP 200 `{city, temperature:{current,min,max}}` | corpo literal do spec (`§ Contrato HTTP`) | `weather-controller.business-flow-test.ts:35-45` - `expect(response.body).toEqual({city:"São Paulo", temperature:{current:24,min:18,max:27}})` | ✅ PASS |
| AC-06 WHEN cidade não encontrada THEN HTTP 404 `{code:"city_not_found", message:"City not found"}` | valor exato do spec | `weather-controller.business-flow-test.ts:47-57` - `expect(response.body).toEqual({code:"city_not_found", message:"City not found"})` | ✅ PASS |
| AC-07 WHEN provider de clima indisponível THEN HTTP 503 `{code:"weather_provider_unavailable", ...}` | valor exato do spec | `weather-controller.business-flow-test.ts:59-71` | ✅ PASS |
| AC-08 WHEN provider de **geocoding** indisponível (falha de rede/5xx) THEN HTTP 503 `{code:"weather_provider_unavailable", ...}` (não 404) — fix-round desta sessão | valor exato do spec | `weather-controller.business-flow-test.ts:73-85` + gateway-level: `open-meteo-geocoding-gateway.test.ts:45-66` - `expect(result.force.failure().value.name).toBe("WeatherProviderUnavailableError")` após `fetch` mockado com `ok:false, status:500` | ✅ PASS |
| AC-09 WHEN `city` ausente THEN HTTP 400 | status 400 (valor não pinado no corpo pelo spec) | `weather-controller.business-flow-test.ts:87-91` - `expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)` | ✅ PASS |
| AC-10 100% das chamadas externas envolvidas por `CircuitBreaker`+`Retry`; nenhuma exceção não tratada escapa do use case | estrutural (critério mensurável do spec) | `open-meteo-geocoding-gateway.ts:28-44` e `open-meteo-weather-gateway.ts:30-44` (ambos usam `breaker`/`retry` + `try/catch`); provado empiricamente pelo mutante M7 (killed) — remover o forward de args do `CircuitBreaker.run` quebra `open-meteo-weather-gateway.test.ts` | ✅ PASS |
| AC-11 `CityNotFoundError` expõe `.kind==="not-found"`, `.name`, `.message` exatos | valores exatos do spec | `city-not-found-error.test.ts:5-11` | ✅ PASS |
| AC-12 `WeatherProviderUnavailableError` expõe `.name`, `.message` exatos | valores exatos do spec | `weather-provider-unavailable-error.test.ts:5-10` | ✅ PASS |
| AC-13 `InMemoryGeocodingGateway.geocode("São Paulo")` → `Coordinate.latitude === -23.5505` | valor exato | `in-memory-geocoding-gateway.test.ts:5-12` | ✅ PASS |
| AC-14 `InMemoryGeocodingGateway.geocode("Atlantis")` → `isFailure()` + `CityNotFoundError` | valor exato | `in-memory-geocoding-gateway.test.ts:14-21` | ✅ PASS |
| AC-15 `registerCity` permite registrar cidades em tempo de teste sem alterar a API pública `geocode` | comportamento observável via `geocode` após `registerCity` | `in-memory-geocoding-gateway.test.ts:23-36` - `gateway.registerCity("Rio de Janeiro", {latitude:-22.9068, longitude:-43.1729})` seguido de `geocode("Rio de Janeiro")`: `expect(result.isSuccess()).toBe(true)`, `expect(result.force.success().value.latitude).toBe(-22.9068)`, `expect(...).longitude).toBe(-43.1729)`. "Rio de Janeiro" não está no seed padrão (só "São Paulo" está, com coords distintas -23.5505/-46.6333) — sem `registerCity` funcionando, `geocode("Rio de Janeiro")` falharia com `CityNotFoundError`; o teste prova genuinamente o comportamento, não é coincidência | ✅ PASS |
| AC-16 `InMemoryWeatherGateway.getCurrentWeather()` → `{current:24,min:18,max:27}` por padrão | valor exato | usado implicitamente em `get-current-weather-by-city.usecase.test.ts:18-26` (não há teste unitário dedicado do gateway em si, mas o valor default é exercitado e verificado via o use case) | ✅ PASS |
| AC-17 Após `simulateProviderUnavailable()`, `getCurrentWeather()` → `isFailure()` + `WeatherProviderUnavailableError` | valor exato | `get-current-weather-by-city.usecase.test.ts:51-60` | ✅ PASS |
| AC-18 `geocode` com `fetch` mockado retornando resultados → `isSuccess()` + `Coordinate` correta | valor exato | `open-meteo-geocoding-gateway.test.ts:10-27` | ✅ PASS |
| AC-19 `geocode` com `fetch` mockado sem resultados → `isFailure()` + `CityNotFoundError` | valor exato | `open-meteo-geocoding-gateway.test.ts:29-43` | ✅ PASS |
| AC-20 chamada HTTP real do geocoding passa por `CircuitBreaker`+`Retry` | comportamental (circuito abre após 1ª falha, `fetch` chamado só 1x em 3 tentativas) | `open-meteo-geocoding-gateway.test.ts:61` - `expect(fetch).toHaveBeenCalledTimes(1)` | ✅ PASS |
| AC-21 `getCurrentWeather` com `fetch` mockado sucesso (shape real Open-Meteo) → `isSuccess()` + `{current,min,max}` | valor exato | `open-meteo-weather-gateway.test.ts:11-39` | ✅ PASS |
| AC-22 `getCurrentWeather` com `fetch` mockado `ok:false` (500) → `isFailure()` + `WeatherProviderUnavailableError` | valor exato | `open-meteo-weather-gateway.test.ts:41-70` | ✅ PASS |
| AC-23 chamada HTTP real do weather passa por `CircuitBreaker`+`Retry` | comportamental | `open-meteo-weather-gateway.test.ts:65` - `expect(fetch).toHaveBeenCalledTimes(1)` | ✅ PASS |
| AC-24 `WeatherRoutes.GET === "/weather"` | valor exato | `weather-routes.ts:2` | ✅ PASS |
| AC-25 `mapResponseError` mapeia `CityNotFoundError`→404 e `WeatherProviderUnavailableError`→503; `ZodError`/arrays delegam ao 400 padrão | valores exatos | `weather-controller.ts:68-91` + `weather-controller.business-flow-test.ts` (404/503/400) | ✅ PASS |
| AC-26 schema OpenAPI documenta 200/400/404/503 | estrutural | `weather-controller.ts:106-126` - `responses: {200,400,404,503}` | ✅ PASS |
| AC-27 teste business-flow cobre os casos 200/404/503/400 | 4 casos mínimos do spec (task-10) — sessão ampliou para 5, incluindo o 503 de geocoding (AC-08) | `weather-controller.business-flow-test.ts` (5 testes) | ✅ PASS |
| AC-28 `weatherModule` liga `GATEWAYS.Geocoding`→`OpenMeteoGeocodingGateway`, `.Weather`→`OpenMeteoWeatherGateway`, `USE_CASES.GetCurrentWeatherByCity`→use case, `CONTROLLERS.Weather`→controller, gateways em singleton | estrutural | `weather-module.ts:8-19` | ✅ PASS |
| AC-29 `container.ts` carrega `weatherModule`; `server-build.ts` monta `setupWeatherModule()` | estrutural | `container.ts:12,26` + `server-build.ts:17,42` + `setup-weather-module.ts:1-6` | ✅ PASS |
| AC-30 `apps/backend/src/weather/AGENTS.md` documenta estrutura/gateways/use case/rotas/erros/service identifiers/testes | estrutural | `apps/backend/src/weather/AGENTS.md` (139 linhas, seções: Estrutura, Gateways, Use Case, Rotas HTTP, Erros, IoC, Testes) | ✅ PASS |
| AC-31 `openapi-spec.json` inclui `/weather`; `packages/api-types/index.d.ts` inclui `paths["/weather"]` | presença literal | `grep -n '"/weather"' packages/api-types/index.d.ts` → linha 4390 | ✅ PASS |
| AC-32 `citySchema.safeParse({city:"São Paulo"})` → `success:true`, `data.city==="São Paulo"` | valor exato | `apps/frontend/src/features/weather/schemas/index.test.ts:5-10` | ✅ PASS |
| AC-33 `citySchema.safeParse({city:""})`/`"   "` → `success:false`, mensagem `"Informe o nome de uma cidade."` | valor exato | `schemas/index.test.ts:12-28` | ✅ PASS |
| AC-34 `CurrentWeatherDisplay` renderiza cidade + temperatura em destaque + tiles mín/máx | valores exatos ("São Paulo","24°C","18°C","27°C") | `current-weather-display.test.tsx:6-18` | ✅ PASS |
| AC-35 Digitar cidade e submeter chama `onSearch("São Paulo")` com valor exato | valor exato | `weather-search-form.test.tsx:7-16` | ✅ PASS |
| AC-36 Submeter vazio mostra `"Informe o nome de uma cidade."` e NÃO chama `onSearch` | valor exato + negação | `weather-search-form.test.tsx:18-29` | ✅ PASS |
| AC-37 `isPending=true` desabilita botão e mostra `"Consultando…"` | valor exato | `weather-search-form.test.tsx:31-37` | ✅ PASS |
| AC-38 `useWeatherQuery(city)` válido → `isSuccess:true`, `data` igual ao corpo de `GET /weather` | valor exato | `use-weather-query.test.tsx:23-45` | ✅ PASS |
| AC-39 `useWeatherQuery` com 404 → `isError:true`, `error.code==="city_not_found"` | valor exato | `use-weather-query.test.tsx:47-63` | ✅ PASS |
| AC-40 `useWeatherQuery` com 503 → `isError:true`, `error.code==="weather_provider_unavailable"` | valor exato | `use-weather-query.test.tsx:65-84` | ✅ PASS |
| AC-41 `city===null` → query não dispara, `fetchStatus==="idle"` | valor exato | `use-weather-query.test.tsx:86-92` | ✅ PASS |
| AC-42 Sem `?city=` → `EmptyState` `"Digite uma cidade para começar"` | valor exato | `page.test.tsx:27-33` | ✅ PASS |
| AC-43 Submeter cidade chama `router.replace` com URL contendo `city=<cidade>` | valor exato (`city=S%C3%A3o+Paulo`) | `page.test.tsx:35-49` | ✅ PASS |
| AC-44 Com `?city=` e API 200 → `CurrentWeatherDisplay` com valores corretos | valor exato ("24°C","São Paulo") | `page.test.tsx:51-70` | ✅ PASS |
| AC-45 API 404 → `"Cidade não encontrada. Verifique o nome e tente novamente."` | valor exato | `page.test.tsx:72-94` | ✅ PASS |
| AC-46 API 503 → `"Serviço de meteorologia indisponível no momento. Tente novamente em instantes."` | valor exato | `page.test.tsx:96-121` | ✅ PASS |
| AC-47 Link `"Clima"` presente em `PublicShell`, apontando para `/clima` | valor exato (texto + `href`) | `public-shell.test.tsx:16,19` - `const clima = screen.getByRole("link", { name: /clima/i })` + `expect(clima).toHaveAttribute("href", "/clima")`, exercitando `public-shell.tsx:29-34` | ✅ PASS |

**Coverage**: 47/47 criteria PASS · 0 gaps · 0 spec-precision gaps

**Observação (fora da tabela, não é gap):** `.max(100)` no `city` — tanto no backend (`weather-controller.ts:20`) quanto no frontend (`schemas/index.ts:8`) — não tem âncora em nenhum dos dois specs (`grep -n "100\|max(" docs/superpowers/weather-service/specs/*.md` não retorna nenhuma menção a limite de tamanho). É uma adição de qualidade de código do round de fix desta sessão, fora do escopo do spec — o frontend tem teste dedicado (`schemas/index.test.ts:30-37`), o backend não tem teste dedicado do limite (só o schema em si), mas por não ser AC do spec isso não entra na tabela como gap.

---

## Discrimination Sensor

| # | File:line | Mutation | Killed? |
| --- | --- | --- | --- |
| 1 | `apps/backend/src/weather/application/use-case/get-current-weather-by-city.usecase.ts:36` | `if (coordinateOrError.isFailure())` → `if (coordinateOrError.isSuccess())` | ✅ Killed |
| 2 | `apps/backend/src/weather/infra/controller/weather-controller.ts:77` | `code: "city_not_found"` → `code: "city_not_found_x"` | ✅ Killed |
| 3 | `apps/backend/src/weather/infra/controller/weather-controller.ts:84` | `status: HTTP_STATUS.SERVICE_UNAVAILABLE` → `status: HTTP_STATUS.NOT_FOUND` | ✅ Killed |
| 4 | `apps/backend/src/weather/infra/gateway/open-meteo-geocoding-gateway.ts:47` | `if (!first)` → `if (first)` | ✅ Killed |
| 5 | `apps/backend/src/weather/infra/gateway/open-meteo-geocoding-gateway.ts:59` | catch: `WeatherProviderUnavailableError` → `CityNotFoundError(cityName)` | ✅ Killed |
| 6 | `apps/backend/src/weather/infra/gateway/open-meteo-weather-gateway.ts:63` | `if (!response.ok)` → `if (response.ok)` | ✅ Killed |
| 7 | `apps/backend/src/shared/infra/gateway/circuit-breaker.ts:75` | `this.callback(...args)` → `this.callback()` (remove o forward de argumentos por chamada — exatamente a regressão que o fix desta sessão corrigiu) | ✅ Killed |
| 8 | `apps/frontend/src/features/weather/api/use-weather-query.ts:31` | `enabled: Boolean(city)` → `enabled: true` | ✅ Killed |
| 9 | `apps/frontend/src/features/weather/components/weather-search-form.tsx:50` | `{isPending ? "Consultando…" : "Consultar"}` → invertido | ✅ Killed |
| 10 | `apps/frontend/src/app/(public)/clima/page.tsx:11` | `if (code === "city_not_found")` → `if (code !== "city_not_found")` | ✅ Killed |

**Depth**: lightweight (10, dentro do teto de 10 — feature Large)
**Result**: 10/10 killed - PASS ✅

Post-sensor tree state: `git status --porcelain` shows only the pre-existing unrelated files (`AGENTS.md`, `sdd/guia-sdd.md`, `config/`) — nenhum arquivo do diff da feature foi alterado; todos os `run-mutation-batch.cjs` reportaram `summary.realTreeDirtied: false`. Mutante #7 foi adicionalmente re-verificado manualmente em um `git worktree` isolado (com `.env`/`.env.test` copiados) para confirmar que o kill é comportamental (assinatura real: `open-meteo-weather-gateway.test.ts` falha porque `coordinate` chega `undefined` em `fetchForecast`, não um artefato de ambiente) — ver evidência abaixo.

**Evidência do mutante #7 (re-verificação manual isolada):**
```
FAIL src/weather/infra/gateway/open-meteo-weather-gateway.test.ts > resolve Temperature quando a API responde com sucesso
AssertionError: expected false to be true
FAIL src/weather/infra/gateway/open-meteo-weather-gateway.test.ts > falha com WeatherProviderUnavailableError quando a API responde com erro
AssertionError: expected "vi.fn()" to be called 1 times, but got 0 times
```

---

## Verdict

**PASS ✅** - Round de re-verificação sobre `0529d116` (fix-only, sem alteração de código de produção). Os 2 gaps do round anterior (AC-15 `registerCity`, AC-47 link "Clima" em `PublicShell`) foram fechados por 2 arquivos de teste (+17/-0 linhas), com evidência lida e confirmada linha a linha — não apenas a mensagem do commit: AC-15 registra "Rio de Janeiro" (cidade ausente do seed padrão, coordenadas distintas de "São Paulo") e prova que `geocode` retorna exatamente as coordenadas registradas; AC-47 asserta o link "Clima" com `href="/clima"` via `getByRole`. Gate verde (baseline reutilizada @ 0529d116: 731 unit + 201 business-flow + 835 frontend, 0 falhas — unit subiu de 730→731 refletindo o novo teste) e sensor de mutação 10/10 killed (carregado do round anterior, sem re-execução — nenhum código de produção mudou neste round). 47/47 critérios de aceite PASS, 0 gaps.

**Lessons recorded**: none this round (carried from prior: L-016, L-017)
