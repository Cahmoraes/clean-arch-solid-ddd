# Task 8: `WeatherGlobe` — textura de mapa-múndi, rotação manual e tamanho 240px [FR-014, FR-015, FR-016, FR-017, FR-018]

**Status:** DONE
**PRD:** `../prd/prd-weather-globe-clima.md`
**Spec:** `../specs/weather-globe-clima-design.md`
**Tier:** standard
**Depends on:** task-03, task-04, task-05, task-06, task-07

## Visão Geral

Revisão (2026-09-05) do `WeatherGlobe` já implementado (tasks 1-7, `DONE`): adiciona
textura de mapa-múndi (`globeImageUrl` + `waitForGlobeReady={false}`, D1 revisado/FR-017/
FR-018), habilita rotação manual por arrastar/tocar (`enableRotate = true`, D5.1/FR-014,
mantendo `enableZoom`/`enablePan` em `false` — FR-015) e aumenta o tamanho do globo de
128px para 240px (D6). Todas essas mudanças tocam o mesmo componente e seus dois arquivos
de suporte (`weather-globe.tsx`, `weather-globe-constants.ts`) mais a suíte
`weather-globe.test.tsx` — dividir em tasks separadas deixaria um estado intermediário sem
teste (ex.: `enableRotate = true` sem o teste estrutural que garante que nenhum clique
dispara busca, FR-016), então ficam juntas numa única task com um teste por comportamento.

`enablePointerInteraction={false}` e a ausência de handlers `onGlobeClick`/`onPointClick`
já garantem, desde a implementação original (task-04), que nenhum clique/toque sobre o
globo dispara busca ou seleciona localidade — FR-016 ganha aqui um teste estrutural
explícito (guarda de regressão), não uma mudança de comportamento. `GLOBE_SIZE_PX` 240px
(D6) é só uma mudança de constante sem comportamento a testar (fidelidade visual, ver
abaixo).

**Atenção ao sensor de mutação (ver Riscos na spec):** o mock de `controls()` em
`weather-globe.test.tsx` (`controlsState`, `vi.hoisted`) inicializa e reseta
`enableRotate` para `true` por padrão. Só trocar a asserção do teste de `false` para
`true` (sem também inverter esse baseline do mock para `false`) faz o teste passar mesmo
que a produção nunca escreva `controls.enableRotate = true` — o Step 6 abaixo cobre as
duas pontas.

## Arquivos

- Modify: `apps/frontend/src/features/weather/components/weather-globe.tsx`
- Modify: `apps/frontend/src/features/weather/components/weather-globe-constants.ts`
- Modify: `apps/frontend/src/features/weather/components/weather-globe.test.tsx`

### Conformidade com as Skills Padrão

- `vercel-react-best-practices`: mudança em componente React client-only (`next/dynamic`)
  que mexe em efeitos (`useEffect`) e refs (`GlobeMethods`) — garante que o padrão de
  cleanup/dependências do efeito de montagem continue correto ao adicionar as novas props.
- `wcag-audit-patterns`: o componente altera comportamento de interação (rotação manual por
  arrastar/toque) num elemento hoje `aria-hidden="true"` sem suporte a teclado (D7) — exige
  confirmar que a mudança não introduz uma expectativa de acessibilidade nova (ex.: foco,
  navegação por teclado) que precisaria de tratamento, mesmo quando a decisão é mantê-la
  fora de escopo.
- `test-antipatterns`: a task reescreve testes existentes que mockam `react-globe.gl` e o
  objeto `controls()` — evita mockar além do necessário e garante que o teste estrutural
  novo (ausência de handlers de clique) e o teste de mutação de `enableRotate` verificam o
  comportamento real da produção, não o valor inicial do mock.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/weather-globe-clima-visual-textura.md`
  (textura `earth-dark.jpg` sobre `globeMaterial` sólido `#061410`, tamanho 240×240px
  dentro da coluna `max-w-md` da página `/clima`, marcador `#39e58c` inalterado).
- **Fonte de design original:** nenhuma; layout definido via mockup do companion (ver
  "Fonte de design original" no mockup curado).
- **Confirmar com o usuário:** não há URL de ferramenta de design a confirmar — o mockup
  curado é a única fonte; a renderização real usa `react-globe.gl` (WebGL), não o SVG
  ilustrativo do mockup (ver "Fidelidade" no mockup).
- **Ferramentas de fidelidade visual (descobrir no ambiente):** nenhuma ferramenta de
  design-to-code ou teste visual configurada neste repo para esta tela; construir
  manualmente a partir do mockup curado. A ordem de aplicação `globeMaterial`×`globeImageUrl`
  (ver spec, D1 "Risco residual aceito") só é verificável por inspeção visual real — depois
  de implementar, confirmar manualmente no navegador (ou capturar evidência em
  `qa/evidence/`) que a textura de fato aparece sobre o globo, já que nenhum teste com mock
  prova isso.
- **Decisões visuais já tomadas (não refazer):** textura realista escolhida sobre vetor
  estilizado; 240px valida sem alterar a largura da coluna `max-w-md` (448px); fundo
  gradiente radial (`GLOBE_BACKGROUND_STYLE`) e cor do marcador inalterados.

## Passos

- **Step 0: Confirmar fonte de design e ferramentas de fidelidade**

  Sem fonte de design original e sem ferramenta de design-to-code configurada neste repo
  para esta tela (ver `### Fidelidade Visual` acima) — construir diretamente a partir do
  mockup curado `../specs/mockups/weather-globe-clima-visual-textura.md`, que já reflete os
  tokens decididos (textura, tamanho, cores).

- **Step 1: Escrever o teste que falha — textura do globo (FR-017/FR-018)**

  Em `apps/frontend/src/features/weather/components/weather-globe.test.tsx`, substituir o
  teste existente (linhas 104-112) por:

  ```typescript
  test("configura a textura de mapa-múndi sem bloquear o render enquanto ela carrega", () => {
    useGlobeCapabilityMock.mockReturnValue("webgl")

    render(<WeatherGlobe />)

    const globeProps = globePropsSpy.mock.calls[0][0]
    expect(globeProps.globeImageUrl).toBe(
      "https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-dark.jpg",
    )
    expect(globeProps.waitForGlobeReady).toBe(false)
    expect(globeProps.globeMaterial).toBeDefined()
  })
  ```

  (Este teste substitui integralmente "renderiza o globo sem textura externa, usando
  globeMaterial sólido" — a asserção antiga, `globeImageUrl` `toBeUndefined()`, contradiz
  D1 revisado.)

- **Step 2: Rodar o teste para confirmar que falha**

  Run: `pnpm --filter frontend exec vitest run src/features/weather/components/weather-globe.test.tsx`
  Expected: FAIL — `expect(globeProps.globeImageUrl).toBe(...)` recebe `undefined` (prop
  ainda não existe no componente).

- **Step 3: Implementar a textura no componente**

  Em `apps/frontend/src/features/weather/components/weather-globe.tsx`, ao lado da
  constante local existente `MARKER_COLOR` (linha 21), adicionar:

  ```typescript
  const GLOBE_TEXTURE_URL =
    "https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-dark.jpg"
  ```

  E na JSX do `<Globe>` (linhas 131-142), inserir `globeImageUrl` e `waitForGlobeReady`
  logo após `globeMaterial={globeMaterial}`, preservando todas as props existentes:

  ```tsx
  <Globe
    ref={globeRef}
    width={GLOBE_SIZE_PX}
    height={GLOBE_SIZE_PX}
    backgroundColor="rgba(0,0,0,0)"
    globeMaterial={globeMaterial}
    globeImageUrl={GLOBE_TEXTURE_URL}
    waitForGlobeReady={false}
    enablePointerInteraction={false}
    pointsData={markerData}
    pointColor={() => MARKER_COLOR}
    pointRadius={0.4}
    pointAltitude={0.01}
  />
  ```

- **Step 4: Rodar o teste para confirmar que passa**

  Run: `pnpm --filter frontend exec vitest run src/features/weather/components/weather-globe.test.tsx`
  Expected: PASS

- **Step 5: Commit**

  ```bash
  git add apps/frontend/src/features/weather/components/weather-globe.tsx apps/frontend/src/features/weather/components/weather-globe.test.tsx
  git commit -m "feat(weather-globe): adiciona textura de mapa-múndi sem bloquear render"
  ```

- **Step 6: Escrever o teste que falha — rotação manual habilitada (FR-014), invertendo o baseline do mock**

  No mesmo arquivo de teste, o mock hoisted de `controlsState` (linhas 21-28) inicializa
  `enableRotate: true`, e o `afterEach` (linhas 71-76) reseta `controlsState.enableRotate`
  de volta para `true`. Se a asserção do teste virar apenas `.toBe(true)` sem tocar esses
  dois pontos, o teste passa mesmo que a produção nunca escreva
  `controls.enableRotate = true` — o mock já nasce nesse valor. Inverter os dois para
  `false`, espelhando o padrão já usado por `enableZoom`/`enablePan` (mock nasce no oposto
  do valor esperado):

  No objeto `vi.hoisted` (dentro de `controlsState`):

  ```typescript
  enableRotate: false,
  ```

  No corpo do `afterEach`:

  ```typescript
  controlsState.enableRotate = false
  ```

  E editar (não substituir) o teste "ativa auto-rotação e desabilita arrastar/zoom/pan ao
  montar o ramo interativo" (linhas 114-124), mantendo as quatro asserções existentes e
  só invertendo a de `enableRotate`:

  ```typescript
  test("ativa auto-rotação, habilita arrastar e mantém zoom/pan desabilitados ao montar o ramo interativo", () => {
    mockWebglSupported()

    render(<WeatherGlobe />)

    expect(controlsState.autoRotate).toBe(true)
    expect(controlsState.autoRotateSpeed).toBe(0.4)
    expect(controlsState.enableZoom).toBe(false)
    expect(controlsState.enablePan).toBe(false)
    expect(controlsState.enableRotate).toBe(true)
  })
  ```

- **Step 7: Rodar o teste para confirmar que falha**

  Run: `pnpm --filter frontend exec vitest run src/features/weather/components/weather-globe.test.tsx`
  Expected: FAIL — `expect(controlsState.enableRotate).toBe(true)` recebe `false` (o
  mock agora nasce em `false` e o componente ainda define `enableRotate = false` no efeito
  de montagem).

- **Step 8: Implementar a rotação manual no componente**

  No efeito de montagem de `weather-globe.tsx` (linhas 65-83), trocar a linha
  `controls.enableRotate = false` (linha 78) por:

  ```typescript
  controls.enableRotate = true
  ```

  E atualizar o comentário que hoje justifica os flags (linhas 72-75), que ficaria
  desatualizado ao afirmar que mouse/touch são "desligados" por completo:

  ```typescript
  // `controls.enabled` precisa continuar `true`: o loop de render só chama
  // `controls.update()` quando os controles estão habilitados, e é dentro de
  // `update()` que a auto-rotação é aplicada. Zoom e pan por mouse/touch
  // continuam desligados pelos flags abaixo; `enableRotate` fica ligado de
  // propósito (D5.1) para permitir arrastar/tocar o globo manualmente.
  ```

- **Step 9: Rodar o teste para confirmar que passa**

  Run: `pnpm --filter frontend exec vitest run src/features/weather/components/weather-globe.test.tsx`
  Expected: PASS

- **Step 10: Commit**

  ```bash
  git add apps/frontend/src/features/weather/components/weather-globe.tsx apps/frontend/src/features/weather/components/weather-globe.test.tsx
  git commit -m "feat(weather-globe): habilita rotação manual do globo via arrastar/tocar"
  ```

- **Step 11: Escrever teste de guarda — clique não dispara busca (FR-016)**

  Este comportamento já é correto na implementação atual (nenhum handler de clique é
  registrado desde a task-04) — o teste é uma guarda de regressão, não uma mudança de
  comportamento; espera-se que já passe ao ser escrito (ver Visão Geral). Adicionar:

  ```typescript
  test("não registra handler de clique/toque sobre o globo", () => {
    mockWebglSupported()

    render(<WeatherGlobe />)

    const globeProps = globePropsSpy.mock.calls[0][0]
    expect(globeProps.onGlobeClick).toBeUndefined()
    expect(globeProps.onPointClick).toBeUndefined()
  })
  ```

- **Step 12: Rodar o teste para confirmar que já passa**

  Run: `pnpm --filter frontend exec vitest run src/features/weather/components/weather-globe.test.tsx`
  Expected: PASS (guarda de regressão sobre comportamento já correto — nenhuma mudança de
  código necessária nesta etapa)

- **Step 13: Atualizar o tamanho do globo para 240px (D6)**

  Em `apps/frontend/src/features/weather/components/weather-globe-constants.ts`, trocar:

  ```typescript
  export const GLOBE_SIZE_PX = 128
  ```

  por:

  ```typescript
  export const GLOBE_SIZE_PX = 240
  ```

  Sem teste dedicado — `GLOBE_SIZE_PX` já é consumido por `weather-globe.tsx` (props
  `width`/`height` do `<Globe>`), por `weather-globe-fallback.tsx` e pela página `/clima`
  (dimensão do `data-testid="weather-globe-slot"`); nenhum teste existente fixa o valor
  numérico 128, então a mudança não quebra suítes existentes. A fidelidade visual (240px
  cabendo na coluna `max-w-md` sem alterar a largura, inclusive em viewports pequenos) é
  validada pelo mockup curado (ver `### Fidelidade Visual`), não por teste automatizado.

- **Step 14: Commit**

  ```bash
  git add apps/frontend/src/features/weather/components/weather-globe.test.tsx apps/frontend/src/features/weather/components/weather-globe-constants.ts
  git commit -m "feat(weather-globe): aumenta tamanho do globo para 240px"
  ```

## Critérios de Sucesso

- O globo renderiza com `globeImageUrl` apontando para a textura oficial do `three-globe`
  (`earth-dark.jpg`, URL `https://` explícita) e `waitForGlobeReady={false}`, de forma que
  uma falha/atraso no carregamento da textura não trava o render do globo — `globeMaterial`
  continua definido como base visual imediata (FR-017, FR-018). A ordem de aplicação real
  entre textura e material é verificada manualmente (ver Fidelidade Visual), não só por
  teste com mock.
- `controls.enableRotate` é `true` após a montagem, permitindo rotação manual por
  arrastar/tocar; `enableZoom` e `enablePan` continuam `false` (FR-014, FR-015). O teste
  que prova isso escreve a partir de um mock invertido (`enableRotate` nasce `false`), não
  de um mock que já nasce no valor esperado.
- Nenhum handler `onGlobeClick`/`onPointClick` é passado ao `<Globe>` — um clique/toque
  sobre o globo não dispara busca de cidade nem seleciona localidade (FR-016).
- `GLOBE_SIZE_PX` é `240`, validado visualmente contra o mockup curado dentro da coluna
  `max-w-md` da página `/clima`, sem alterar a largura do layout (D6).
- Todos os testes existentes de fallback, `ErrorBoundary`, cleanup de contexto WebGL e
  animação de câmera (`pointOfView`) continuam passando sem alteração (nenhuma regressão).
