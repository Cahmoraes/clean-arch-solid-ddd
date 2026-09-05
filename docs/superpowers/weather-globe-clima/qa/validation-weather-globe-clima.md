# weather-globe-clima - Independent Validation

**Date**: 2026-09-05
**Spec**: docs/superpowers/weather-globe-clima/specs/weather-globe-clima-design.md
**PRD**: docs/superpowers/weather-globe-clima/prd/prd-weather-globe-clima.md
**Diff range**: 682a087c..6b1e3cb5
**Verifier**: INDEPENDENT
**Sensor depth**: 13 mutations across 7 logic files — weather-globe.tsx: 5/13 branches, use-globe-capability.ts: 2/4 branches, weather-globe-error-boundary.tsx: 1/1 branches, weather-globe-static-import-guard.ts: 2/6 branches, page.tsx: 1/2 branches, weather-controller.ts: 1/3 branches, get-current-weather-by-city.usecase.ts: 1/1 branches

---

## Gate Check

- **Command**: `pnpm --filter backend test:run` · `pnpm --filter backend test:business-flow` · `pnpm --filter frontend test -- --run`
- **Result**: 1925 passed (767 backend unit + 212 backend business-flow + 946 frontend), 0 failed, 0 skipped - exit 0 nas três suítes
- **Baseline**: ran — as três suítes foram reexecutadas por mim em 6b1e3cb5 com árvore limpa (`git status --porcelain` vazio), em vez de reaproveitar o autorrelato do fix-implementer. Os números conferiram exatamente com o baseline recebido.
- **Typecheck/build**: `next build` (apps/frontend) **passou** — compilação + TypeScript OK, 19 páginas geradas, exit 0. `pnpm --filter backend tsc:check` **falha com 2 erros TS2554**, ambos pré-existentes e alheios a este diff (ver Pre-Existing Failures); nenhum erro de tipo novo foi introduzido pela feature.

---

## Pre-Existing Failures

| Failing test | Baseline SHA | Evidence |
| --- | --- | --- |
| `tsc:check` — `in-memory-weather-gateway.test.ts(10,50): error TS2554: Expected 0 arguments, but got 1` | 682a087c | O arquivo do teste, o gateway (`in-memory-weather-gateway.ts:16` declara `getCurrentWeather()` sem parâmetros), a interface `weather-gateway.ts` e o `tsconfig.json` estão todos **inalterados** em `git diff 682a087c..6b1e3cb5`; o descasamento é interno a arquivos que este diff não toca. Último commit a mexer neles foi `a895d115`, ancestral de 682a087c. |
| `tsc:check` — `in-memory-weather-gateway.test.ts(25,50): error TS2554: Expected 0 arguments, but got 1` | 682a087c | Mesma causa, segunda chamada no mesmo arquivo. Vitest usa esbuild (apaga tipos), por isso os 767 testes unitários passam apesar do erro de tipo. |

---

## Spec-Anchored Acceptance Criteria

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion expression | Result |
| --- | --- | --- | --- |
| FR-001 QUANDO o ramo interativo monta ENTÃO a auto-rotação é ligada | `controls.autoRotate = true`, `autoRotateSpeed = 0.4` | `apps/frontend/src/features/weather/components/weather-globe.test.tsx:119` - `expect(controlsState.autoRotate).toBe(true)`; `:120` - `expect(controlsState.autoRotateSpeed).toBe(0.4)` | ✅ PASS |
| FR-001/D5 QUANDO o ramo interativo monta ENTÃO `controls.enabled` permanece `true` (desligá-lo mataria o giro) | `enabled` nunca setado como `false` (spec D5, linhas 163-169) | `weather-globe.test.tsx:131` - `expect(controlsState.enabled).toBe(true)`; produção em `weather-globe.tsx:47-53` | ✅ PASS |
| FR-007/D5 QUANDO o ramo interativo monta ENTÃO arrastar/zoom/pan ficam desligados pelos flags dos handlers | `enableZoom = false`, `enablePan = false`, `enableRotate = false` | `weather-globe.test.tsx:121-123` - `expect(controlsState.enableZoom/enablePan/enableRotate).toBe(false)` | ✅ PASS |
| FR-007 QUANDO qualquer ramo renderiza ENTÃO o elemento é decorativo para tecnologia assistiva | `aria-hidden="true"` nos dois ramos | `weather-globe.test.tsx:84-87` (fallback) e `:95-98` (canvas) - `toHaveAttribute("aria-hidden", "true")`; `:99-101` - `objectContaining({ enablePointerInteraction: false })` | ✅ PASS |
| FR-007 QUANDO o usuário navega por teclado ENTÃO o globo não captura foco | não pinado no spec (D5 e o Done-when da task-03 só definem `aria-hidden` + flags de ponteiro; nenhum observável de foco/`tabindex` é especificado) | - | ⚠️ Spec-precision gap |
| FR-002 QUANDO `/clima` carrega ENTÃO o chunk pesado do globo fica fora do bundle inicial | carregado por `next/dynamic({ ssr: false })`; verificável no output do `next build` | `weather-globe-error-boundary.tsx:15-19` - `dynamic(() => import("./weather-globe")..., { ssr: false })`; evidência de build: o único chunk que contém `three-globe`/`THREE.WebGLRenderer` é `static/chunks/0lfklklmeya1q.js` (1854KB) e **não** está entre os 17 scripts iniciais de `/clima` (1149KB no total) | ✅ PASS |
| FR-011 QUANDO a fitness function varre `apps/frontend/src` hoje ENTÃO não há violação | lista vazia | `apps/frontend/src/test/fitness/weather-globe-import.test.ts:9-11` - `expect(findForbiddenStaticGlobeImports()).toEqual([])` | ✅ PASS |
| FR-011 QUANDO um arquivo importa estaticamente `react-globe.gl`, `three`, `three-globe` ou `globe.gl` ENTÃO o teste falha | detecta raiz e subpath, `from`, `require` e side-effect-only | `weather-globe-import.test.ts:14-18`, `:35-39`, `:41-45`, `:47-51`, `:53-60`, `:62-65`, `:67-71` - `expect(hasForbiddenStaticGlobeImport(content)).toBe(true)` | ✅ PASS |
| FR-011 QUANDO um arquivo importa estaticamente o módulo real `weather-globe` ENTÃO o teste falha | violação apontada | `weather-globe-import.test.ts:20-24` - `expect(hasForbiddenStaticGlobeImport(...weather-globe")).toBe(true)` | ✅ PASS |
| FR-011 QUANDO o carregamento é via `dynamic(() => import(...))` ENTÃO continua permitido | predicado só considera `from`/`require`/`import "..."` | `weather-globe-import.test.ts:26-33` - `expect(hasForbiddenStaticGlobeImport(content)).toBe(false)` | ✅ PASS |
| FR-011 (Done-when task-07 L192-198 + spec "Testes" L281-285) QUANDO `page.tsx` importa estaticamente `weather-globe-error-boundary` ENTÃO o teste deveria falhar | contradição interna do spec: D5 (L145-148, atualizado neste range) **exige** exatamente esse import estático, enquanto a seção "Testes" (L281-285) e o Done-when da task-07 ainda o **proíbem** | implementação segue D5: `weather-globe-static-import-guard.ts:31-32` (regex não casa o boundary), `weather-globe-import.test.ts:73-79` - `expect(...).toBe(false)`, `page.tsx:13` importa o boundary estaticamente | ⚠️ Spec-precision gap |
| FR-003 QUANDO uma busca retorna resultado ENTÃO a câmera anima até a coordenada | `pointOfView({ lat, lng, altitude: 1.5 }, 1000)` com os valores da cidade | `weather-globe.test.tsx:180-183` - `expect(pointOfViewMock).toHaveBeenCalledWith({ lat: -23.5505, lng: -46.6333, altitude: 1.5 }, 1000)` | ✅ PASS |
| FR-012 QUANDO ainda não houve busca ENTÃO o globo gira sem marcador e sem `pointOfView` | `pointsData: []` e `pointOfView` nunca chamado | `weather-globe.test.tsx:191` - `expect(pointOfViewMock).not.toHaveBeenCalled()`; `:192-194` - `objectContaining({ pointsData: [] })` | ✅ PASS |
| FR-013 QUANDO uma nova busca chega antes do fim da animação ENTÃO a coordenada mais nova prevalece, sem fila | último `pointOfView` com o alvo mais recente | `weather-globe.test.tsx:205-208` - `expect(pointOfViewMock).toHaveBeenLastCalledWith({ lat: -22.9068, lng: -43.1729, altitude: 1.5 }, 1000)` | ✅ PASS |
| D5 QUANDO a câmera transiciona ENTÃO a auto-rotação é pausada e retomada após `CAMERA_TRANSITION_MS` | `autoRotate=false` durante, `true` após 1000ms; nova busca reinicia a pausa | `weather-globe.test.tsx:140` / `:146` e `:165` / `:171` - `expect(controlsState.autoRotate).toBe(false|true)` | ✅ PASS |
| FR-009 QUANDO uma busca de clima falha ENTÃO o globo mantém a última posição válida | `pointOfView` não é chamado de novo | `weather-globe.test.tsx:220` - `expect(pointOfViewMock).not.toHaveBeenCalled()` (cenário "props não mudam") | ⚠️ Spec-precision gap |
| FR-009/FR-001 QUANDO uma busca falha ENTÃO o globo mantém a **rotação** válida | rotação automática preservada (FR-009: "última posição/rotação válida") | defeito reproduzido: com falha dentro de `CAMERA_TRANSITION_MS`, `controls.autoRotate` fica `false` **permanentemente** (`weather-globe.tsx:82` pausa, `:90` `clearTimeout` no cleanup, `:76` `if (!target) return` nunca restaura). Nenhuma asserção cobre o caminho real (`latitude`/`longitude` → `undefined`) | ❌ Gap (uncovered) |
| FR-005 QUANDO WebGL está indisponível ENTÃO o fallback estático é renderizado | `useGlobeCapability()` retorna `"fallback"` e `WeatherGlobe` renderiza o fallback | `use-globe-capability.test.ts:58` - `expect(result.current).toBe("fallback")`; `weather-globe.test.tsx:84-87` - fallback no DOM | ✅ PASS |
| FR-006 QUANDO `prefers-reduced-motion: reduce` está ativo (mesmo com WebGL) ENTÃO o fallback é renderizado | `"fallback"`, inclusive em mudança posterior via evento `change` | `use-globe-capability.test.ts:67` e `:79` - `expect(result.current).toBe("fallback")` | ✅ PASS |
| FR-006 (Done-when task-03) QUANDO o hook desmonta ENTÃO o listener de `matchMedia` é removido | `removeEventListener` no cleanup | implementado em `use-globe-capability.ts:33`, mas nenhum teste desmonta o hook e emite `change` depois | ❌ Gap (uncovered) |
| FR-008 QUANDO o `WeatherGlobe` lança em tempo de render ENTÃO o `ErrorBoundary` troca pelo fallback | fallback estático no lugar do globo | `weather-globe-error-boundary.test.tsx:31-36` - `expect(await screen.findByTestId("weather-globe-fallback")).toBeInTheDocument()` | ✅ PASS |
| FR-008 QUANDO o chunk do globo falha ao carregar ENTÃO o boundary também captura | falha de fetch do chunk vira erro de render (spec D5 L145-148) | `weather-globe-error-boundary.test.tsx:38-48` - `vi.doMock` que lança + `findByTestId("weather-globe-fallback")`; suportado por `src/test/mocks/next-dynamic.tsx:22-25` (rejeição relançada no render) | ✅ PASS |
| FR-008 (spec "Testes" L278) QUANDO o globo lança ENTÃO `CurrentWeatherDisplay` continua renderizando | card de clima permanece na tela com o globo em falha | nenhum teste renderiza a página com o globo lançando — o teste do boundary só verifica o próprio fallback, e `page.test.tsx:17-32` mocka o boundary por um stub que nunca falha | ❌ Gap (uncovered) |
| FR-008/D5 QUANDO o canvas emite `webglcontextlost` ENTÃO troca para o fallback sem erro de render | fallback substitui o canvas | `weather-globe.test.tsx:241` - `expect(screen.getByTestId("weather-globe-fallback")).toBeInTheDocument()`; `:242` - `queryByTestId("weather-globe-canvas")).not.toBeInTheDocument()` | ✅ PASS |
| FR-010 QUANDO o componente desmonta ENTÃO o contexto WebGL é liberado e o loop parado | `renderer().forceContextLoss()` chamado e `controls.autoRotate = false` | `weather-globe.test.tsx:229` - `expect(forceContextLossMock).toHaveBeenCalledTimes(1)`; `:230` - `expect(controlsState.autoRotate).toBe(false)` | ✅ PASS |
| FR-010 (Done-when task-05) QUANDO o cleanup roda ENTÃO usa a instância capturada no setup, não uma releitura do ref | `const globe = globeRef.current` no setup | `weather-globe.tsx:42` + `:56` (inspeção); nenhuma asserção distingue as duas formas — o teste de unmount passaria em ambas | ⚠️ Spec-precision gap |
| FR-010 (Done-when task-05/06) QUANDO uma nova busca ocorre ENTÃO o globo não é remontado (sem `key` derivada de cidade/coordenada) | um único contexto WebGL por vida da página | `page.tsx:62` não usa `key` (inspeção); nenhuma asserção nem regra de fitness impede a reintrodução de uma `key` | ⚠️ Spec-precision gap |
| FR-004 (Done-when task-01) QUANDO o use case resolve a cidade ENTÃO retorna o `Coordinate` do geocoding | `coordinate.latitude`/`longitude` da cidade buscada | `apps/backend/src/weather/application/use-case/get-current-weather-by-city.usecase.test.ts:29-30` - `expect(currentWeather.coordinate.latitude).toBe(-23.5505)` / `.longitude).toBe(-46.6333)` | ✅ PASS |
| FR-004 (Done-when task-01) QUANDO o use case retorna ENTÃO é a **mesma instância** de `Coordinate`, sem recriação | identidade de referência | apenas os valores são asseridos (`usecase.test.ts:29-30`); nenhuma asserção de identidade (`toBe(coordinate)`) | ⚠️ Spec-precision gap |
| FR-004 QUANDO `GET /weather?city=` responde com sucesso ENTÃO o corpo traz `latitude`/`longitude` planos na raiz | `{ city, temperature, latitude, longitude }`, aditivo | `apps/backend/src/weather/infra/controller/weather-controller.business-flow-test.ts:41-46` - `expect(response.body).toEqual({ city: "São Paulo", temperature: {...}, latitude: -23.5505, longitude: -46.6333 })` (o `toEqual` estrito também prova que nada foi removido/renomeado) | ✅ PASS |
| FR-004 (D3 "Atenção de implementação") QUANDO o Fastify serializa ENTÃO os campos novos estão no `weatherResponseSchema` | campos declarados no schema, senão são descartados silenciosamente | `weather-controller.ts:35-36` - `latitude: z.number()...`, `longitude: z.number()...`; provado end-to-end pelo teste HTTP acima | ✅ PASS |
| FR-004 (Done-when task-02) QUANDO `@repo/api-types` é regenerado ENTÃO o tipo da resposta 200 de `/weather` inclui os campos | `latitude: number`, `longitude: number` | `packages/api-types/index.d.ts:4636-4639`; consumido tipado em `use-weather-query.ts` e validado pelo TypeScript do `next build` | ✅ PASS |
| D1 QUANDO o globo renderiza ENTÃO não usa textura externa, e sim `globeMaterial` sólido | `globeImageUrl` ausente, `globeMaterial` presente | `weather-globe.test.tsx:110-111` - `expect(globeProps.globeImageUrl).toBeUndefined()` / `expect(globeProps.globeMaterial).toBeDefined()` | ✅ PASS |
| Done-when task-03 QUANDO o `<Globe>` monta ENTÃO recebe `width`/`height` explícitos (`GLOBE_SIZE_PX = 128`), nunca o default de viewport | 128 em ambos | `weather-globe.tsx:115-116` (inspeção); o spy de props não assere `width`/`height` | ⚠️ Spec-precision gap |
| Done-when task-03 QUANDO as dependências são declaradas ENTÃO `react-globe.gl` e `three` em `dependencies` e `@types/three` em `devDependencies` | presentes | `apps/frontend/package.json:45`, `:53`, `:68` | ✅ PASS |
| Done-when task-06 QUANDO a página monta ENTÃO o espaço do globo é reservado por wrapper de altura fixa com `aria-hidden` | wrapper 128×128 presente independentemente do chunk | `page.tsx:56-61`; `page.test.tsx:209` - `expect(screen.getByTestId("weather-globe-slot")).toBeInTheDocument()` | ✅ PASS |
| Done-when task-06 QUANDO a query tem sucesso ENTÃO `WeatherGlobe` recebe `latitude`/`longitude` do resultado | `-23.5505` / `-46.6333` | `page.test.tsx:212-213` - `expect(globe).toHaveAttribute("data-latitude", "-23.5505")` / `"data-longitude", "-46.6333"` | ✅ PASS |
| Done-when task-06 QUANDO não há busca ou a busca falha ENTÃO ambas as props chegam `undefined` | `undefined` em `latitude` e `longitude` | nenhum teste da página assere o caso `undefined` (o stub em `page.test.tsx:28-29` mapeia `undefined` para `""`, mas nenhuma asserção o exercita) | ❌ Gap (uncovered) |
| Done-when task-06 QUANDO a página renderiza ENTÃO o globo aparece **acima** do `WeatherSearchForm`, sempre | ordem no DOM e presença mesmo sem busca | presença asserida só no cenário de sucesso (`page.test.tsx:207`); a ordem relativa ao formulário não é asserida em lugar nenhum | ⚠️ Spec-precision gap |
| Done-when task-06 QUANDO o globo está presente ENTÃO o fluxo de busca existente não regride (erro, `CurrentWeatherDisplay`, anúncio de status) | comportamento anterior intacto | `page.test.tsx` (7 testes, incluindo `:210` - `expect(await screen.findByText("24°C")).toBeInTheDocument()`) verde com o globo montado; suíte frontend 946/946 | ✅ PASS |
| Done-when task-05 QUANDO o boundary é consumido ENTÃO expõe `WeatherGlobe` como export nomeado com a mesma `WeatherGlobeProps` | API pública preservada | `weather-globe-error-boundary.tsx:47` - `export { WeatherGlobeErrorBoundary as WeatherGlobe }`, tipado como `Component<WeatherGlobeProps, ...>` (`:21-24`); consumido em `page.tsx:13` | ✅ PASS |
| Done-when task-07 QUANDO a fitness function roda ENTÃO não depende de nenhuma dependência nova | só `node:fs`, `node:path`, `node:url` | `weather-globe-static-import-guard.ts:1-3` | ✅ PASS |

**Coverage**: 27/35 criteria PASS · 4 gaps · 4 spec-precision gaps

---

## Discrimination Sensor

| # | File:line | Mutation | Killed? |
| --- | --- | --- | --- |
| 1 | `apps/frontend/src/features/weather/components/weather-globe.tsx:51` | reintroduz `controls.enabled = false` antes de `enableZoom = false` (a classe exata do bug crítico corrigido na rodada anterior) | ✅ Killed |
| 2 | `apps/frontend/src/features/weather/components/weather-globe.tsx:45` | `controls.autoRotate = true` → `false` na montagem | ✅ Killed |
| 3 | `apps/frontend/src/features/weather/components/weather-globe.tsx:84` | troca `lat`/`lng` no alvo de `pointOfView` | ✅ Killed |
| 4 | `apps/frontend/src/features/weather/components/weather-globe.tsx:56` | remove `globe.renderer().forceContextLoss()` do cleanup de unmount | ✅ Killed |
| 5 | `apps/frontend/src/features/weather/components/weather-globe.tsx:99` | `pointsData` pré-busca `[]` → `[{ lat: 0, lng: 0 }]` | ✅ Killed |
| 6 | `apps/frontend/src/features/weather/components/use-globe-capability.ts:19` | nega o guard `if (prefersReducedMotion) return "fallback"` | ✅ Killed |
| 7 | `apps/frontend/src/features/weather/components/use-globe-capability.ts:32` | remove `addEventListener("change", handleChange)` | ✅ Killed |
| 8 | `apps/frontend/src/features/weather/components/weather-globe-error-boundary.tsx:36` | desativa o ramo `if (this.state.hasError)` | ✅ Killed |
| 9 | `apps/frontend/src/test/fitness/weather-globe-static-import-guard.ts:32` | remove `three` do padrão de especificadores proibidos | ✅ Killed |
| 10 | `apps/frontend/src/test/fitness/weather-globe-static-import-guard.ts:64` | `shouldCheckFile` deixa de excluir arquivos de teste | ✅ Killed |
| 11 | `apps/frontend/src/app/(public)/clima/page.tsx:62` | props do globo fixadas em `undefined` (deixa de propagar `data?.latitude/longitude`) | ✅ Killed |
| 12 | `apps/backend/src/weather/infra/controller/weather-controller.ts:113` | `latitude` passa a ler `coordinate.longitude` | ✅ Killed |
| 13 | `apps/backend/src/weather/application/use-case/get-current-weather-by-city.usecase.ts:48` | remove a propagação `coordinate: coordinateOrError.value` | ✅ Killed |

**Depth**: P0-full (13 mutações, ferramenta dedicada `run-mutation-batch.cjs`, isolamento hardlink)
**Result**: 13/13 killed - PASS ✅

Nota metodológica de validade do sensor: a primeira execução usou `pnpm --filter <app> ...` como comando de teste e reportou 10/10 "killed" em ~1,3s por job. Cinco mutantes de controle **no-op** (find == replace) foram então injetados e também apareceram como "killed" — prova de que os kills eram do ambiente, não dos testes: dentro do snapshot hardlink o `pnpm --filter` dispara verificação de dependências e aborta com `ERR_PNPM_UNSAFE_MODULES_DIR`, porque `node_modules` é junção para fora da raiz do snapshot. Os planos foram reescritos para invocar os binários diretamente (`./node_modules/.bin/vitest`), os 5 controles no-op passaram a **sobreviver** (exit 0 no subset) e só então as 13 mutações reais foram executadas e mortas. Todos os resultados desta tabela vêm da execução válida.

Post-sensor tree state: `git status --porcelain` empty, `git diff --stat` empty. O runner reportou `realTreeDirtied: false` em todas as bateladas; a árvore real nunca foi mutada.

---

## Gaps → Fix Tasks

### FIX-01 - Auto-rotação morre permanentemente quando uma busca falha durante a transição de câmera
- **What**: o efeito de câmera pausa `controls.autoRotate` e agenda a retomada num `setTimeout` limpo no cleanup. Quando as props mudam para `latitude`/`longitude` `undefined` (o que a página faz em toda busca pendente e em toda busca com erro, já que `useWeatherQuery` não usa `placeholderData` e a `queryKey` inclui a cidade), o cleanup cancela o timer e a nova execução do efeito retorna em `if (!target) return` **antes** de restaurar `autoRotate`. O globo para de girar para sempre. Corrigir restaurando a rotação no caminho sem alvo — por exemplo, registrando o cleanup que reativa `controls.autoRotate` independentemente de haver alvo, ou reativando explicitamente quando `target` é `undefined`.
- **Where**: `apps/frontend/src/features/weather/components/weather-globe.tsx:74-91`
- **Verify**: teste em `weather-globe.test.tsx` que, com timers falsos, renderiza com coordenadas, avança menos que `CAMERA_TRANSITION_MS`, re-renderiza com `latitude`/`longitude` `undefined`, avança bem além de `CAMERA_TRANSITION_MS` e assere `expect(controlsState.autoRotate).toBe(true)`. Reproduzi exatamente esse cenário num snapshot isolado e ele falha hoje (`autoRotate` observado: `false`).
- **Done-when**: o teste acima passa; uma mutação que remova a restauração da auto-rotação é morta pela suíte; FR-009 ("mantém sua última posição/rotação válida") e FR-001 passam a valer também no caminho de falha.

### FIX-02 - Nenhum teste prova que o clima continua na tela quando o globo falha (FR-008 / US-04)
- **What**: a seção "Testes" do spec exige explicitamente que, com um throw simulado do globo, `CurrentWeatherDisplay` continue renderizando — e a nota de QA da US-04 diz que só um cenário com falha induzida comprova a história. Hoje o teste do boundary verifica apenas o próprio fallback, e o teste da página substitui o boundary por um stub que nunca falha. Adicionar um teste de página que monte o `/clima` com o módulo do globo lançando e assere, na mesma árvore, o fallback estático **e** a temperatura.
- **Where**: `apps/frontend/src/app/(public)/clima/page.test.tsx` (ou um novo cenário em `weather-globe-error-boundary.test.tsx` que renderize o card junto)
- **Verify**: o novo teste falha se o `ErrorBoundary` for removido e passa com ele presente.
- **Done-when**: existe uma asserção que, com o globo em falha induzida, encontra simultaneamente `weather-globe-fallback` e o texto da temperatura.

### FIX-03 - Remoção de listeners no cleanup não é asserida
- **What**: dois Done-when pinam remoção de listener no cleanup — `matchMedia` (`change`) na task-03 e `webglcontextlost` na task-05. Ambos estão implementados, mas nenhum teste desmonta e depois emite o evento para provar que o listener sumiu (um `setState` após unmount passaria despercebido).
- **Where**: `apps/frontend/src/features/weather/components/use-globe-capability.ts:33`, `apps/frontend/src/features/weather/components/weather-globe.tsx:70-71`
- **Verify**: em `use-globe-capability.test.ts`, desmontar o hook e emitir `change`, asserindo que nenhum listener restou no stub; em `weather-globe.test.tsx`, desmontar e disparar `webglcontextlost` no canvas sem que nada mude.
- **Done-when**: mutações que removam as chamadas de `removeEventListener` passam a ser mortas pela suíte.

### FIX-04 - Props `undefined` do globo (sem busca / busca com erro) não são asseridas na página
- **What**: o Done-when da task-06 pina que, sem busca ou com busca falha, `WeatherGlobe` recebe `undefined` em ambas as props — o contrato do qual FR-009 e FR-012 dependem no nível da página. Nenhum teste da página cobre esses dois estados. Cobrir também a ordem no DOM (globo acima do `WeatherSearchForm`) e a presença do globo sem nenhuma busca.
- **Where**: `apps/frontend/src/app/(public)/clima/page.test.tsx`
- **Verify**: cenários sem `city` na query string e com resposta 404/500 do MSW, asserindo `data-latitude=""`/`data-longitude=""` e a presença do globo; ordem verificada com `compareDocumentPosition` ou consulta de irmãos.
- **Done-when**: existe asserção para os três estados (sem busca, sucesso, erro) e para a ordem relativa ao formulário.

### FIX-05 - Contradição interna do spec sobre o import estático do `WeatherGlobeErrorBoundary`
- **What**: a D5 (linhas 145-148, atualizada neste range) exige que o `dynamic()` viva **dentro** do boundary e que o boundary seja importado estaticamente pela página — que é o que a implementação faz. Mas a seção "Testes" (linhas 281-285) e o Done-when da task-07 (linhas 192, 195-198) continuam exigindo que a fitness function **falhe** exatamente nesse import, inclusive nomeando `page.tsx` como não-allowlistada. Nenhum documento foi reconciliado; qualquer revisor futuro lendo a seção "Testes" concluirá que a fitness function está errada. Atualizar spec e task-07 para refletir a decisão vigente de D5.
- **Where**: `docs/superpowers/weather-globe-clima/specs/weather-globe-clima-design.md:281-285`, `docs/superpowers/weather-globe-clima/plans/task-07.md:192,195-198`; além disso `task-04.md:330-332` ainda prescreve `controls().enabled = false`, o oposto da D5 corrigida (linhas 163-169) e do código entregue.
- **Verify**: reler os três documentos e confirmar que nenhum contradiz a D5 vigente nem o guard entregue.
- **Done-when**: spec, task-04 e task-07 descrevem o mesmo contrato que `weather-globe-static-import-guard.ts` e `weather-globe.tsx` implementam.

---

## Verdict

**FAIL ❌** - A fatia central da feature está sólida e bem sensoreada: 13/13 mutações mortas (incluindo a reintrodução de `controls.enabled = false`, a classe exata do bug crítico da rodada anterior), suíte verde nas três execuções que eu mesmo rodei, e evidência dura de build de que o chunk de 1854KB com `three`/`three-globe` fica fora dos 17 scripts iniciais de `/clima`. O que reprova é um defeito comportamental real e não coberto: quando uma busca falha dentro da janela de `CAMERA_TRANSITION_MS`, `controls.autoRotate` fica `false` permanentemente e o globo para de girar — reproduzido por mim em snapshot isolado —, violando FR-009 e FR-001; somam-se a isso três Done-when pinados sem asserção nenhuma e uma contradição interna do spec sobre o import estático do boundary.

**Lessons recorded**: L-028, L-029, L-030, L-031, L-032
