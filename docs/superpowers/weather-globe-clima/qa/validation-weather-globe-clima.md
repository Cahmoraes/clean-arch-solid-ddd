# weather-globe-clima - Independent Validation

**Date**: 2026-09-05
**Spec**: docs/superpowers/weather-globe-clima/specs/weather-globe-clima-design.md
**PRD**: docs/superpowers/weather-globe-clima/prd/prd-weather-globe-clima.md
**Diff range**: babb6a8d..a5ee3455
**Verifier**: INDEPENDENT
**Sensor depth**: 7 mutations across 2 logic files — weather-globe.tsx: 6/12 branches, weather-globe-constants.ts: 1/0 branches (rodada 4, sobre o delta da revisão de 2026-09-05; acumulado com as rodadas 2 e 3: 24 mutações em 5 arquivos de lógica)

> **Histórico de rodadas.** Este arquivo acumula quatro rodadas de verificação independente.
> As rodadas 1–3 cobriram a feature original (range `682a087c..e1ad3ed1`, 40 critérios,
> veredito PASS) e estão preservadas abaixo em seções marcadas como histórico. A rodada 4
> (range `babb6a8d..a5ee3455`) verifica **apenas o delta** da revisão de spec de 2026-09-05:
> textura de mapa-múndi, rotação manual e globo de 240px — FR-014 a FR-018 e as decisões
> D1 (fechamento adicional), D5.1, D6 e D7.

---

## Gate Check

- **Command**: `pnpm --filter frontend test -- --run` (suíte completa do frontend) · `pnpm --filter frontend exec vitest run src/features/weather/components/weather-globe.test.tsx` (escopado)
- **Result**: 955 passed em 156 arquivos, 0 failed, 0 skipped - exit 0
- **Baseline**: ran — executei a suíte completa do frontend por conta própria em a5ee3455 com árvore limpa (`git status --porcelain` vazio antes e depois). O baseline recebido do controller (955 testes @ 0b791766) confere: `git diff --stat 0b791766..a5ee3455 -- apps/frontend/src` retorna vazio, ou seja, o commit de HEAD é somente documental. O número saiu de 954 (rodada 3) para 955, exatamente o teste novo de FR-016 acrescentado nesta rodada.
- **Typecheck/build**: `pnpm --filter frontend tsc:check` (`tsc --noEmit`) **passou** com exit 0. O delta desta rodada toca somente `apps/frontend/src` (`git diff --stat babb6a8d..a5ee3455` não lista nenhum arquivo sob `apps/backend`), então os 2 erros TS2554 pré-existentes do backend registrados na rodada 3 seguem inalterados e nenhum erro de tipo novo foi introduzido.

---

## Pre-Existing Failures

| Failing test | Baseline SHA | Evidence |
| --- | --- | --- |
| `tsc:check` — `src/weather/infra/gateway/testing/in-memory-weather-gateway.test.ts(10,50): error TS2554: Expected 0 arguments, but got 1` | 682a087c | `git diff --stat 682a087c..e1ad3ed1 -- apps/backend/src/weather/infra/gateway/` retorna vazio (0 linhas, reexecutado nesta rodada): nem o teste, nem `in-memory-weather-gateway.ts`, nem a interface `weather-gateway.ts` foram tocados pelo range inteiro da feature. |
| `tsc:check` — `src/weather/infra/gateway/testing/in-memory-weather-gateway.test.ts(25,50): error TS2554: Expected 0 arguments, but got 1` | 682a087c | Mesma causa, segunda chamada no mesmo arquivo. O Vitest usa esbuild (apaga tipos), por isso os 767 testes unitários passam apesar do erro de tipo. |

---

## Spec-Anchored Acceptance Criteria

### Rodada 4 — delta da revisão de 2026-09-05 (range `babb6a8d..a5ee3455`)

Critérios novos ou alterados por esta revisão. Todos os `file:line` abaixo são do estado em
HEAD (`a5ee3455`).

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion expression | Result |
| --- | --- | --- | --- |
| FR-017 / D1-revisado QUANDO o globo renderiza ENTÃO recebe a textura de mapa-múndi oficial do `three-globe` | `globeImageUrl="https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-dark.jpg"` (esquema `https://` explícito) | `apps/frontend/src/features/weather/components/weather-globe.test.tsx:110-112` - `expect(globeProps.globeImageUrl).toBe("https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-dark.jpg")`; produção em `weather-globe.tsx:22-23` e `:140` | ✅ PASS |
| FR-018 / D1-revisado QUANDO a textura demora ou falha ENTÃO o globo renderiza mesmo assim, sobre o material sólido | `waitForGlobeReady={false}` **e** `globeMaterial` continua definido como base visual | `weather-globe.test.tsx:113` - `expect(globeProps.waitForGlobeReady).toBe(false)`; `:114` - `expect(globeProps.globeMaterial).toBeDefined()`; produção em `weather-globe.tsx:141` e `:139` | ✅ PASS |
| FR-014 / D5.1 QUANDO o ramo interativo monta ENTÃO o usuário pode girar o globo arrastando/tocando | `controls.enableRotate = true` (revisado — era `false`) | `weather-globe.test.tsx:126` - `expect(controlsState.enableRotate).toBe(true)`; produção em `weather-globe.tsx:81` | ✅ PASS |
| FR-014 (sensor de mutação obrigatório, Riscos do spec L355 + Critérios da task-08) QUANDO a asserção de `enableRotate` é `toBe(true)` ENTÃO o mock precisa nascer no valor oposto, senão ela não prova escrita alguma | baseline `controlsState.enableRotate` **`false`** no `vi.hoisted` **e** no `afterEach` | `weather-globe.test.tsx:27` - `enableRotate: false,` (bloco `vi.hoisted`); `weather-globe.test.tsx:76` - `controlsState.enableRotate = false` (`afterEach`). Ambos verificados como `false`; confirmado empiricamente pela mutação #4, que morre no subset | ✅ PASS |
| FR-015 / D5.1 QUANDO o ramo interativo monta ENTÃO zoom e pan por gesto continuam desligados | `controls.enableZoom = false`, `controls.enablePan = false` | `weather-globe.test.tsx:124` - `expect(controlsState.enableZoom).toBe(false)`; `:125` - `expect(controlsState.enablePan).toBe(false)`; produção em `weather-globe.tsx:79-80` | ✅ PASS |
| FR-016 / D5.1 QUANDO o usuário clica ou toca o globo ENTÃO nada é disparado (busca/seleção), por omissão de handler | nenhum `onGlobeClick` nem `onPointClick` passado ao `<Globe>` | `weather-globe.test.tsx:135` - `expect(globeProps.onGlobeClick).toBeUndefined()`; `:136` - `expect(globeProps.onPointClick).toBeUndefined()`; ausência confirmada na produção (`grep -n "onGlobeClick\|onPointClick\|onClick" weather-globe.tsx` sem resultado) | ✅ PASS |
| D5.1 QUANDO `enablePointerInteraction={false}` coexiste com `enableRotate = true` ENTÃO o raycaster de hover/click segue desligado sem impedir o arrasto | `enablePointerInteraction: false` continua asserido junto com `enableRotate: true` | `weather-globe.test.tsx:99-101` - `expect(globePropsSpy).toHaveBeenCalledWith(expect.objectContaining({ enablePointerInteraction: false }))`, coexistindo com `:126` | ✅ PASS |
| D7 QUANDO a rotação manual é habilitada ENTÃO o globo continua decorativo, sem foco nem handlers de teclado | `aria-hidden="true"` mantido nos dois ramos; sem `tabIndex`/`onKeyDown` | `weather-globe.test.tsx:95-98` - `expect(screen.getByTestId("weather-globe-canvas")).toHaveAttribute("aria-hidden", "true")`; `:84-87` (fallback); ausência de foco confirmada por `grep -n "tabIndex\|onKeyDown" weather-globe.tsx weather-globe-fallback.tsx` sem resultado | ✅ PASS |
| D6 QUANDO o globo e o slot da página são dimensionados ENTÃO usam 240px (era 128px) | `GLOBE_SIZE_PX = 240` | **nenhuma asserção localizada**: `grep -rn "GLOBE_SIZE_PX\|240" apps/frontend/src --include=*.test.ts --include=*.test.tsx` retorna vazio; o valor existe só na produção (`weather-globe-constants.ts:9`) e nenhum teste o lê. Confirmado empiricamente pela mutação #7 (240 → 128), que **sobrevive à suíte completa** | ❌ Gap (uncovered) |

**Coverage (rodada 4)**: 8/9 criteria PASS · 1 gap · 0 spec-precision gaps

> **Supersessão da linha D1 da rodada 3.** A linha "D1 QUANDO o globo renderiza ENTÃO **não**
> usa textura externa, e sim `globeMaterial` sólido" (`globeImageUrl` `toBeUndefined()`), abaixo
> na tabela histórica, está **OBSOLETA e contradita pelo spec vigente**: o "Fechamento adicional —
> textura do globo (revisado 2026-09-05)" (spec L76-92) inverte explicitamente aquela decisão.
> Ela foi verdadeira em `e1ad3ed1` e é preservada apenas como registro histórico; o critério que
> vale hoje são as duas primeiras linhas desta rodada (FR-017 e FR-018 / D1-revisado). A linha
> histórica está marcada como `SUPERSEDED` no seu próprio Result.

### Rodadas 1–3 — feature original (histórico, range `682a087c..e1ad3ed1`)

Os `file:line` desta tabela referem-se ao estado da árvore em `e1ad3ed1`; algumas linhas de
`weather-globe.test.tsx` deslocaram-se com o delta da rodada 4.

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion expression | Result |
| --- | --- | --- | --- |
| FR-001 QUANDO o ramo interativo monta ENTÃO a auto-rotação fica ligada | `controls.autoRotate = true`, `autoRotateSpeed = 0.4` | `apps/frontend/src/features/weather/components/weather-globe.test.tsx:119` - `expect(controlsState.autoRotate).toBe(true)`; `:120` - `expect(controlsState.autoRotateSpeed).toBe(0.4)` | ✅ PASS |
| FR-001/D5 QUANDO o ramo interativo monta ENTÃO `controls.enabled` permanece `true` (desligá-lo mataria o giro) | `enabled` nunca setado como `false` (spec D5, L163-169) | `weather-globe.test.tsx:131` - `expect(controlsState.enabled).toBe(true)`; produção em `apps/frontend/src/features/weather/components/weather-globe.tsx:72-78` | ✅ PASS |
| ~~FR-007/D5 QUANDO o ramo interativo monta ENTÃO arrastar/zoom/pan ficam desligados pelos flags dos handlers~~ | ~~`enableZoom = false`, `enablePan = false`, `enableRotate = false`~~ | ~~`weather-globe.test.tsx:121-123`~~ | 🕘 SUPERSEDED (rodada 4) — a metade `enableRotate = false` foi invertida por D5.1/FR-014; a metade zoom/pan segue válida e reasserida na tabela da rodada 4 |
| FR-007 QUANDO qualquer ramo renderiza ENTÃO o elemento é decorativo para tecnologia assistiva | `aria-hidden="true"` nos dois ramos + `enablePointerInteraction={false}` | `weather-globe.test.tsx:84-87` (fallback) e `:95-98` (canvas) - `toHaveAttribute("aria-hidden", "true")`; `:99-101` - `objectContaining({ enablePointerInteraction: false })` | ✅ PASS |
| FR-002 QUANDO `/clima` carrega ENTÃO o chunk pesado do globo fica fora do bundle inicial | carregado por `next/dynamic({ ssr: false })`; verificável no output do `next build` | `weather-globe-error-boundary.tsx:15-18` - `dynamic(() => import("./weather-globe")..., { ssr: false })`; build reexecutado em e1ad3ed1: o único chunk contendo `three-globe`/`WebGLRenderer` é `static/chunks/0hcb846eoo~m9.js` (1854KB) e **não** aparece entre os 17 scripts iniciais de `.next/server/app/clima.html` | ✅ PASS |
| FR-011 QUANDO a fitness function varre `apps/frontend/src` hoje ENTÃO não há violação | lista vazia | `apps/frontend/src/test/fitness/weather-globe-import.test.ts:11` - `expect(violations).toEqual([])` | ✅ PASS |
| FR-011 QUANDO um arquivo importa estaticamente `react-globe.gl`, `three`, `three-globe` ou `globe.gl` ENTÃO o teste falha | detecta raiz e subpath, `from`, `require` e side-effect-only | `weather-globe-import.test.ts:17`, `:38`, `:44`, `:50`, `:56`, `:63-64`, `:70` - `expect(hasForbiddenStaticGlobeImport(...)).toBe(true)` | ✅ PASS |
| FR-011 QUANDO um arquivo importa estaticamente o módulo real `weather-globe` ENTÃO o teste falha | violação apontada | `weather-globe-import.test.ts:23` - `expect(hasForbiddenStaticGlobeImport('...weather-globe"')).toBe(true)` | ✅ PASS |
| FR-011 QUANDO o carregamento é via `dynamic(() => import(...))` ENTÃO continua permitido | predicado só considera `from`/`require`/`import "..."` | `weather-globe-import.test.ts:32` - `expect(hasForbiddenStaticGlobeImport(content)).toBe(false)` | ✅ PASS |
| FR-011/D5 QUANDO `page.tsx` importa estaticamente `weather-globe-error-boundary` ENTÃO isso **passa e deve passar** | spec "Testes" L284-292 e task-07 (prosa, Passos e Critérios) declaram o import do boundary esperado, não violação | `weather-globe-import.test.ts:78` - `expect(hasForbiddenStaticGlobeImport(content)).toBe(false)` com o especificador do boundary; guard em `apps/frontend/src/test/fitness/weather-globe-static-import-guard.ts:31-32`; consumo real em `apps/frontend/src/app/(public)/clima/page.tsx:13` | ✅ PASS |
| FR-003 QUANDO uma busca retorna resultado ENTÃO a câmera anima até a coordenada | `pointOfView({ lat, lng, altitude: 1.5 }, 1000)` com os valores da cidade | `weather-globe.test.tsx:202-205` - `expect(pointOfViewMock).toHaveBeenCalledWith({ lat: -23.5505, lng: -46.6333, altitude: 1.5 }, 1000)` | ✅ PASS |
| FR-012 QUANDO ainda não houve busca ENTÃO o globo gira sem marcador e sem `pointOfView` | `pointsData: []` e `pointOfView` nunca chamado | `weather-globe.test.tsx:225` - `expect(pointOfViewMock).not.toHaveBeenCalled()`; `:226-228` - `objectContaining({ pointsData: [] })` | ✅ PASS |
| FR-013 QUANDO uma nova busca chega antes do fim da animação ENTÃO a coordenada mais nova prevalece, sem fila | último `pointOfView` com o alvo mais recente | `weather-globe.test.tsx:239-242` - `expect(pointOfViewMock).toHaveBeenLastCalledWith({ lat: -22.9068, lng: -43.1729, altitude: 1.5 }, 1000)` | ✅ PASS |
| D5 QUANDO a câmera transiciona ENTÃO a auto-rotação é pausada e retomada após `CAMERA_TRANSITION_MS` | `autoRotate=false` durante, `true` após 1000ms; nova busca reinicia a pausa | `weather-globe.test.tsx:140` / `:146` e `:165` / `:171` - `expect(controlsState.autoRotate).toBe(false\|true)` | ✅ PASS |
| FR-009 QUANDO as props não mudam (busca que falhou sem atualizar o resultado) ENTÃO a última posição é preservada | `pointOfView` não é chamado de novo | `weather-globe.test.tsx:254` - `expect(pointOfViewMock).not.toHaveBeenCalled()` após `rerender` com as mesmas coordenadas | ✅ PASS |
| FR-009/FR-001 QUANDO as props voltam a `undefined` **durante** a transição de câmera ENTÃO a auto-rotação é retomada e nunca fica desligada | `controls.autoRotate = true` no caminho sem alvo (spec D5 L174-178; task-04 último critério) | `weather-globe.test.tsx:187` - `expect(controlsState.autoRotate).toBe(true)` imediatamente após o `rerender` com `undefined`; `:193` - mesma asserção após avançar 5000ms; produção em `weather-globe.tsx:99-109` | ✅ PASS |
| FR-005 QUANDO WebGL está indisponível ENTÃO o fallback estático é renderizado | `useGlobeCapability()` retorna `"fallback"` e `WeatherGlobe` renderiza o fallback | `apps/frontend/src/features/weather/components/use-globe-capability.test.ts:61` - `expect(result.current).toBe("fallback")`; `weather-globe.test.tsx:84-87` - fallback no DOM | ✅ PASS |
| FR-006 QUANDO `prefers-reduced-motion: reduce` está ativo (mesmo com WebGL) ENTÃO o fallback é renderizado | `"fallback"`, inclusive em mudança posterior via evento `change` | `use-globe-capability.test.ts:70` e `:82` - `expect(result.current).toBe("fallback")` | ✅ PASS |
| FR-006 (Done-when task-03) QUANDO o hook desmonta ENTÃO o listener de `matchMedia` é removido | `removeEventListener` no cleanup, sem reagir a mudanças posteriores | `use-globe-capability.test.ts:94` - `expect(listenerCount()).toBe(0)` após `unmount()`; `:98` - `expect(result.current).toBe("webgl")` mesmo após `emitChange(true)` | ✅ PASS |
| FR-008 QUANDO o `WeatherGlobe` lança em tempo de render ENTÃO o `ErrorBoundary` troca pelo fallback | fallback estático no lugar do globo | `apps/frontend/src/features/weather/components/weather-globe-error-boundary.test.tsx:34` - `await screen.findByTestId("weather-globe-fallback")` | ✅ PASS |
| FR-008 QUANDO o chunk do globo falha ao carregar ENTÃO o boundary também captura | falha de fetch do chunk vira erro de render (spec D5 L145-148) | `weather-globe-error-boundary.test.tsx:39` - `vi.doMock` que lança + `:46` - `findByTestId("weather-globe-fallback")`; suportado por `apps/frontend/src/test/mocks/next-dynamic.tsx` (rejeição relançada no render) | ✅ PASS |
| FR-008 (spec "Testes" L279-281 / US-04) QUANDO o globo lança ENTÃO `CurrentWeatherDisplay` continua renderizando | fallback estático **e** temperatura simultaneamente na mesma árvore | `apps/frontend/src/app/(public)/clima/page-globe-failure.test.tsx:54` - `findByTestId("weather-globe-fallback")` + `:56` - `findByText("24°C")` + `:57` - `getByText("São Paulo")`, com `vi.mock` do módulo real do globo lançando (`:18`) e o boundary real em uso | ✅ PASS |
| FR-008/D5 QUANDO o canvas emite `webglcontextlost` ENTÃO troca para o fallback sem erro de render | fallback substitui o canvas | `weather-globe.test.tsx:275` - `expect(screen.getByTestId("weather-globe-fallback")).toBeInTheDocument()`; `:276` - `queryByTestId("weather-globe-canvas")).not.toBeInTheDocument()` | ✅ PASS |
| D5 (Done-when task-05) QUANDO o componente desmonta ENTÃO o listener de `webglcontextlost` é removido | nenhuma reação ao evento após o unmount | `weather-globe.test.tsx:290` - `expect(event.defaultPrevented).toBe(false)` (o handler ativo chama `preventDefault`); `:291-293` - fallback não aparece | ✅ PASS |
| FR-010 QUANDO o componente desmonta ENTÃO o contexto WebGL é liberado e o loop parado | `renderer().forceContextLoss()` chamado e `controls.autoRotate = false` | `weather-globe.test.tsx:263` - `expect(forceContextLossMock).toHaveBeenCalledTimes(1)`; `:264` - `expect(controlsState.autoRotate).toBe(false)` | ✅ PASS |
| FR-004 (Done-when task-01) QUANDO o use case resolve a cidade ENTÃO retorna o `Coordinate` do geocoding | `coordinate.latitude`/`longitude` da cidade buscada | `apps/backend/src/weather/application/use-case/get-current-weather-by-city.usecase.test.ts:29-30` - `expect(currentWeather.coordinate.latitude).toBe(-23.5505)` / `.longitude).toBe(-46.6333)` | ✅ PASS |
| FR-004 QUANDO `GET /weather?city=` responde com sucesso ENTÃO o corpo traz `latitude`/`longitude` planos na raiz | `{ city, temperature, latitude, longitude }`, aditivo | `apps/backend/src/weather/infra/controller/weather-controller.business-flow-test.ts:41-46` - `expect(response.body).toEqual({ city: "São Paulo", temperature: {...}, latitude: -23.5505, longitude: -46.6333 })` (o `toEqual` estrito também prova que nada foi removido/renomeado) | ✅ PASS |
| FR-004 (D3 "Atenção de implementação") QUANDO o Fastify serializa ENTÃO os campos novos estão no `weatherResponseSchema` | campos declarados no schema, senão são descartados silenciosamente | `apps/backend/src/weather/infra/controller/weather-controller.ts:35-36` - `latitude: z.number()...`, `longitude: z.number()...`; alimentados em `:113-114`; provado end-to-end pelo teste HTTP acima | ✅ PASS |
| FR-004 (Done-when task-02) QUANDO `@repo/api-types` é regenerado ENTÃO o tipo da resposta 200 de `/weather` inclui os campos | `latitude: number`, `longitude: number` | `packages/api-types/index.d.ts:4637` e `:4639`; consumido tipado em `use-weather-query.ts` e validado pelo `pnpm --filter frontend build` (exit 0) | ✅ PASS |
| ~~D1 QUANDO o globo renderiza ENTÃO não usa textura externa, e sim `globeMaterial` sólido~~ | ~~`globeImageUrl` ausente, `globeMaterial` presente~~ | ~~`weather-globe.test.tsx:110-111` - `expect(globeProps.globeImageUrl).toBeUndefined()`~~ | 🕘 SUPERSEDED (rodada 4) — contradita pelo "Fechamento adicional — textura do globo (revisado 2026-09-05)"; substituída pelas linhas FR-017 e FR-018 / D1-revisado |
| D2 (Especificação Visual + "Fechamento adicional") QUANDO uma busca é bem sucedida ENTÃO o marcador da cidade aparece no globo | `pointsData` passa a conter `{ lat, lng }` da cidade | `weather-globe.test.tsx:213-217` - `expect(globePropsSpy).toHaveBeenCalledWith(expect.objectContaining({ pointsData: [{ lat: -23.5505, lng: -46.6333 }] }))`; produção em `weather-globe.tsx:117-118`, `:138` | ✅ PASS |
| Done-when task-03 QUANDO as dependências são declaradas ENTÃO `react-globe.gl` e `three` em `dependencies` e `@types/three` em `devDependencies` | presentes | `apps/frontend/package.json:45` (`react-globe.gl`), `:53` (`three`), `:68` (`@types/three`) | ✅ PASS |
| Done-when task-06 QUANDO a página monta ENTÃO o espaço do globo é reservado por wrapper de altura fixa com `aria-hidden` | wrapper 128×128 presente independentemente do chunk | `page.tsx:58-60` (`data-testid="weather-globe-slot"`, `style={{ height: GLOBE_SIZE_PX, width: GLOBE_SIZE_PX }}`); `apps/frontend/src/app/(public)/clima/page.test.tsx:209` - `expect(screen.getByTestId("weather-globe-slot")).toBeInTheDocument()` | ✅ PASS |
| Done-when task-06 QUANDO a query tem sucesso ENTÃO `WeatherGlobe` recebe `latitude`/`longitude` do resultado | `-23.5505` / `-46.6333` | `page.test.tsx:212-213` - `expect(globe).toHaveAttribute("data-latitude", "-23.5505")` / `"data-longitude", "-46.6333"` | ✅ PASS |
| Done-when task-06 QUANDO não há busca ou a busca falha ENTÃO ambas as props chegam `undefined` | `undefined` em `latitude` e `longitude` nos dois estados | `page.test.tsx:220-221` (sem `?city=`) e `:243-244` (404, após `findByRole("alert")`) - `expect(globe).toHaveAttribute("data-latitude", "")` / `"data-longitude", ""` | ✅ PASS |
| Done-when task-06 QUANDO a página renderiza ENTÃO o globo aparece **acima** do `WeatherSearchForm`, sempre | ordem no DOM e presença mesmo sem busca | `page.test.tsx:250` + `:257-259` - `expect(Array.from(document.querySelectorAll('[data-testid="weather-globe-slot"], form'))).toEqual([slot, form])`; presença sem busca em `:219` | ✅ PASS |
| Done-when task-06 QUANDO o globo está presente ENTÃO o fluxo de busca existente não regride (erro, `CurrentWeatherDisplay`, anúncio de status) | comportamento anterior intacto | `page.test.tsx` (11 testes, incluindo `:85` - `expect(screen.getByText("24°C"))`, mensagens de 404 e 503) verde com o globo montado; suíte frontend 954/954 | ✅ PASS |
| Done-when task-05 QUANDO o boundary é consumido ENTÃO expõe `WeatherGlobe` como export nomeado com a mesma `WeatherGlobeProps` | API pública preservada | `weather-globe-error-boundary.tsx:47` - `export { WeatherGlobeErrorBoundary as WeatherGlobe }`, tipado como `Component<WeatherGlobeProps, ...>`; consumido em `page.tsx:13` | ✅ PASS |
| Done-when task-07 QUANDO a fitness function roda ENTÃO não depende de nenhuma dependência nova | só `node:fs`, `node:path`, `node:url` | `apps/frontend/src/test/fitness/weather-globe-static-import-guard.ts:1-3` | ✅ PASS |
| FIX-02 (reconciliação documental) QUANDO um leitor segue os Passos da task-07 ENTÃO encontra exatamente o contrato do guard entregue | Passos, prosa e Critérios de Sucesso descrevendo o mesmo contrato | comparação byte a byte executada nesta rodada: o bloco do Passo 1 (`plans/task-07.md:55-136`) é idêntico a `apps/frontend/src/test/fitness/weather-globe-import.test.ts`, e o bloco do Passo 3 (`:146-225`, descontada a linha de comentário com o caminho) é idêntico a `weather-globe-static-import-guard.ts`; nenhuma das 8 menções ao boundary na task-07 o trata como violação | ✅ PASS |
| Coerência de estado pós-incidente QUANDO a task-07 é lida em HEAD ENTÃO diz `DONE` e os arquivos do guard existem | `Status: DONE` + os dois arquivos presentes | `plans/task-07.md:3` - `**Status:** DONE`; `ls apps/frontend/src/test/fitness/` lista `weather-globe-static-import-guard.ts` e `weather-globe-import.test.ts`; `git status --porcelain` vazio em e1ad3ed1 | ✅ PASS |

**Coverage (rodadas 1–3, histórico)**: 40/40 criteria PASS · 0 gaps · 0 spec-precision gaps — dos quais **2 linhas** (D1 e FR-007/D5) foram marcadas `SUPERSEDED` pela rodada 4, por terem sido invertidas pela revisão de spec de 2026-09-05.

**Coverage**: 8/9 criteria PASS · 1 gap · 0 spec-precision gaps (rodada 4, a rodada vigente — as rodadas 1–3 permanecem acima como registro histórico)

Nota de escopo da tabela: ela lista apenas critérios que o **spec** pina — os oito itens obrigatórios da sua seção "Testes" (L256-292), as decisões D1-D5 com observável definido e os Done-when das tasks que traduzem esses observáveis. Seis pontos que a rodada 2 havia registrado como linhas `⚠️ Spec-precision gap` foram reclassificados: eles não são critérios de aceite do spec, e sim detalhes de implementação (ou direção visual explicitamente não-vinculante). Estão documentados na seção seguinte, sem serem escondidos nem promovidos a critério.

---

## Observações Não-Bloqueantes (fora do contrato de aceite do spec)

Nenhum item abaixo é exigido pelo spec; nenhum bloqueia o veredito. Todos foram inspecionados e o código entregue está correto — o que falta é um sensor automatizado, e o spec não pede um.

| Ponto | Estado inspecionado | Por que não é critério de aceite |
| --- | --- | --- |
| Foco por teclado no globo | `aria-hidden="true"` nos dois ramos; nenhum elemento focável introduzido | D5 e o Done-when da task-03 definem apenas `aria-hidden` + flags de ponteiro; o spec não especifica nenhum observável de foco/`tabindex`. |
| Cleanup usa a instância capturada no setup | `weather-globe.tsx:67` (`const globe = globeRef.current`) + `:79-82` | O spec (D5) exige que o desmonte cancele a rotação e libere o contexto WebGL — isso **está** asserido na tabela. "Capturar em vez de reler o ref" é uma escolha de implementação da task-05, não um observável. |
| Ausência de `key` no `<WeatherGlobe>` | `page.tsx:62` sem `key` | O spec não menciona `key`; o observável que ele pina (um contexto WebGL por vida da página) é consequência, não critério declarado. |
| Identidade da instância de `Coordinate` | `get-current-weather-by-city.usecase.ts` repassa o `Coordinate` do geocoding | D3 pina o **valor** de `latitude`/`longitude` na resposta HTTP, não identidade de referência. |
| `width`/`height` explícitos (`GLOBE_SIZE_PX = 128`) | `weather-globe.tsx:133-134` | Detalhe de dimensionamento da task-03; o spec não fixa 128px em lugar nenhum. |
| Cor do marcador `#39e58c` | `weather-globe.tsx:21` (`MARKER_COLOR = "#39e58c"`) + `:139` (`pointColor={() => MARKER_COLOR}`) — bate exatamente com o hex do spec | O spec rotula a Especificação Visual como "norte, não pixel-final" (L38, L46) e não inclui asserção de cor entre os testes obrigatórios da seção "Testes". |

---

## Discrimination Sensor

### Rodada 4 — delta da revisão de 2026-09-05

Arquivos de lógica no diff desta rodada e plano declarado antes da execução:
`weather-globe.tsx` (modificado — props de textura, `enableRotate`; 12 ramos/operadores
contados: `||` e comparação em `:29`, ternário `:37`, guardas `:68`, `:70`, `:89`, `:91`,
`:104`, `:106`, `||` + comparação em `:116`, ternário `:121`) → 6 mutações planejadas
(mínimo proporcional 4); `weather-globe-constants.ts` (modificado — um literal exportado, 0
ramos) → 1 mutação planejada (mínimo 1). `weather-globe.test.tsx` é arquivo de teste, não
de lógica, e não recebe mutação.

Todas executadas com `run-mutation-batch.cjs` (`--isolate hardlink`, `--jobs auto`,
`realTreeDirtied: false` em todas as bateladas); `killed`/`survived` abaixo são **status de
saída observados**, nunca previstos.

| # | File:line | Mutation | Killed? |
| --- | --- | --- | --- |
| 1 | `apps/frontend/src/features/weather/components/weather-globe.tsx:23` | URL da textura `.../earth-dark.jpg` → `.../earth-blue-marble.jpg` (textura presente, porém não a do spec) | ✅ Killed |
| 2 | `apps/frontend/src/features/weather/components/weather-globe.tsx:140` | `globeImageUrl={GLOBE_TEXTURE_URL}` → `globeImageUrl={undefined}` (volta ao globo sem textura da decisão antiga) | ✅ Killed |
| 3 | `apps/frontend/src/features/weather/components/weather-globe.tsx:141` | `waitForGlobeReady={false}` → `waitForGlobeReady={true}` (reintroduz o modo de falha em que a textura trava o render) | ✅ Killed |
| 4 | `apps/frontend/src/features/weather/components/weather-globe.tsx:81` | `controls.enableRotate = true` → `= false` (desfaz D5.1/FR-014) | ✅ Killed |
| 5 | `apps/frontend/src/features/weather/components/weather-globe.tsx:142` | injeta `onGlobeClick={() => {}}` no `<Globe>` (clique deixa de ser inerte — viola FR-016) | ✅ Killed |
| 6 | `apps/frontend/src/features/weather/components/weather-globe.tsx:79` | `controls.enableZoom = false` → `= true` (checa se o delta enfraqueceu a asserção antiga de FR-015) | ✅ Killed |
| 7 | `apps/frontend/src/features/weather/components/weather-globe-constants.ts:9` | `export const GLOBE_SIZE_PX = 240` → `= 128` (reverte D6) | ❌ Survived |

**Depth (rodada 4)**: P0-full (7 mutações executadas com a ferramenta dedicada, acima do piso de 3 e do mínimo proporcional de 4+1)
**Result (rodada 4)**: 6 killed, 1 survived - FAIL ❌ (sobrevivente nu → fix task FIX-03)

O sobrevivente #7 **não é equivalente**: `GLOBE_SIZE_PX` alimenta `width`/`height` do `<Globe>`
(`weather-globe.tsx:136-137`), o `style` do wrapper (`:130-131`), o fallback
(`weather-globe-fallback.tsx:21-22`) e o slot reservado da página
(`app/(public)/clima/page.tsx:60`) — trocar 240 por 128 muda o DOM renderizado em quatro
lugares distintos, ou seja, é plenamente observável. Ele sobrevive apenas porque **nenhum
teste lê esse valor**, o que a busca da tabela de critérios já havia mostrado (Gap de D6).
Por isso não recebe bloco `## Equivalent Mutants`: é uma lacuna real de sensor, não um
mutante inobservável.

Validade do sensor nesta rodada: rodei também um **mutante de controle no-op** (`find`
idêntico a `replace`, em `weather-globe.tsx:81`). Ele sobreviveu ao subset **e** à suíte
completa (`decidedBy: "full"`, exit 0) — prova de que o snapshot executa a suíte de verdade,
e portanto de que os seis `killed` acima vêm de asserções e não de erro de infraestrutura.
(Esse controle não entra na contagem de profundidade: não é uma mutação.)

Post-sensor tree state: `git status --porcelain` empty, `git diff --stat` empty;
`realTreeDirtied: false` reportado pelo runner nas três bateladas desta rodada.

### Rodadas 2–3 (histórico)

| # | File:line | Mutation | Killed? |
| --- | --- | --- | --- |
| 1 | `apps/frontend/src/features/weather/components/weather-globe.tsx:118` | **o sobrevivente exato da rodada 2**: `markerTarget ? [markerTarget] : []` → `{ lat: number; lng: number }[] = []` (marcador nunca renderizado) | ✅ Killed |
| 2 | `apps/frontend/src/features/weather/components/weather-globe.tsx:118` | mesma mutação com outra forma sintática (`typeof markerTarget[] = []`), para descartar que o kill viesse de erro de parse e não de asserção | ✅ Killed |
| 3 | `apps/frontend/src/features/weather/components/weather-globe.tsx:118` | `[markerTarget]` → `[{ lat: 0, lng: 0 }]` (marcador presente, mas na coordenada errada) | ✅ Killed |
| 4 | `apps/frontend/src/features/weather/components/weather-globe.tsx:107` | remove a restauração do FIX-01 da rodada 2: `globe.controls().autoRotate = true` → `void globe.controls()` no caminho sem alvo | ✅ Killed |
| 5 | `apps/frontend/src/features/weather/components/weather-globe.tsx:70` | `controls.autoRotate = true` → `false` no efeito de montagem | ⚠️ Equivalent (ver EQ-01) |

**Depth (rodadas 2–3, histórico)**: P0-full (5 mutações na rodada 3 com a ferramenta dedicada `run-mutation-batch.cjs` e isolamento hardlink, sobre as 12 exaustivas da rodada 2 nos mesmos 4 arquivos de lógica — 17 no acumulado até e1ad3ed1)
**Result (rodadas 2–3, histórico)**: 4 killed, 1 equivalent (documented) - PASS ✅ naquele range

Por que o kill da mutação #1 é conclusivo: o único teste que assere `pointsData` **não** vazio é `weather-globe.test.tsx:208-218`, acrescentado em cdb1e968. A mutação #3 fecha a outra metade da dúvida — ela mantém `pointsData` com um elemento e mesmo assim é morta, o que só é possível se a asserção comparar os **valores** `-23.5505`/`-46.6333`, e não apenas a presença de um marcador. A mutação #2 existe para descartar a hipótese de que o kill de #1 viesse de um erro de sintaxe TypeScript em vez da suíte.

Nota metodológica de validade do sensor: rodei também um mutante de **controle no-op** (find idêntico a replace, em `weather-globe.tsx:118`), com o mesmo comando de teste (`cd apps/frontend && ./node_modules/.bin/vitest run`, binário invocado diretamente, sem `pnpm --filter`). Ele **sobreviveu** ao subset **e** à suíte completa (`exit 0` nos dois estágios) — prova de que o snapshot executa os testes de verdade e de que os "killed" acima vêm da suíte, não de erro de infraestrutura.

Post-sensor tree state: `git status --porcelain` empty, `git diff --stat` empty. O runner reportou `realTreeDirtied: false` em todas as bateladas.

---

## Equivalent Mutants

### EQ-01 - `apps/frontend/src/features/weather/components/weather-globe.tsx:70`
- **Mutation**: `controls.autoRotate = true` → `controls.autoRotate = false` no efeito de montagem do ramo interativo (mutação #5). Reexecutada em e1ad3ed1 nesta rodada: sobreviveu ao subset **e** à suíte completa (`decidedBy: "full"`, `exit 0`), confirmando que o teste de marcador acrescentado em cdb1e968 não a alcança.
- **Invariant**: depois da correção da rodada 2 (restauração de `autoRotate` no caminho sem alvo) esta atribuição virou redundante e nenhum input alcançável a torna observável. O terceiro efeito (`:99-111`) tem deps `[capability, latitude, longitude]`, um superconjunto das deps do efeito de montagem (`[capability]`), e guarda a mesma condição (`getInteractiveGlobe(capability, globeRef.current)` vs. `capability !== "webgl"` + `!globe`). Logo ele roda no mesmo commit, sempre depois, e sempre termina o commit com `autoRotate` restaurado: `true` imediatamente quando não há alvo (`:107`) ou `false` seguido de `true` via `setTimeout` quando há (`:44-52`). Como `controls.autoRotate` só é lido pelo loop de render (assíncrono, `requestAnimationFrame`), não existe momento em que o valor escrito na linha 70 seja observável antes de ser sobrescrito.
- **Attempted**: a única asserção capaz de matá-la seria instrumentar `controlsState` com um setter que registrasse a **sequência de escritas** e exigir que a primeira escrita do commit fosse `true` — isso assere ordem de atribuição interna entre efeitos, um detalhe de implementação explicitamente fora do critério do spec ("duração e easing da transição são detalhe de implementação"), e não um observável de comportamento. Nenhuma asserção de estado final distingue os dois programas.

---

## Gaps → Fix Tasks

### FIX-03 - D6 (`GLOBE_SIZE_PX = 240`) não tem nenhuma asserção automatizada

- **What**: acrescentar uma asserção que ancore o tamanho do globo no valor que o spec pina
  em D6 (240). A forma mais direta e alinhada ao padrão já usado no arquivo é asserir as
  props que o `<Globe>` recebe no teste do ramo interativo — `expect(globeProps.width).toBe(240)`
  e `expect(globeProps.height).toBe(240)` — ou, alternativamente, asserir o `style` do slot
  reservado (`weather-globe-slot`) em `page.test.tsx`. O importante é que a asserção fixe o
  **número do spec**, não que apenas leia a constante de volta (`expect(GLOBE_SIZE_PX).toBe(GLOBE_SIZE_PX)`
  é tautologia e continuaria deixando a mutação 240 → 128 viva).
- **Where**: `apps/frontend/src/features/weather/components/weather-globe.test.tsx` (teste do
  ramo interativo) e/ou `apps/frontend/src/app/(public)/clima/page.test.tsx` (slot reservado).
  Nenhuma alteração de produção é necessária — `weather-globe-constants.ts:9` já está no valor
  correto.
- **Verify**: reexecutar a mutação #7 desta rodada
  (`weather-globe-constants.ts:9`, `export const GLOBE_SIZE_PX = 240` → `= 128`) com
  `run-mutation-batch.cjs`; ela precisa passar de `survived` para `killed`.
- **Done-when**: `pnpm --filter frontend test -- --run` continua verde (956 testes) **e** a
  mutação 240 → 128 é morta pela suíte, fechando o Gap de D6 na tabela de critérios.

---

## Verdict

**FAIL ❌** (rodada 4, range `babb6a8d..a5ee3455`) - O núcleo do delta está provado: as três
mudanças que a revisão de spec de 2026-09-05 introduziu na renderização — textura de
mapa-múndi com a URL exata do `three-globe` (FR-017), `waitForGlobeReady={false}` mantendo o
`globeMaterial` como base imediata (FR-018) e `enableRotate = true` com zoom/pan ainda
desligados e nenhum handler de clique (FR-014, FR-015, FR-016, D5.1, D7) — estão asseridas em
`file:line` contra o valor exato do spec, e as seis mutações correspondentes morreram. A
correção de sensor exigida pelo próprio spec (Riscos L355) é real e não cosmética: o baseline
de `controlsState.enableRotate` é `false` tanto no `vi.hoisted` (`:27`) quanto no `afterEach`
(`:76`), e a mutação #4 confirma empiricamente que a asserção `toBe(true)` prova uma escrita
do componente. O que bloqueia é **D6**: o spec passou a pinar `GLOBE_SIZE_PX = 240` em uma
decisão titulada, mas nenhum teste do repositório lê esse valor — a mutação 240 → 128
sobrevive à suíte completa (955 testes, exit 0), então uma regressão do tamanho do globo
enviaria em silêncio. Um mutante de controle no-op sobreviveu igualmente à suíte completa,
confirmando que esse `survived` é leitura de sensor e não falha de infraestrutura. É um
sobrevivente nu, não equivalente (o valor muda o DOM em quatro pontos), e por isso vira
FIX-03. A linha D1 da rodada 3 (`globeImageUrl` `toBeUndefined()`) foi marcada `SUPERSEDED`,
assim como a metade `enableRotate = false` da linha FR-007/D5 — ambas eram verdadeiras em
`e1ad3ed1` e passaram a contradizer o spec vigente.

### Veredito histórico das rodadas 1–3 (preservado)

**PASS ✅** - As duas correções autorreportadas nas rodadas 3 (cdb1e968, e1ad3ed1) foram confirmadas por evidência independente e executada. O sobrevivente nu da rodada 2 está morto: apagar o marcador (`weather-globe.tsx:118` → `[]`) agora quebra a suíte, e a mutação que mantém o marcador porém na coordenada `{0,0}` também é morta, provando que a asserção de `weather-globe.test.tsx:213-217` é ancorada nos valores do spec e não apenas na presença de um array. A task-07 deixou de se contradizer: seus dois blocos de código são byte a byte idênticos aos arquivos entregues em `apps/frontend/src/test/fitness/`, o `Status: DONE` está em HEAD e os dois arquivos do guard existem na árvore limpa — o incidente de orquestração não deixou resíduo. O gate está verde nas três suítes (1933 testes, `next build` exit 0) e o chunk de 1854KB com `three-globe` segue fora dos 17 scripts iniciais de `/clima`, reverificado no build desta rodada. Os oito testes obrigatórios da seção "Testes" do spec (L256-292) estão todos presentes e ancorados em valor. Seis pontos que a rodada 2 tratara como lacunas de precisão do spec foram reclassificados como observações não-bloqueantes — nenhum deles é critério de aceite do spec (são detalhes de implementação de task ou direção visual que o próprio spec declara "norte, não pixel-final"), todos foram inspecionados e o código entregue está correto; ficam registrados na seção "Observações Não-Bloqueantes" para quem quiser endurecê-los no futuro.

**Lessons recorded**: L-038, L-039 (rodada 4) · L-036, L-037 (rodadas 2–3)
