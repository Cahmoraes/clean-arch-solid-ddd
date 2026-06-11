---
created_at: "2026-05-25T11:41:31-03:00"
updated_at: "2026-05-25T11:41:31-03:00"
---

# QA Report — Dashboard Início

## Resumo

- **Status**: ✅ APROVADO
- **PRD**: `docs/superpowers/dashboard-inicio/prd/prd-dashboard-inicio.md`
- **Total de Histórias**: 9
- **Histórias Verificadas**: 9/9
- **Histórias PASSED**: 8 (US-01¹, US-02, US-03, US-04, US-06, US-07, US-08², US-09)
- **Histórias PARTIAL**: 1 (US-05)
- **Histórias FAILED**: 0
- **Bugs Encontrados**: 2 (ambos corrigidos)

¹ US-01 inicialmente PARTIAL — bug em `src/proxy.ts` corrigido durante o gate.
² US-08 inicialmente PARTIAL — BUG-02 (RF-006: nome/iniciais ausentes na sidebar) corrigido após o gate.

---

## Histórias Verificadas

| ID | História | Status | Evidência |
|----|----------|--------|-----------|
| US-01 | Tela inicial personalizada | ✅ PASSOU | `evidence/us-01-tela-inicial-personalizada/result.json` |
| US-02 | Visão geral de frequência | ✅ PASSOU | `evidence/us-02-visao-geral-de-frequencia/result.json` |
| US-03 | Reconhecimento do meu perfil | ✅ PASSOU | `evidence/us-03-reconhecimento-do-meu-perfil/result.json` |
| US-04 | Padrão semanal | ✅ PASSOU | `evidence/us-04-padrao-semanal/result.json` |
| US-05 | Histórico de atividade (heatmap) | ⚠️ PARCIAL | `evidence/us-05-historico-de-atividade/result.json` |
| US-06 | Últimos check-ins | ✅ PASSOU | `evidence/us-06-ultimos-check-ins/result.json` |
| US-07 | Distribuição de status | ✅ PASSOU | `evidence/us-07-distribuicao-de-status/result.json` |
| US-08 | Navegação consistente | ✅ PASSOU | `evidence/us-08-navegacao-consistente/result.json` |
| US-09 | Seção admin na sidebar | ✅ PASSOU | `evidence/us-09-secao-admin-na-sidebar/result.json` |

---

## Requisitos Funcionais Verificados

| RF | Descrição | Status |
|----|-----------|--------|
| RF-001 | Rota `/inicio` existe no grupo autenticado | ✅ |
| RF-002 | Redirect pós-login aponta para `/inicio` | ✅ |
| RF-003 | Rota protegida pelo middleware de sessão | ✅ (corrigido) |
| RF-004 | Sidebar exibe 5 itens de navegação (Dashboard, Check-ins, Academias, Perfil, Assinatura) | ✅ |
| RF-005 | Item ativo destacado visualmente via `isPathActive()` | ✅ |
| RF-006 | Rodapé da sidebar exibe avatar, nome e role | ✅ (corrigido: `useMe()` fornece nome; iniciais exibidas no avatar — BUG-02 resolvido) |
| RF-007 | Mobile: sidebar ocultada com hamburger | ✅ |
| RF-008 | Role ADMIN vê seção adicional com links admin | ✅ |
| RF-009 | ProfileHeroCard exibe avatar, nome, e-mail, data de cadastro | ✅ |
| RF-010 | Badge de status (Ativo/Inativo) com cor semântica | ✅ |
| RF-011 | Stats inline: total, este mês, sequência | ✅ |
| RF-012 | 4 KPI cards: total, mês, sequência, status | ✅ |
| RF-013 | Skeleton independente por card durante loading | ✅ |
| RF-014 | Sequência conta dias consecutivos validados (fallback ontem) | ✅ |
| RF-015 | WeeklyChart renderiza 7 barras Dom–Sáb | ✅ |
| RF-016 | Cálculo considera todo o histórico carregado | ✅ |
| RF-017 | Tooltip com contagem ao hover (atributo `title`) | ⚠️ (implementado via `title` HTML, não verificável sem browser) |
| RF-018 | Heatmap cobre 90 dias (13 semanas × 7 dias) | ✅ |
| RF-019 | 5 níveis de intensidade (0–4) | ✅ |
| RF-020 | Tooltip com data e contagem ao hover | ⚠️ (implementado via `title` HTML, não verificável sem browser) |
| RF-021 | Aparência distinta: dias sem dados vs. 0 check-ins | ✅ |
| RF-022 | Timeline exibe academia, data relativa e badge de status | ✅ |
| RF-023 | Badge com cor semântica: verde/amarelo/vermelho | ✅ |
| RF-024 | Link "Ver todos" aponta para `/check-ins` | ✅ |
| RF-025 | Empty state quando sem check-ins | ✅ |
| RF-026 | SVG rosca com 3 segmentos proporcionais | ✅ |
| RF-027 | Legenda com label, cor e contagem absoluta | ✅ |
| RF-028 | Renderiza corretamente com status único | ✅ |
| RF-029 | Skeleton independente por widget | ✅ |
| RF-030 | ErrorBanner com retry em caso de falha de API | ✅ |
| RF-031 | Dashboard funciona com histórico vazio (KPIs zerados, empty states) | ✅ |

---

## Testes de Aceitação Executados

| Fluxo | Arquivo | Resultado |
|-------|---------|-----------|
| Login redirect para /inicio | `proxy.test.ts` (8 testes) | ✅ PASSOU |
| Middleware protege /inicio sem autenticação | `proxy.test.ts` | ✅ PASSOU |
| computeStreak com fallback para ontem | `us-02-acceptance.test.ts` (10 testes) | ✅ PASSOU |
| ProfileHeroCard iniciais, badge e stats | `us-03-profile-hero-card.acceptance.test.tsx` (9 testes) | ✅ PASSOU |
| CheckinsTimeline — 5 itens, empty state, badge cores | `us-06-checkins-timeline.acceptance.test.tsx` (11 testes) | ✅ PASSOU |
| StatusDonutCard com status único | `us-07-single-status-donut.acceptance.test.ts` (12 testes) | ✅ PASSOU |
| computeWeeklyFrequency — 7 dias | `use-dashboard-metrics.test.ts` | ✅ PASSOU |
| computeHeatmap — 90 dias, 5 intensidades | `use-dashboard-metrics.test.ts` | ✅ PASSOU |
| Sidebar: 5 itens, admin condicional, hamburger | `authenticated-shell.test.tsx` (5 testes) | ✅ PASSOU |

---

## Acessibilidade

- [x] Gráfico semanal tem `aria-label` no container
- [x] SVG donut tem `aria-label` e `role="img"`
- [x] Heatmap tem `title` por célula com data e contagem
- [x] Sidebar hambúrguer tem `aria-label="Abrir menu de navegação"`
- [x] Item ativo na sidebar tem `aria-current="page"`
- [ ] Navegação por teclado na sidebar — não verificada (requer browser)
- [ ] Contraste visual — não verificado (requer browser)

---

## Bugs Encontrados

| ID | Descrição | Severidade | Status | Arquivo |
|----|-----------|------------|--------|---------|
| BUG-01 | `/inicio` ausente do `config.matcher` em `src/proxy.ts` — rota não protegida pelo Edge middleware | Alta | **Corrigido** durante o gate | `src/proxy.ts` + `src/proxy.test.ts` |
| BUG-02 | Rodapé da sidebar exibia role mas não exibia nome nem iniciais — `AuthUser` só armazena `{id, role}`, sem `name`. Corrigido usando `useMe()` para buscar nome do perfil e exibir iniciais no avatar | Baixa | **Corrigido** | `src/components/layout/authenticated-shell.tsx` |

---

## Conclusão

Feature **aprovada**. Nenhuma história está FAILED. Os dois bugs encontrados foram corrigidos: BUG-01 (rota `/inicio` sem proteção de middleware) durante o gate, e BUG-02 (RF-006: nome/iniciais ausentes no rodapé da sidebar) em follow-up imediato usando `useMe()` — solução correta sem modificar o JWT. Todos os 31 requisitos funcionais estão implementados e RF-017/RF-020 (tooltips de hover) foram implementados via atributo HTML `title`.

**Recomendação**: aprovar para merge.
