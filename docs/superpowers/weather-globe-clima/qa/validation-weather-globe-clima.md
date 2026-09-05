# weather-globe-clima - Independent Validation

**Date**: 2026-09-05
**Spec**: docs/superpowers/weather-globe-clima/specs/weather-globe-clima-design.md
**PRD**: docs/superpowers/weather-globe-clima/prd/prd-weather-globe-clima.md
**Diff range**: 682a087c..551b9c23
**Verifier**: INDEPENDENT
**Sensor depth**: 12 mutations across 4 logic files — weather-globe.tsx: 7/11 branches, use-globe-capability.ts: 3/4 branches, weather-globe-error-boundary.tsx: 1/1 branches, page.tsx: 1/2 branches

---

## Gate Check

- **Command**: `pnpm --filter frontend test -- --run` · `pnpm --filter backend test:run` · `pnpm --filter backend test:business-flow`
- **Result**: 1932 passed (953 frontend em 156 arquivos + 767 backend unit em 135 arquivos + 212 backend business-flow em 50 arquivos), 0 failed, 0 skipped - exit 0 nas três suítes
- **Baseline**: ran — reexecutei as três suítes por conta própria em 551b9c23 com árvore limpa (`git status --porcelain` vazio), em vez de reaproveitar o autorrelato do fix-implementer. O número do frontend (953) confere com o baseline recebido; backend permanece idêntico à rodada 1.
- **Typecheck/build**: `pnpm --filter frontend build` **passou** (exit 0, "Compiled successfully in 9.6s", 19 páginas estáticas geradas) — cobre o typecheck do Next/TypeScript no frontend. `pnpm --filter backend tsc:check` **falha com 2 erros TS2554**, ambos pré-existentes e alheios a este diff (ver Pre-Existing Failures); nenhum erro de tipo novo foi introduzido pela feature.

---

## Pre-Existing Failures

| Failing test | Baseline SHA | Evidence |
| --- | --- | --- |
| `tsc:check` — `src/weather/infra/gateway/testing/in-memory-weather-gateway.test.ts(10,50): error TS2554: Expected 0 arguments, but got 1` | 682a087c | `git diff --stat 682a087c..551b9c23 -- apps/backend/src/weather/infra/gateway/` retorna vazio: nem o teste, nem `in-memory-weather-gateway.ts`, nem a interface `weather-gateway.ts` foram tocados por esta feature. O descasamento é interno a arquivos que o range inteiro não altera. |
| `tsc:check` — `src/weather/infra/gateway/testing/in-memory-weather-gateway.test.ts(25,50): error TS2554: Expected 0 arguments, but got 1` | 682a087c | Mesma causa, segunda chamada no mesmo arquivo. O Vitest usa esbuild (apaga tipos), por isso os 767 testes unitários passam apesar do erro de tipo. |

---

## Spec-Anchored Acceptance Criteria

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion expression | Result |
| --- | --- | --- | --- |
| FR-001 QUANDO o ramo interativo monta ENTÃO a auto-rotação fica ligada | `controls.autoRotate = true`, `autoRotateSpeed = 0.4` | `apps/frontend/src/features/weather/components/weather-globe.test.tsx:119` - `expect(controlsState.autoRotate).toBe(true)`; `:120` - `expect(controlsState.autoRotateSpeed).toBe(0.4)` | ✅ PASS |
| FR-001/D5 QUANDO o ramo interativo monta ENTÃO `controls.enabled` permanece `true` (desligá-lo mataria o giro) | `enabled` nunca setado como `false` (spec D5, L163-169) | `weather-globe.test.tsx:131` - `expect(controlsState.enabled).toBe(true)`; produção em `apps/frontend/src/features/weather/components/weather-globe.tsx:72-78` | ✅ PASS |
| FR-007/D5 QUANDO o ramo interativo monta ENTÃO arrastar/zoom/pan ficam desligados pelos flags dos handlers | `enableZoom = false`, `enablePan = false`, `enableRotate = false` | `weather-globe.test.tsx:121-123` - `expect(controlsState.enableZoom/enablePan/enableRotate).toBe(false)` | ✅ PASS |
| FR-007 QUANDO qualquer ramo renderiza ENTÃO o elemento é decorativo para tecnologia assistiva | `aria-hidden="true"` nos dois ramos + `enablePointerInteraction={false}` | `weather-globe.test.tsx:84-87` (fallback) e `:95-98` (canvas) - `toHaveAttribute("aria-hidden", "true")`; `:99-101` - `objectContaining({ enablePointerInteraction: false })` | ✅ PASS |
| FR-007 QUANDO o usuário navega por teclado ENTÃO o globo não captura foco | não pinado no spec (D5 e o Done-when da task-03 só definem `aria-hidden` + flags de ponteiro; nenhum observável de foco/`tabindex` é especificado) | - | ⚠️ Spec-precision gap |
| FR-002 QUANDO `/clima` carrega ENTÃO o chunk pesado do globo fica fora do bundle inicial | carregado por `next/dynamic({ ssr: false })`; verificável no output do `next build` | `weather-globe-error-boundary.tsx:15-19` - `dynamic(() => import("./weather-globe")..., { ssr: false })`; evidência de build em 551b9c23: o único chunk contendo `three-globe`/`WebGLRenderer` é `static/chunks/0hcb846eoo~m9.js` (1854KB) e **não** está entre os 17 scripts iniciais de `.next/server/app/clima.html` (1150KB no total) | ✅ PASS |
| FR-011 QUANDO a fitness function varre `apps/frontend/src` hoje ENTÃO não há violação | lista vazia | `apps/frontend/src/test/fitness/weather-globe-import.test.ts:9-11` - `expect(findForbiddenStaticGlobeImports()).toEqual([])` | ✅ PASS |
| FR-011 QUANDO um arquivo importa estaticamente `react-globe.gl`, `three`, `three-globe` ou `globe.gl` ENTÃO o teste falha | detecta raiz e subpath, `from`, `require` e side-effect-only | `weather-globe-import.test.ts:14-18`, `:35-39`, `:41-45`, `:47-51`, `:53-60`, `:62-65`, `:67-71` - `expect(hasForbiddenStaticGlobeImport(content)).toBe(true)` | ✅ PASS |
| FR-011 QUANDO um arquivo importa estaticamente o módulo real `weather-globe` ENTÃO o teste falha | violação apontada | `weather-globe-import.test.ts:20-24` - `expect(hasForbiddenStaticGlobeImport('...weather-globe"')).toBe(true)` | ✅ PASS |
| FR-011 QUANDO o carregamento é via `dynamic(() => import(...))` ENTÃO continua permitido | predicado só considera `from`/`require`/`import "..."` | `weather-globe-import.test.ts:26-33` - `expect(hasForbiddenStaticGlobeImport(content)).toBe(false)` | ✅ PASS |
| FR-011/D5 QUANDO `page.tsx` importa estaticamente `weather-globe-error-boundary` ENTÃO isso **passa e deve passar** | spec "Testes" L284-292 e task-07 L201-204 (ambos reconciliados em 551b9c23) declaram o import do boundary esperado, não violação | `weather-globe-import.test.ts:73-79` - `expect(hasForbiddenStaticGlobeImport(content)).toBe(false)` com o especificador do boundary; guard em `weather-globe-static-import-guard.ts:31-32`; consumo real em `apps/frontend/src/app/(public)/clima/page.tsx:13` | ✅ PASS |
| FR-003 QUANDO uma busca retorna resultado ENTÃO a câmera anima até a coordenada | `pointOfView({ lat, lng, altitude: 1.5 }, 1000)` com os valores da cidade | `weather-globe.test.tsx:202-205` - `expect(pointOfViewMock).toHaveBeenCalledWith({ lat: -23.5505, lng: -46.6333, altitude: 1.5 }, 1000)` | ✅ PASS |
| FR-012 QUANDO ainda não houve busca ENTÃO o globo gira sem marcador e sem `pointOfView` | `pointsData: []` e `pointOfView` nunca chamado | `weather-globe.test.tsx:213` - `expect(pointOfViewMock).not.toHaveBeenCalled()`; `:214-216` - `objectContaining({ pointsData: [] })` | ✅ PASS |
| FR-013 QUANDO uma nova busca chega antes do fim da animação ENTÃO a coordenada mais nova prevalece, sem fila | último `pointOfView` com o alvo mais recente | `weather-globe.test.tsx:227-230` - `expect(pointOfViewMock).toHaveBeenLastCalledWith({ lat: -22.9068, lng: -43.1729, altitude: 1.5 }, 1000)` | ✅ PASS |
| D5 QUANDO a câmera transiciona ENTÃO a auto-rotação é pausada e retomada após `CAMERA_TRANSITION_MS` | `autoRotate=false` durante, `true` após 1000ms; nova busca reinicia a pausa | `weather-globe.test.tsx:140` / `:146` e `:165` / `:171` - `expect(controlsState.autoRotate).toBe(false|true)` | ✅ PASS |
| FR-009 QUANDO as props não mudam (busca que falhou sem atualizar o resultado) ENTÃO a última posição é preservada | `pointOfView` não é chamado de novo | `weather-globe.test.tsx:242` - `expect(pointOfViewMock).not.toHaveBeenCalled()` após `rerender` com as mesmas coordenadas | ✅ PASS |
| FR-009/FR-001 QUANDO as props voltam a `undefined` **durante** a transição de câmera ENTÃO a auto-rotação é retomada e nunca fica desligada | `controls.autoRotate = true` no caminho sem alvo (spec D5 L174-178; task-04 último critério) | `weather-globe.test.tsx:187` - `expect(controlsState.autoRotate).toBe(true)` imediatamente após o `rerender` com `undefined`; `:193` - mesma asserção após avançar 5000ms; produção em `weather-globe.tsx:99-109` | ✅ PASS |
| FR-005 QUANDO WebGL está indisponível ENTÃO o fallback estático é renderizado | `useGlobeCapability()` retorna `"fallback"` e `WeatherGlobe` renderiza o fallback | `apps/frontend/src/features/weather/components/use-globe-capability.test.ts:61` - `expect(result.current).toBe("fallback")`; `weather-globe.test.tsx:84-87` - fallback no DOM | ✅ PASS |
| FR-006 QUANDO `prefers-reduced-motion: reduce` está ativo (mesmo com WebGL) ENTÃO o fallback é renderizado | `"fallback"`, inclusive em mudança posterior via evento `change` | `use-globe-capability.test.ts:70` e `:82` - `expect(result.current).toBe("fallback")` | ✅ PASS |
| FR-006 (Done-when task-03) QUANDO o hook desmonta ENTÃO o listener de `matchMedia` é removido | `removeEventListener` no cleanup, sem reagir a mudanças posteriores | `use-globe-capability.test.ts:94` - `expect(listenerCount()).toBe(0)` após `unmount()`; `:98` - `expect(result.current).toBe("webgl")` mesmo após `emitChange(true)` | ✅ PASS |
| FR-008 QUANDO o `WeatherGlobe` lança em tempo de render ENTÃO o `ErrorBoundary` troca pelo fallback | fallback estático no lugar do globo | `apps/frontend/src/features/weather/components/weather-globe-error-boundary.test.tsx:33-36` - `expect(await screen.findByTestId("weather-globe-fallback")).toBeInTheDocument()` | ✅ PASS |
| FR-008 QUANDO o chunk do globo falha ao carregar ENTÃO o boundary também captura | falha de fetch do chunk vira erro de render (spec D5 L145-148) | `weather-globe-error-boundary.test.tsx:45-48` - `vi.doMock` que lança + `findByTestId("weather-globe-fallback")`; suportado por `apps/frontend/src/test/mocks/next-dynamic.tsx` (rejeição relançada no render) | ✅ PASS |
| FR-008 (spec "Testes" L279-281 / US-04) QUANDO o globo lança ENTÃO `CurrentWeatherDisplay` continua renderizando | fallback estático **e** temperatura simultaneamente na mesma árvore | `apps/frontend/src/app/(public)/clima/page-globe-failure.test.tsx:53-57` - `findByTestId("weather-globe-fallback")` + `findByText("24°C")` + `getByText("São Paulo")`, com `vi.mock` do módulo real do globo lançando (`:18-22`) e o boundary real em uso | ✅ PASS |
| FR-008/D5 QUANDO o canvas emite `webglcontextlost` ENTÃO troca para o fallback sem erro de render | fallback substitui o canvas | `weather-globe.test.tsx:263` - `expect(screen.getByTestId("weather-globe-fallback")).toBeInTheDocument()`; `:264` - `queryByTestId("weather-globe-canvas")).not.toBeInTheDocument()` | ✅ PASS |
| D5 (Done-when task-05) QUANDO o componente desmonta ENTÃO o listener de `webglcontextlost` é removido | nenhuma reação ao evento após o unmount | `weather-globe.test.tsx:278` - `expect(event.defaultPrevented).toBe(false)` (o handler ativo chama `preventDefault`); `:279-281` - fallback não aparece | ✅ PASS |
| FR-010 QUANDO o componente desmonta ENTÃO o contexto WebGL é liberado e o loop parado | `renderer().forceContextLoss()` chamado e `controls.autoRotate = false` | `weather-globe.test.tsx:251` - `expect(forceContextLossMock).toHaveBeenCalledTimes(1)`; `:252` - `expect(controlsState.autoRotate).toBe(false)` | ✅ PASS |
| FR-010 (Done-when task-05) QUANDO o cleanup roda ENTÃO usa a instância capturada no setup, não uma releitura do ref | `const globe = globeRef.current` no setup | `weather-globe.tsx:67` + `:79-82` (inspeção); nenhuma asserção distingue as duas formas — o teste de unmount passaria em ambas | ⚠️ Spec-precision gap |
| FR-010 (Done-when task-05/06) QUANDO uma nova busca ocorre ENTÃO o globo não é remontado (sem `key` derivada de cidade/coordenada) | um único contexto WebGL por vida da página | `page.tsx:62` não usa `key` (inspeção); nenhuma asserção nem regra de fitness impede a reintrodução de uma `key` | ⚠️ Spec-precision gap |
| FR-004 (Done-when task-01) QUANDO o use case resolve a cidade ENTÃO retorna o `Coordinate` do geocoding | `coordinate.latitude`/`longitude` da cidade buscada | `apps/backend/src/weather/application/use-case/get-current-weather-by-city.usecase.test.ts:29-30` - `expect(currentWeather.coordinate.latitude).toBe(-23.5505)` / `.longitude).toBe(-46.6333)` | ✅ PASS |
| FR-004 (Done-when task-01) QUANDO o use case retorna ENTÃO é a **mesma instância** de `Coordinate`, sem recriação | identidade de referência | apenas os valores são asseridos (`usecase.test.ts:29-30`); nenhuma asserção de identidade (`toBe(coordinate)`) | ⚠️ Spec-precision gap |
| FR-004 QUANDO `GET /weather?city=` responde com sucesso ENTÃO o corpo traz `latitude`/`longitude` planos na raiz | `{ city, temperature, latitude, longitude }`, aditivo | `apps/backend/src/weather/infra/controller/weather-controller.business-flow-test.ts:41-46` - `expect(response.body).toEqual({ city: "São Paulo", temperature: {...}, latitude: -23.5505, longitude: -46.6333 })` (o `toEqual` estrito também prova que nada foi removido/renomeado) | ✅ PASS |
| FR-004 (D3 "Atenção de implementação") QUANDO o Fastify serializa ENTÃO os campos novos estão no `weatherResponseSchema` | campos declarados no schema, senão são descartados silenciosamente | `apps/backend/src/weather/infra/controller/weather-controller.ts:35-36` - `latitude: z.number()...`, `longitude: z.number()...`; provado end-to-end pelo teste HTTP acima | ✅ PASS |
| FR-004 (Done-when task-02) QUANDO `@repo/api-types` é regenerado ENTÃO o tipo da resposta 200 de `/weather` inclui os campos | `latitude: number`, `longitude: number` | `packages/api-types/index.d.ts:4637-4638`; consumido tipado em `use-weather-query.ts` e validado pelo `pnpm --filter frontend build` (exit 0) | ✅ PASS |
| D1 QUANDO o globo renderiza ENTÃO não usa textura externa, e sim `globeMaterial` sólido | `globeImageUrl` ausente, `globeMaterial` presente | `weather-globe.test.tsx:110-111` - `expect(globeProps.globeImageUrl).toBeUndefined()` / `expect(globeProps.globeMaterial).toBeDefined()` | ✅ PASS |
| D2 (Especificação Visual + "Fechamento adicional") QUANDO uma busca é bem sucedida ENTÃO o marcador da cidade aparece no globo | `pointsData` passa a conter `{ lat, lng }` da cidade; "o marcador só aparece junto da primeira animação de câmera bem sucedida" | nenhuma asserção positiva de `pointsData` com coordenada existe — só a negativa em `weather-globe.test.tsx:214-216`; mutação M10 (`markerData` fixado em `[]`) **sobreviveu** à suíte inteira | ❌ Gap (uncovered) |
| Done-when task-03 QUANDO o `<Globe>` monta ENTÃO recebe `width`/`height` explícitos (`GLOBE_SIZE_PX = 128`), nunca o default de viewport | 128 em ambos | `weather-globe.tsx:133-134` (inspeção); o spy de props não assere `width`/`height` | ⚠️ Spec-precision gap |
| Done-when task-03 QUANDO as dependências são declaradas ENTÃO `react-globe.gl` e `three` em `dependencies` e `@types/three` em `devDependencies` | presentes | `apps/frontend/package.json:45`, `:53`, `:68` | ✅ PASS |
| Done-when task-06 QUANDO a página monta ENTÃO o espaço do globo é reservado por wrapper de altura fixa com `aria-hidden` | wrapper 128×128 presente independentemente do chunk | `page.tsx:56-61` (`style={{ height: GLOBE_SIZE_PX, width: GLOBE_SIZE_PX }}`); `apps/frontend/src/app/(public)/clima/page.test.tsx:209` - `expect(screen.getByTestId("weather-globe-slot")).toBeInTheDocument()` | ✅ PASS |
| Done-when task-06 QUANDO a query tem sucesso ENTÃO `WeatherGlobe` recebe `latitude`/`longitude` do resultado | `-23.5505` / `-46.6333` | `page.test.tsx:212-213` - `expect(globe).toHaveAttribute("data-latitude", "-23.5505")` / `"data-longitude", "-46.6333"` | ✅ PASS |
| Done-when task-06 QUANDO não há busca ou a busca falha ENTÃO ambas as props chegam `undefined` | `undefined` em `latitude` e `longitude` nos dois estados | `page.test.tsx:220-221` (sem `?city=`) e `:243-244` (404, após `findByRole("alert")`) - `expect(globe).toHaveAttribute("data-latitude", "")` / `"data-longitude", ""` | ✅ PASS |
| Done-when task-06 QUANDO a página renderiza ENTÃO o globo aparece **acima** do `WeatherSearchForm`, sempre | ordem no DOM e presença mesmo sem busca | `page.test.tsx:255-259` - `expect(Array.from(document.querySelectorAll('[data-testid="weather-globe-slot"], form'))).toEqual([slot, form])`; presença sem busca em `:219` | ✅ PASS |
| Done-when task-06 QUANDO o globo está presente ENTÃO o fluxo de busca existente não regride (erro, `CurrentWeatherDisplay`, anúncio de status) | comportamento anterior intacto | `page.test.tsx` (11 testes, incluindo `:85` - `expect(screen.getByText("24°C"))`, `:106-110` - mensagem de 404, `:133-137` - mensagem de 503) verde com o globo montado; suíte frontend 953/953 | ✅ PASS |
| Done-when task-05 QUANDO o boundary é consumido ENTÃO expõe `WeatherGlobe` como export nomeado com a mesma `WeatherGlobeProps` | API pública preservada | `weather-globe-error-boundary.tsx:47` - `export { WeatherGlobeErrorBoundary as WeatherGlobe }`, tipado como `Component<WeatherGlobeProps, ...>` (`:21-24`); consumido em `page.tsx:13` | ✅ PASS |
| Done-when task-07 QUANDO a fitness function roda ENTÃO não depende de nenhuma dependência nova | só `node:fs`, `node:path`, `node:url` | `apps/frontend/src/test/fitness/weather-globe-static-import-guard.ts:1-3` | ✅ PASS |
| FIX-05 (reconciliação documental) QUANDO um leitor segue os Passos da task-07 ENTÃO encontra o mesmo contrato do guard entregue | spec, task-04 e task-07 descrevendo o contrato vigente | prosa e Critérios de Sucesso reconciliados (`plans/task-07.md:25-30`, `:170-174`, `:201-204`; spec L284-292; `plans/task-04.md:47-49`, `:357`), mas os blocos de código dos Passos continuam prescrevendo o contrato antigo: `plans/task-07.md:63` (nome do teste cita o boundary), `:76-78` - `expect(hasForbiddenStaticGlobeImport(<import do boundary>)).toBe(true)`, `:112-118` - `ALLOWED_FILES` incluindo `weather-globe-error-boundary.tsx`, `:129-130` - regex que casa `weather-globe-error-boundary` | ⚠️ Spec-precision gap |

**Coverage**: 38/45 criteria PASS · 1 gaps · 6 spec-precision gaps

---

## Discrimination Sensor

| # | File:line | Mutation | Killed? |
| --- | --- | --- | --- |
| 1 | `apps/frontend/src/features/weather/components/weather-globe.tsx:107` | remove a restauração do FIX-01: `globe.controls().autoRotate = true` → `void globe.controls()` no caminho sem alvo | ✅ Killed |
| 2 | `apps/frontend/src/features/weather/components/weather-globe.tsx:45` | `controls.autoRotate = false` → `true` (deixa de pausar o giro durante a transição de câmera) | ✅ Killed |
| 3 | `apps/frontend/src/features/weather/components/weather-globe.tsx:52` | `}, CAMERA_TRANSITION_MS)` → `}, 999999)` (a retomada agendada nunca dispara na janela do teste) | ✅ Killed |
| 4 | `apps/frontend/src/features/weather/components/weather-globe.tsx:70` | `controls.autoRotate = true` → `false` no efeito de montagem | ⚠️ Equivalent (ver EQ-01) |
| 5 | `apps/frontend/src/features/weather/components/weather-globe.tsx:76` | reintroduz `controls.enabled = false` antes de `enableZoom = false` (a classe exata do bug crítico da rodada anterior) | ✅ Killed |
| 6 | `apps/frontend/src/features/weather/components/weather-globe.tsx:96` | remove `canvas.removeEventListener("webglcontextlost", handleContextLost)` do cleanup | ✅ Killed |
| 7 | `apps/frontend/src/features/weather/components/use-globe-capability.ts:33` | remove `mediaQueryList.removeEventListener("change", handleChange)` do cleanup | ✅ Killed |
| 8 | `apps/frontend/src/features/weather/components/weather-globe-error-boundary.tsx:36` | desativa o ramo `if (this.state.hasError)` | ✅ Killed |
| 9 | `apps/frontend/src/app/(public)/clima/page.tsx:62` | props do globo fixadas em `undefined` (deixa de propagar `data?.latitude/longitude`) | ✅ Killed |
| 10 | `apps/frontend/src/features/weather/components/weather-globe.tsx:118` | `markerTarget ? [markerTarget] : []` → `[]` (o marcador da cidade nunca é renderizado) | ❌ Survived |
| 11 | `apps/frontend/src/features/weather/components/use-globe-capability.ts:12` | `Boolean(canvas.getContext("webgl") ?? canvas.getContext("webgl2"))` → `true` (WebGL reportado como sempre disponível) | ✅ Killed |
| 12 | `apps/frontend/src/features/weather/components/use-globe-capability.ts:19` | nega o guard `if (prefersReducedMotion) return "fallback"` | ✅ Killed |

**Depth**: P0-full (12 mutações, ferramenta dedicada `run-mutation-batch.cjs`, isolamento hardlink)
**Result**: 10 killed, 1 equivalent (documented), 1 survived (#10) - FAIL ❌

Nota metodológica de validade do sensor: antes das mutações reais rodei 3 mutantes de **controle no-op** (find idêntico a replace, em `weather-globe.tsx:107`, `use-globe-capability.ts:33` e `page.tsx:62`), usando o mesmo comando de teste (`cd apps/frontend && ./node_modules/.bin/vitest run`, binário invocado diretamente, sem `pnpm --filter`). Os três **sobreviveram** (`killed: 0, survived: 3`, decididos pela suíte completa em ~198s cada) — prova de que o ambiente do snapshot executa os testes de verdade e de que qualquer "killed" posterior vem da suíte, não de erro de infraestrutura.

Post-sensor tree state: `git status --porcelain` empty, `git diff --stat` empty. O runner reportou `realTreeDirtied: false` em todas as bateladas.

---

## Equivalent Mutants

### EQ-01 - `apps/frontend/src/features/weather/components/weather-globe.tsx:70`
- **Mutation**: `controls.autoRotate = true` → `controls.autoRotate = false` no efeito de montagem do ramo interativo (mutação #4).
- **Invariant**: depois do FIX-01 esta atribuição virou redundante e nenhum input alcançável a torna observável. O terceiro efeito (`:99-111`) tem deps `[capability, latitude, longitude]`, um superconjunto das deps do efeito de montagem (`[capability]`), e guarda exatamente a mesma condição (`getInteractiveGlobe(capability, globeRef.current)` vs. `capability !== "webgl"` + `!globe`). Logo ele roda no mesmo commit, sempre depois, e sempre termina o commit com `autoRotate` restaurado: `true` imediatamente quando não há alvo (`:107`) ou `false` seguido de `true` via `setTimeout` quando há (`:44-52`). Como `controls.autoRotate` só é lido pelo loop de render (assíncrono, `requestAnimationFrame`), não existe momento em que o valor escrito na linha 70 seja observável antes de ser sobrescrito. Na rodada 1 esta mesma mutação era morta — a correção do FIX-01 é o que a tornou equivalente.
- **Attempted**: a única asserção capaz de matá-la seria instrumentar `controlsState` com um setter que registrasse a **sequência de escritas** e exigir que a primeira escrita do commit fosse `true` — isso assere ordem de atribuição interna entre efeitos, um detalhe de implementação explicitamente fora do critério do spec ("duração e easing da transição são detalhe de implementação"), e não um observável de comportamento. Nenhuma asserção de estado final distingue os dois programas.

---

## Gaps → Fix Tasks

### FIX-01 - O marcador da cidade buscada não tem nenhuma asserção positiva (D2 / Especificação Visual)
- **What**: o spec pina os dois lados do marcador — antes de qualquer busca `pointsData` é vazio (FR-012, coberto), e "o marcador só aparece junto da primeira animação de câmera bem sucedida" (D2, "Fechamento adicional", L90-94), com "marcador simples na cor primária do tema (`#39e58c`)" na Especificação Visual (L41). A suíte só assere o lado vazio. A mutação #10 fixou `markerData` em `[]` — o globo passa a nunca mostrar marcador algum — e **sobreviveu aos 953 testes**. Adicionar em `weather-globe.test.tsx` um teste que renderiza com coordenadas e assere que o `<Globe>` recebeu `pointsData: [{ lat: -23.5505, lng: -46.6333 }]` (e, se quiser fechar também a decisão visual, que `pointColor()` devolve `#39e58c`).
- **Where**: `apps/frontend/src/features/weather/components/weather-globe.test.tsx` (espelhando o teste negativo de `:208-217`)
- **Verify**: reaplicar a mutação #10 (`markerTarget ? [markerTarget] : []` → `[]`) e confirmar que a suíte passa a falhar.
- **Done-when**: existe uma asserção que exige `pointsData` contendo a coordenada da busca bem sucedida, e a mutação #10 é morta.

### FIX-02 - Os blocos de código dos Passos da task-07 ainda descrevem o contrato antigo do guard
- **What**: o FIX-05 da rodada 1 reconciliou o spec (L284-292), a prosa de contexto da task-07 (`:25-30`, `:170-174`) e seus Critérios de Sucesso (`:201-204`) — todos agora dizem corretamente que o boundary **não** é vigiado nem allowlistado e que o import estático dele por `page.tsx` deve passar. Mas os blocos de código dos Passos 1 e 3 não foram tocados e continuam prescrevendo o oposto: teste nomeando o boundary como allowlistado (`:63`), asserção `expect(hasForbiddenStaticGlobeImport(<import do boundary>)).toBe(true)` (`:76-78`), `ALLOWED_FILES` contendo `weather-globe-error-boundary.tsx` (`:112-118`) e regex `/(?:react-globe\.gl|weather-globe(?:-error-boundary)?)$/` que casa o boundary (`:129-130`). A task-07 agora se contradiz internamente, e quem seguir os Passos reimplementará o guard errado. Atualizar os dois blocos para refletir o guard entregue (`weather-globe-static-import-guard.ts:12-14`, `:22-23`, `:31-32`) — inclusive o caminho real do arquivo, que é `src/test/fitness/`, não `src/features/weather/components/`.
- **Where**: `docs/superpowers/weather-globe-clima/plans/task-07.md:53-137`
- **Verify**: reler a task-07 inteira e confirmar que os Passos, a prosa e os Critérios de Sucesso descrevem o mesmo contrato de `weather-globe-static-import-guard.ts`.
- **Done-when**: nenhum trecho da task-07 trata o import estático do boundary como violação, e os caminhos de arquivo citados batem com os entregues.

### FIX-03 - A atribuição de auto-rotação na montagem ficou redundante e sem sensor
- **What**: o critério da task-04 "o ramo interativo ativa `controls().autoRotate = true` **ao montar**, sem depender de `latitude`/`longitude`" continua satisfeito no comportamento observável, mas depois do FIX-01 quem o garante é o terceiro efeito, não o primeiro (ver EQ-01). A linha `weather-globe.tsx:70` virou código morto do ponto de vista observável: removê-la ou invertê-la não quebra nenhum teste. Decidir conscientemente entre (a) remover a atribuição redundante da linha 70, mantendo só `autoRotateSpeed`, e ajustar o comentário/critério da task-04 para dizer que a rotação é ligada pelo efeito de câmera; ou (b) mantê-la deliberadamente como defesa e documentar que ela é redundante por construção. O que não deve ficar é a situação atual, em que o Done-when parece coberto por um teste que não discrimina mais a linha que ele nomeia.
- **Where**: `apps/frontend/src/features/weather/components/weather-globe.tsx:65-83`, `docs/superpowers/weather-globe-clima/plans/task-04.md:353-360`
- **Verify**: após a decisão, reaplicar a mutação #4 — ou ela é morta (opção b com asserção nova), ou a linha não existe mais (opção a).
- **Done-when**: não há mais um Done-when pinando uma linha que nenhuma asserção consegue distinguir.

---

## Verdict

**FAIL ❌** - As cinco correções autorreportadas em 551b9c23 foram confirmadas por evidência independente: o FIX-01 restaura `autoRotate` no caminho sem alvo (`weather-globe.tsx:107`) e sua remoção é morta pelo novo teste; o FIX-02 monta o globo lançando junto do card e assere fallback + temperatura na mesma árvore; o FIX-03 prova remoção de listener por `listenerCount()` e `defaultPrevented`; o FIX-04 cobre os dois estados `undefined` e a ordem no DOM; o FIX-05 reconciliou spec, task-04 e os Critérios de Sucesso da task-07. O gate está verde (1932 testes, `next build` exit 0) e o chunk de 1854KB com `three-globe` segue fora dos 17 scripts iniciais de `/clima`. O que reprova é um sobrevivente nu do sensor: a mutação que apaga o marcador da cidade (`markerData` → `[]`) passa incólume pelos 953 testes do frontend, deixando sem sensor o lado positivo de uma decisão visual pinada em D2; somam-se a isso uma contradição residual dentro da própria task-07 e uma atribuição de auto-rotação que a correção do FIX-01 tornou indistinguível.

**Lessons recorded**: L-033, L-034, L-035
