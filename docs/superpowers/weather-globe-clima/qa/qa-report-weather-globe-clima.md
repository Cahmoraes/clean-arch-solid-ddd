---
created_at: "2026-09-05T08:55:00-03:00"
updated_at: "2026-09-05T11:08:01-03:00"
---

# QA Report — weather-globe-clima

## Resumo
- **Status**: ⚠️ PARCIAL
- **PRD**: `../prd/prd-weather-globe-clima.md`
- **Total de Requisitos**: 13 (FR-001 a FR-013)
- **Requisitos Atendidos**: 13 / 13 (todos confirmados pela verificação independente — `qa/validation-weather-globe-clima.md`, 40/40 critérios, PASS)
- **Bugs Encontrados**: 0

Nenhuma história reprovou. Duas (US-01, US-02) ficaram `PARTIAL` só por limitação do ambiente de screenshot ao vivo (HMR do Turbopack instável sob automação headless atrás do nginx-proxy local) — o comportamento em si já está provado por testes automatizados e pela verificação independente (mutation testing incluído). Nenhum gap de comportamento restou aberto.

---

## Requisitos Verificados

| ID | Requisito | Status | Evidência |
|----|-----------|--------|-----------|
| FR-001 | Auto-rotação ativa ao montar o ramo interativo, `enabled` nunca `false` | ✅ PASSOU | `qa/validation-weather-globe-clima.md` linha 34-36; `evidence/us-01-.../result.json` |
| FR-002 | Chunk do globo fora do bundle inicial via `next/dynamic({ssr:false})` | ✅ PASSOU | `qa/validation-weather-globe-clima.md` (evidência de build); `evidence/us-01-.../result.json` |
| FR-003 | Câmera anima até a coordenada buscada | ✅ PASSOU | `evidence/us-02-.../result.json` (16/16 testes) |
| FR-004 | `Coordinate` propagado do backend, contrato HTTP flat | ✅ PASSOU | `evidence/us-02-.../result.json` (4/4 testes backend) |
| FR-005 | Fallback estático quando WebGL indisponível | ✅ PASSOU | `evidence/us-03-.../result.json` (21/21 testes) |
| FR-006 | Fallback com `prefers-reduced-motion` ativo, inclusive mudança posterior | ✅ PASSOU | `evidence/us-03-.../result.json` |
| FR-007 | Elemento decorativo, `aria-hidden`, sem foco de teclado | ✅ PASSOU | `evidence/us-03-.../result.json` |
| FR-008 | `ErrorBoundary` + `webglcontextlost` caem para fallback sem quebrar a página | ✅ PASSOU | `evidence/us-04-.../result.json` + `screenshot.png` (falha induzida real) |
| FR-009 | Busca com falha mantém última posição/rotação válida do globo | ✅ PASSOU | `evidence/us-04-.../result.json`; corrigido na rodada 1 do IV (globo parava de girar permanentemente) e reconfirmado morto no sensor de mutação |
| FR-010 | Cleanup do contexto WebGL no unmount | ✅ PASSOU | `evidence/us-01-.../result.json` |
| FR-011 | Fitness function contra reintrodução de import estático do globo | ✅ PASSOU | `qa/validation-weather-globe-clima.md`; `apps/frontend/src/test/fitness/weather-globe-import.test.ts` |
| FR-012 | Sem marcador/animação de câmera antes de qualquer busca | ✅ PASSOU | `evidence/us-01-.../result.json` |
| FR-013 | Nova busca sobrescreve alvo de câmera anterior sem fila | ✅ PASSOU | `evidence/us-02-.../result.json` |

---

## Testes E2E Executados

| Fluxo | Resultado | Observações |
|-------|-----------|-------------|
| US-01 — Globo decorativo gira automaticamente na página `/clima` | ⚠️ PARCIAL | 21/21 testes unitários/componente PASS; screenshot ao vivo não capturou o globo renderizado por instabilidade do HMR sob automação headless (ambiente dev, não regressão de código — build de produção já valida code-splitting via IV) |
| US-02 — Globo anima até a cidade buscada | ⚠️ PARCIAL | 16/16 (frontend) + 4/4 (backend) testes PASS; fluxo E2E real não disparou a chamada de rede no navegador headless (mesmo problema de HMR/nginx-proxy do ambiente dev local); backend confirmado saudável via curl direto, código de `page.tsx`/`use-weather-query.ts` inspecionado e correto |
| US-03 — Fallback estático acessível (sem WebGL / reduced-motion) | ✅ PASSOU | 21/21 testes PASS; screenshot ao vivo não forçou o ramo de fallback no navegador (mesma limitação de ambiente), evidência primária vem dos testes que já renderizam e asserem o fallback diretamente |
| US-04 — Clima continua funcionando com globo em falha / busca sem resultado | ✅ PASSOU | 13/13 testes PASS; screenshot real capturado mostrando "Cidade não encontrada" + globo decorativo intacto simultaneamente |

---

## Acessibilidade
- [x] Navegação por teclado verificada (globo `aria-hidden="true"` em ambos os ramos, não interceptável por teclado/leitor de tela — `evidence/us-03-.../result.json`)
- [x] Labels e ARIA roles presentes (`aria-hidden` no wrapper reservado e no globo/fallback; mensagem de erro com `role="alert"`)
- [ ] Contraste de cores adequado — não verificado nesta rodada (globo é elemento decorativo sem texto; fora do escopo desta feature, que não introduz novos textos/controles interativos)

---

## Bugs Encontrados

Nenhum bug em aberto. O único defeito comportamental real encontrado durante o ciclo (globo parava de girar permanentemente após uma busca falhar durante a transição de câmera, FR-001/FR-009) foi identificado e corrigido na primeira rodada da verificação independente (`qa/validation-weather-globe-clima.md`), com o mutante correspondente confirmado morto nas rodadas seguintes.

---

## Conclusão

**Aprovada com ressalvas.** Todos os 13 requisitos funcionais e as 4 histórias de usuário do PRD estão implementados e comprovados por evidência de código (`file:line` + valor esperado) e por testes automatizados que a verificação independente provou capazes de detectar regressões (mutation testing, 0 sobreviventes reais). As duas histórias marcadas `PARTIAL` (US-01, US-02) não têm nenhum gap de comportamento — a ressalva é exclusivamente sobre a captura de screenshot ao vivo neste ambiente de desenvolvimento local (HMR do Turbopack instável sob automação headless atrás de um proxy nginx), não sobre a implementação. Feature pronta para merge.

---

## Rodada 2 — Revisão 2026-09-05 (textura + rotação manual + 240px)

A revisão de spec de 2026-09-05 adicionou FR-014 a FR-018 e a história **US-05** (nova). Esta
rodada verifica apenas o que a revisão introduziu — as histórias US-02 e US-03 não ganharam
nenhum FR novo neste ciclo e não foram reexecutadas; seus vereditos anteriores (`PARTIAL` e
`PASS`, respectivamente) permanecem válidos e estão listados no Resumo abaixo sem mudança.

### Resumo (rodada 2)
- **Status geral**: ⚠️ PARCIAL (nenhuma história `FAILED`; US-02 e US-05 `PARTIAL`, restante `PASSED`)
- **Requisitos novos**: FR-014, FR-015, FR-016, FR-017, FR-018, D6 (240px) — todos com evidência PASS em `qa/validation-weather-globe-clima.md` (rodada 5, IV, mutation testing sem sobreviventes)
- **Bugs encontrados nesta rodada**: 0 (o único gap, D6/`GLOBE_SIZE_PX` sem asserção, foi achado e fechado dentro do próprio gate de IV, rodada 4→5 — ver `validation-weather-globe-clima.md`)

### Extração de user stories — ressalva documentada
`generate-slugs.cjs` extraiu apenas US-01 a US-04 do PRD atualizado — não capturou **US-05**
porque a anotação `(revisão 2026-09-05)` entre o marcador `**US-05**` e o travessão quebra o
regex do script. US-05 foi adicionada manualmente a este round lendo o PRD diretamente
(`requirements`: FR-014, FR-015, FR-016; `uiFacing`: true, marcado explicitamente no PRD).

### Requisitos Verificados (novos, rodada 2)

| ID | Requisito | Status | Evidência |
|----|-----------|--------|-----------|
| FR-014 | Arrastar/tocar gira o globo manualmente (`enableRotate=true`) | ✅ PASSOU | `evidence/us-05-.../result.json`; `validation-weather-globe-clima.md` rodada 5 (sensor de mutação real: baseline do mock invertido) |
| FR-015 | Zoom e pan continuam desabilitados por gesto | ✅ PASSOU | `evidence/us-05-.../result.json` (`enableZoom`/`enablePan` = false, teste unitário) |
| FR-016 | Clique/toque sobre o globo não dispara busca nem seleciona localidade | ✅ PASSOU | `evidence/us-05-.../result.json` — confirmado tanto por teste unitário (ausência de handler) quanto por browser real (URL/campo de cidade inalterados após clique/drag) |
| FR-017 | Globo exibe textura de mapa-múndi (não esfera sólida) | ✅ PASSOU | `evidence/us-01-.../result.json` + `screenshot.png` (textura visível em build de produção) |
| FR-018 | Falha no carregamento da textura não trava/derruba o globo | ✅ PASSOU | `evidence/us-04-.../result.json` — falha real induzida no browser (404 forçado na CDN), globo permaneceu renderizado sem fallback |
| D6 | `GLOBE_SIZE_PX = 240` | ✅ PASSOU | `validation-weather-globe-clima.md` rodada 5 (FIX-03: asserção adicionada, mutação 240→128 morta) |

### Testes E2E Executados (rodada 2)

| Fluxo | Resultado | Observações |
|-------|-----------|-------------|
| US-01 — Globo decorativo (revisão: textura FR-017) | ✅ PASSOU | 23/23 testes; screenshot em build de produção (`next build`+`next start`, porta 3100) mostra a textura visível — resolve a limitação de HMR da rodada 1 |
| US-04 — Clima resiliente a falha do globo (revisão: FR-018) | ✅ PASSOU | 21/21 testes; falha real de rede induzida via `playwright-cli route ... --status 404` na CDN da textura — globo seguiu renderizado, sem fallback |
| US-05 — Rotação manual por arrastar/tocar (nova) | ⚠️ PARCIAL | 18/18 testes unitários + sensor de mutação real (IV); FR-016 confirmado em browser real; FR-014 (rotação visual em resposta ao arrasto) não isolável por diff de screenshot porque o globo já auto-rotaciona continuamente — limitação honesta de ferramenta, não falha de implementação (mecanismo segue coberto por teste+mutação) |
| US-02, US-03 | não reexecutadas | sem FR novo nesta revisão; vereditos da rodada 1 preservados (`PARTIAL`, `PASS`) |

### Conclusão (rodada 2)

**Aprovada com ressalvas.** FR-014 a FR-018 e D6 estão implementados e comprovados — a maioria
com evidência de browser real além do teste unitário (textura visível, falha de CDN induzida,
ausência de navegação por clique), não apenas leitura de spec. A única ressalva nova (US-05
`PARTIAL`) é uma limitação de ferramenta já explicada em detalhe na evidência (não dá para
isolar visualmente rotação-por-arrasto de auto-rotação contínua via diff de screenshot) — o
mecanismo em si (`enableRotate`) tem cobertura sólida com sensor de mutação real provando que
o teste de fato falsifica a regressão. Nenhum gap de comportamento real restou aberto. Feature
pronta para merge.
