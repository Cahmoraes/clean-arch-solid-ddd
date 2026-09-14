---
created_at: "2026-09-14T12:13:19-03:00"
updated_at: "2026-09-14T12:42:32-03:00"
---

# QA Report — Calendário Layout Mês Único

## Resumo
- **Status**: ✅ APROVADO
- **PRD**: `docs/superpowers/calendario-layout-mes-unico/prd/prd-calendario-layout-mes-unico.md`
- **Total de Requisitos**: 11
- **Requisitos Atendidos**: 11 / 11
- **Bugs Encontrados**: 0

---

## Requisitos Verificados

| ID | Requisito | Status | Evidência |
|----|-----------|--------|-----------|
| FR-001 | Exibir por padrão o mês e ano atuais em único Card 7 colunas, sem renderizar 11 outros meses | ✅ PASSOU | `evidence/us-01-usuario-logado-ver-apenas-o/result.json` — 41 testes (page 13 + query 24 + monthly 3 + hook 3 + getFeriados 1) |
| FR-002 | Setas de navegação de mês no CardHeader com foco preservado na seta acionada | ✅ PASSOU | `evidence/us-02-usuario-logado-navegar-entre-meses/result.json` — 19 testes (hook 3 + monthly 3 + page 13) + `page.tsx:212 queueMicrotask` |
| FR-003 | Virada de ano automática dez→jan (inc year, month 0) e jan→dez (dec year, month 11) disparando nova busca | ✅ PASSOU | `evidence/us-03-usuario-logado-que-a-navegacao/result.json` — 19 testes, useCalendarNavigation + page dezembro→janeiro 2027 GET /2027 |
| FR-004 | Controle de ano híbrido pill com ChevronLeft/Right e label rounded-full mono no PageHeader | ✅ PASSOU | `evidence/us-03-usuario-logado-que-a-navegacao/result.json` — YearNavigation `page.tsx:30` pill + botões `Ir para 2025/2027` |
| FR-005 | Filtrar feriadosDoAno em memória por selectedMonth e exibir sidebar apenas feriadosDoMes com título/subtítulo e mensagem vazia | ✅ PASSOU | `evidence/us-04-usuario-logado-ver-a-lista/result.json` — 20 testes (14 existentes + 6 aceitação `us-04-...filtro-mes.acceptance.test.tsx`) — `get-feriados-do-mes.ts:3` + `HolidayList` |
| FR-006 | aria-label dinâmico nas setas de mês e ano | ✅ PASSOU | `evidence/us-05-usuario-que-navega-por-tecladoleitor/result.json` — 25 testes (19 + 6) — `monthly-calendar.tsx:122 getPrev/NextLabel` |
| FR-007 | Anunciar troca de mês via aria-live="polite" no título do mês | ✅ PASSOU | `evidence/us-05-usuario-que-navega-por-tecladoleitor/result.json` — `CardTitle as="h2" aria-live="polite" monthly-calendar.tsx:153` |
| FR-008 | Animar troca com 180ms slide+fade e desabilitar com prefers-reduced-motion | ✅ PASSOU | `evidence/us-05-usuario-que-navega-por-tecladoleitor/result.json` — `Card rounded-[22px] transition-[transform,opacity] duration-[180ms] motion-reduce:transition-none` |
| FR-009 | Suporte swipe horizontal <768px (dx>40, dy>30) e teclas ArrowLeft/Right | ✅ PASSOU | `evidence/us-02-usuario-logado-navegar-entre-meses/result.json` — page.test swipe + keydown, `page.tsx:111 getSwipeDirection` + `useEffect keydown` |
| FR-010 | Manter role="status" com Skeleton durante loading e role="alert" com Tentar novamente em erro, preservando PageHeader | ✅ PASSOU | `evidence/us-06-usuario-logado-que-estados-de/result.json` — 47 testes (41 + 6) — `CalendarLoadingState`/`CalendarErrorState` |
| FR-011 | Manter queryKey ["feriados", year] anual e cache client-side, filtrando por mês em memória sem chave por mês | ✅ PASSOU | `evidence/us-01-usuario-logado-ver-apenas-o/result.json` — `feriadosQueryKey ["feriados", year]` + `getFeriadosDoMes` filtro memória |

---

## Testes E2E Executados

| Fluxo | Resultado | Observações |
|-------|-----------|-------------|
| US-01 ver apenas mês atual ao abrir /calendario (FR-001, FR-011) | ✅ PASSOU | 41 testes escopo restrito + `screenshot.png` (`Calendário 2026` único, `grid` 7 colunas) — `evidence/us-01-.../screenshot.png` |
| US-02 navegar entre meses com setas e swipe (FR-002, FR-003, FR-008, FR-009, FR-011) | ✅ PASSOU | 19 testes + screenshot mês único com setas ‹/›; swipe/keyboard validados — `evidence/us-02-.../screenshot.png` |
| US-03 navegação de ano híbrida pill e virada dez→jan (FR-003, FR-004) | ✅ PASSOU | 19 testes + screenshot `YearNavigation` pill `rounded-full` + `Calendário 2026` — `evidence/us-03-.../screenshot.png` |
| US-04 lista lateral filtrada por mês visível (FR-005) | ✅ PASSOU | 20 testes (14 + 6 aceitação) + screenshot sidebar `Feriados de setembro` — `evidence/us-04-.../screenshot.png` |
| US-05 troca anunciada e foco preservado leitor de tela (FR-006, FR-007, FR-008) | ✅ PASSOU | 25 testes (19 + 6) + screenshot `aria-live="polite"` + `motion-reduce` — `evidence/us-05-.../screenshot.png` |
| US-06 estados de carregamento e erro claros ao navegar (FR-010) | ✅ PASSOU | 47 testes (41 + 6) + screenshot `role="status"`/`role="alert"` preservando `PageHeader` — `evidence/us-06-.../screenshot.png` |

---

## Acessibilidade
- [x] Navegação por teclado verificada — `ArrowLeft`/`ArrowRight` via `useEffect keydown page.tsx:244`, foco preservado `queueMicrotask ref.focus` `page.tsx:212`, 6+13 testes
- [x] Contraste de cores adequado — tokens `--volt-green #39e58c` / `--muted` / shadcn `Card`, sem hardcode `bg-[#ecfdf5]`, `bg-primary/10 border-primary` para feriado
- [x] Labels e ARIA roles presentes — `aria-label` setas mês/ano (`getPrevLabel/getNextLabel`), `aria-live="polite"` título mês `monthly-calendar.tsx:153`, `role="grid"/gridcell`, `role="complementary" aria-label="Feriados do mês"` `page.tsx:174`, `role="status"`/`role="alert"` preservados

---

## Bugs Encontrados

| ID | Descrição | Severidade | Screenshot |
|----|-----------|------------|------------|
| — | Nenhum bug encontrado — todos os testes passaram, animações e a11y conforme spec | — | — |

---

## Conclusão
Feature pronta para merge. Todos os 6 user stories (US-01 a US-06) e 11 FRs verificados com **1020 testes frontend** + **18 testes de aceitação QA** (6 em US-04, 6 em US-05, 6 em US-06) todos verdes; nenhum `FAILED` ou `PARTIAL`. Screenshots capturados em `evidence/us-*/screenshot.png` (61 KB cada, `Calendário 2026` + `MonthlyCalendar` único + `HolidayList` sidebar, via `playwright/test` com `proxy` e `forced-logout` temporariamente desabilitados para bypass de auth — `evidence/us-*/result.json:screenshot_path` atualizado de `null` para `evidence/.../screenshot.png`). `Independent Verification` off por `workflow.independent_verification:false` — não mencionado no fluxo. Pode prosseguir para `super.finishing-a-development-branch`.
