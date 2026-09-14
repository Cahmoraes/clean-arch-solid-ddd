---
created_at: "2026-09-14T10:30:08-03:00"
updated_at: "2026-09-14T10:30:08-03:00"
---

# PRD: Calendário Layout Mês Único

## Visão Geral

A tela `/calendario` hoje exibe 12 calendários lado a lado em grid (`md:grid-cols-2 2xl:grid-cols-3`), o que aperta datas e prejudica leitura. Esta feature evolui o layout para **mês único** com navegação por setas, exibindo o mês atual por padrão e permitindo trocar de mês (com virada de ano automática) sem recarregar a página. A integração com BrasilAPI (`GET /feriados/v1/{year}` via `useFeriadosQuery`) e o cache por ano permanecem intactos; a mudança é exclusivamente de apresentação no frontend.

## Objetivos

- Reduzir ruído visual: de 12 meses simultâneos para 1 mês focado, melhorando legibilidade em desktop e mobile.
- Navegação em 1 ação: trocar de mês em 1 clique/seta/swipe, com virada de ano automática (dez→jan, jan→dez).
- Manter paridade de dados: exibir os mesmos feriados nacionais, agora filtrados pelo mês visível, sem alterar contrato BrasilAPI.
- Acessibilidade verificável: troca de mês anunciada via `aria-live` e `aria-label` com mês/ano alvo, foco preservado.

## Histórias de Usuário

- **US-01** — Como usuário logado, eu quero ver apenas o mês atual ao abrir `/calendario` para que a leitura das datas não fique apertada · **UI:** sim
- **US-02** — Como usuário logado, eu quero navegar entre meses com setas (e swipe em mobile) para que eu explore feriados sem esforço · **UI:** sim
- **US-03** — Como usuário logado, eu quero que a navegação de ano continue disponível de forma híbrida para que a virada dez→jan carregue o próximo ano automaticamente · **UI:** sim
- **US-04** — Como usuário logado, eu quero ver a lista lateral filtrada apenas pelos feriados do mês visível para que eu veja só o relevante · **UI:** sim
- **US-05** — Como usuário que navega por teclado/leitor de tela, eu quero que a troca de mês seja anunciada e o foco permaneça nas setas para que eu perceba a mudança sem perder contexto · **UI:** sim
- **US-06** — Como usuário logado, eu quero que estados de carregamento e erro continuem claros ao navegar entre meses/anos para que eu saiba quando os dados estão sendo buscados ou falharam · **UI:** sim

## Funcionalidades Principais

### Calendário de mês único

- **FR-001** (US-01) — O sistema deve exibir por padrão o mês e ano atuais (derivados do relógio local do navegador) em um único `Card` com grid `7` colunas (weekdays + dias), sem renderizar os outros 11 meses.
- **FR-002** (US-02) — O sistema deve oferecer setas de navegação de mês no `CardHeader` (`‹` anterior, `›` próximo) que incrementam/decrementam `selectedMonth` e mantêm o foco na seta acionada após a troca.
- **FR-003** (US-02, US-03) — O sistema deve realizar virada de ano automática: ao avançar de dezembro, incrementar `selectedYear` e definir `selectedMonth=0`; ao voltar de janeiro, decrementar `selectedYear` e definir `selectedMonth=11`, disparando nova busca quando o ano mudar.
- **FR-004** (US-03) — O sistema deve manter o controle de ano híbrido (`pill` com `ChevronLeft/Right` e label `rounded-full` mono) no `PageHeader`, permitindo trocar de ano diretamente além da navegação por mês.

### Lista filtrada por mês

- **FR-005** (US-04) — O sistema deve filtrar `feriadosDoAno` em memória por `selectedMonth` e exibir na sidebar apenas `feriadosDoMes`, com título `Feriados de {mês}` e subtítulo `{n} de {total} em {ano}`; quando nenhum feriado no mês, exibir mensagem vazia sem quebrar layout.

### Navegação acessível e animada

- **FR-006** (US-05) — O sistema deve aplicar `aria-label` dinâmico nas setas de mês (`"Mês anterior, agosto 2026"`, `"Próximo mês, outubro 2026"`) e de ano (`"Ano anterior, ir para 2025"`).
- **FR-007** (US-05) — O sistema deve anunciar a troca de mês via `aria-live="polite"` no título do mês (`strong` entre as setas).
- **FR-008** (US-02, US-05) — O sistema deve animar a troca de mês com `180ms slide+fade` via CSS e desabilitar a animação quando `prefers-reduced-motion: reduce`.
- **FR-009** (US-02) — O sistema deve suportar swipe horizontal em `<768px` e teclas `ArrowLeft`/`ArrowRight` para navegar entre meses.

### Estados de carregamento e erro preservados

- **FR-010** (US-06) — O sistema deve manter `role="status"` com `Skeleton` durante carregamento e `role="alert"` com botão `Tentar novamente` em erro, preservando `PageHeader` e controles visíveis ao trocar de ano.
- **FR-011** (US-01, US-02) — O sistema deve manter `queryKey ["feriados", year]` anual e cache client-side, filtrando por mês em memória sem criar nova chave por mês.

## Experiência do Usuário

Jornada principal: usuário abre `/calendario` → vê **setembro 2026** (mês atual) com `07/09 Independência` destacado + sidebar `Feriados de setembro (1 de 9)` → clica `›` → vê `Outubro 2026` com animação `180ms`, sidebar atualiza para `12/10 Nossa Senhora Aparecida` → avança de `dezembro 2026` → `janeiro 2027` com nova busca BrasilAPI. `pill` de ano no topo permanece para salto direto de ano. Em mobile, swipe troca mês e layout colapsa para 1 coluna. Foco permanece na seta, leitor anuncia novo mês. Mockup curado em `specs/mockups/calendario-layout-mes-unico-visual.md` (prosa + core HTML) — decisões visuais em `Especificação Visual` do spec (`Card rounded-[22px]`, `weekdays 11px uppercase`, `days grid-cols-7 gap-1`, tokens `--volt-green #39e58c`, `--muted #f4f4f5`, `--border #e4e4e7`).

## Restrições Técnicas de Alto Nível

- Integração obrigatória: `https://brasilapi.com.br/api/feriados/v1/{year}` direta no frontend via `fetch` + `TanStack Query`; sem backend/proxy/migration/OpenAPI (decisão fechada `calendario-feriados` D1).
- Cache: `queryKey ["feriados", year]` anual, `staleTime = FERIADOS_STALE_TIME_MS`; filtro por mês em memória (D2 do design).
- Características priorizadas herdadas como restrições: **Usabilidade** — troca de mês em 1 ação; **Manutenibilidade** — extrair `MonthlyCalendar` em `features/calendario-feriados/ui/` sem nova dependência; **Acessibilidade** — `aria-label`/`aria-live`/foco/`prefers-reduced-motion`.
- Stack: Next.js 15 App Router `(authenticated)` + `AuthenticatedShell`, `PageContainer width="wide"` + `PageHeader`, `shadcn Card/Skeleton/Button`, `vitest` (frontend).
- Performance: payload anual ~9 feriados, filtro O(n) trivial; não introduzir `framer-motion` ou lib de calendário.

## Fora de Escopo

- Alterar `useFeriadosQuery`, `feriadosQueryKey`, `Feriado` model ou contrato BrasilAPI; criar `queryKey` por mês.
- Feriados estaduais/municipais/personalizados, edição/criação/importação, dataset offline/fallback estático.
- Backend próprio, proxy, persistência local durável, novos contratos OpenAPI.
- Mudanças em `AuthenticatedShell`, drawer mobile/off-canvas ou navegação fora de `/calendario`.
- Biblioteca externa de calendário (`react-day-picker`, `react-calendar`) ou dependência de animação.
