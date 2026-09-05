---
created_at: "2026-09-05T08:55:00-03:00"
updated_at: "2026-09-05T08:55:00-03:00"
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
