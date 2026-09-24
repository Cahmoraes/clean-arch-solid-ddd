# Task 5: Forma retrô em features e páginas [FR-003, FR-004]

**Status:** DONE

**PRD:** `../prd/prd-replaced-retro-shapes.md`

**Spec:** `../specs/replaced-retro-shapes-design.md`

**Tier:** standard

**Depends on:** task-01

## Visão Geral

Esta task normaliza todo arredondamento avulso (`rounded-full`, `rounded-[Npx]`, `2xl`, bare `rounded`) em `apps/frontend/src/features/**` e `apps/frontend/src/app/**` para os tokens de chanfro produzidos na task-01, espelhando o trabalho feito em `components/` pela task-03. É a normalização de maior volume da feature (~58 ocorrências em ~30 arquivos), excluindo o globo do clima (fora de escopo).

## Arquivos

- Modify: os arquivos listados no checklist do Step 2 (features e páginas com arredondamento avulso), exceto `features/weather/components/weather-globe.tsx` e `features/weather/components/weather-globe-fallback.tsx` (exceção, spec Escopo — permanecem na allowlist da guarda da task-08)
- Test: `apps/frontend/src/features/gyms/components/gym-results.test.tsx`
- Test: `apps/frontend/src/features/dashboard/components/profile-hero-card.test.tsx`

## Interfaces

- **Consome:** tokens `rounded-xs/sm/md/lg/xl` produzidos pela task-01 (via `--radius-*` chanfrado sob `@supports`, reto por fallback); nenhuma outra interface de código.
- **Produz:** nenhum símbolo novo — apenas classes Tailwind normalizadas em `features/**` e `app/**`. A task-08 (guarda de resíduo) consome esta normalização como precondição para passar; a task-06 (tipografia em features/páginas) opera nos mesmos arquivos depois desta, sem reabrir a forma.

### Skills a invocar

- `tailwindcss`: aplicar as classes `rounded-xs/sm/md/lg/xl` corretas, sem reintroduzir valores arbitrários.
- `test-antipatterns`: os testes atualizados/novos devem asserir a classe real renderizada, nunca mockar o componente.
- `no-workarounds`: se algum caso não se encaixar claramente na regra de mapeamento (ex.: elemento decorativo sem medida clara), resolver medindo o elemento no código-fonte, nunca chutando ou usando `rounded-full` residual "temporariamente".

## Passos

- **Step 1: Gerar o checklist real de ocorrências**

Rodar, na raiz de `apps/frontend`:

```bash
rg -n --pcre2 'rounded(-full|-\[|-[trblse]{1,2}-\[|-2xl|-3xl)|rounded(?![-\w])' src/features src/app --glob '!*.test.*' --glob '!globals.css'
```

Usar a saída como checklist definitivo (os caminhos de `features/admin/...` foram abreviados na pesquisa; esta é a fonte de verdade). Cruzar cada ocorrência com a tabela do Step 3.

- **Step 2: Regra de mapeamento (mesma da task-03, aplicar em todos os arquivos)**

`rounded-full`: lado < 12px → `rounded-none`; ≤ 20px → `rounded-xs`; ≤ 40px → `rounded-sm`; maior → `rounded-md`; pills de texto (badges/chips) → `rounded-sm`; barras finas (`h-0.5`) → `rounded-none`; decoração blur de fundo → `rounded-none`.
`rounded-[Npx]`: 2-4px → `rounded-xs`; 6-8px → `rounded-sm`; 10-14px → `rounded-md`; 16px+/`2xl`/`3xl` → `rounded-xl` (container principal) ou `rounded-lg` (container interno).
Bare `rounded` (sem sufixo) → `rounded-xs`.
Onde um elemento usa o componente `<Avatar>` de `components/ui/avatar.tsx` (já normalizado pela task-03), nenhuma ação adicional é necessária aqui — só ajustar se o arredondamento for um `className` próprio, fora do componente.

- **Step 3: Checklist de arquivos (arquivo:linha → valor atual → alvo)**

| Arquivo:linha | Valor atual | Alvo |
|---|---|---|
| `app/(authenticated)/academias/[id]/page.tsx:243` | `[12px]` (card) | `rounded-md` |
| `app/(authenticated)/academias/[id]/page.tsx:249` | `[8px]` (img) | `rounded-sm` |
| `app/(authenticated)/admin/check-ins/page.tsx:44` | `[12px]` (Skeleton) | `rounded-md` |
| `app/(authenticated)/admin/planos/page.tsx:105` | `[12px]` (div dashed) | `rounded-md` |
| `app/(authenticated)/admin/usuarios/[userId]/atividade/page.tsx:55` | `[22px]` (Card) | `rounded-xl` |
| `app/(authenticated)/admin/usuarios/page.tsx:71` | `[12px]` (erro) | `rounded-md` |
| `app/(authenticated)/assinatura/page.tsx:264` | `full` (badge) | `rounded-sm` |
| `app/(authenticated)/assinatura/page.tsx:281` | `full` (icon circle) | medir e aplicar regra |
| `app/(authenticated)/assinatura/page.tsx:302` | `2xl` (card) | `rounded-xl` |
| `app/(authenticated)/assinatura/page.tsx:388` | `[12px]` (erro) | `rounded-md` |
| `app/(authenticated)/assinatura/page.tsx:477` | `[12px]` (aviso) | `rounded-md` |
| `app/(authenticated)/calendario/page.tsx:58` | `full` (chip data) | `rounded-sm` |
| `app/(authenticated)/calendario/page.tsx:92` | `[22px]` (Skeleton) | `rounded-xl` |
| `app/(authenticated)/calendario/page.tsx:107` | `[12px]` (empty) | `rounded-md` |
| `app/(authenticated)/check-ins/page.tsx:43` | `[12px]` (Skeleton) | `rounded-md` |
| `app/(authenticated)/perfil/[userId]/page.tsx:152` | `[12px]` (card) | `rounded-md` |
| `app/(authenticated)/perfil/page.tsx:86` | `full` (Skeleton avatar) | medir e aplicar regra |
| `app/(authenticated)/perfil/page.tsx:251` | `[10px]` (toggle) | `rounded-md` |
| `app/(authenticated)/perfil/page.tsx:499` | `[22px]` (Card) | `rounded-xl` |
| `app/(authenticated)/perfil/senha/page.tsx:114,226` | `[12px]` (erro) | `rounded-md` |
| `app/(public)/cadastro/page.tsx:166` | `[12px]` (erro) | `rounded-md` |
| `app/(public)/login/page.tsx:175` | `[12px]` (erro) | `rounded-md` |
| `app/(public)/page.tsx:33` | `full` (badge) | `rounded-sm` |
| `app/(public)/page.tsx:75,83,91` | `[12px]` (cards li) | `rounded-md` |
| `features/activity/components/activity-pagination-card-header.tsx:38` | `full` (label) | `rounded-sm` |
| `features/activity/components/activity-pagination-card-header.tsx:49` | bare `rounded` (input) | `rounded-xs` |
| `features/activity/components/activity-tab.tsx:125` | `full` (avatar) | medir e aplicar regra |
| `features/activity/components/activity-tab.tsx:162` | `[12px]` (erro) | `rounded-md` |
| `features/admin/analytics/.../at-risk-alert-zone.tsx:24` | `[6px]` | `rounded-sm` |
| `features/admin/analytics/.../at-risk-alert-zone.tsx:25` | `full` | medir e aplicar regra |
| `features/admin/analytics/.../at-risk-alert-zone.tsx:56,61,80` | bare `rounded` | `rounded-xs` |
| `features/admin/analytics/.../kpi-card-with-sparkline.tsx:42,47,59` | bare `rounded` | `rounded-xs` |
| `features/admin/.../user-detail/details-edit-form.tsx:28` | `[8px]` | `rounded-sm` |
| `features/admin/.../user-detail/user-detail-panel.tsx:42` | `[12px]` | `rounded-md` |
| `features/admin/.../user-filter-bar.tsx:85` | `full` (badge) | `rounded-sm` |
| `features/calendario-feriados/ui/holiday-list.tsx:63` | `[22px]` (Card) | `rounded-xl` |
| `features/calendario-feriados/ui/holiday-list.tsx:81` | `[14px]` (item) | `rounded-md` |
| `features/calendario-feriados/ui/holiday-list.tsx:85` | `[10px]` (data) | `rounded-md` |
| `features/calendario-feriados/ui/monthly-calendar.tsx:179` | `[22px]` (Card) | `rounded-xl` |
| `features/check-ins/components/check-in-filter-bar.tsx:102` | `full` (badge) | `rounded-sm` |
| `features/check-ins/components/check-in-item.tsx:56` | `[13px]` (ícone círculo) | `rounded-md` |
| `features/dashboard/components/checkins-timeline.tsx:62,67,95,110` | `full` (dots/badges) | medir cada um: dot < 12px → `rounded-none`; badge → `rounded-sm` |
| `features/dashboard/components/profile-hero-card.tsx:28` | `full` (Avatar) | se usar `<Avatar>`, já normalizado (task-03); senão medir e aplicar regra |
| `features/dashboard/components/profile-hero-card.tsx:45` | `full` (badge) | `rounded-sm` |
| `features/dashboard/components/profile-hero-card.tsx:51` | `full` (dot) | `rounded-none` (< 12px) |
| `features/dashboard/components/profile-hero-card.tsx:114` | `full` (Skeleton) | medir e aplicar regra |
| `features/dashboard/components/status-donut-card.tsx:71,145` | `full` | medir e aplicar regra |
| `features/gyms/components/gym-card-skeleton.tsx:14,16,17,19,20` | bare `rounded` | `rounded-xs` |
| `features/gyms/components/gym-location-picker.tsx:144,156` | bare `rounded` | `rounded-xs` |
| `features/gyms/components/gym-results.tsx:138` | `[22px]` | `rounded-xl` (coberto pelo Step 4/5 com teste) |
| `features/gyms/components/gym-row.tsx:30` | `[8px]` | `rounded-sm` |
| `features/gyms/components/operating-hours-field.tsx:216` | bare `rounded` (checkbox) | `rounded-xs` |
| `features/gyms/components/operating-hours-summary.tsx:144,163` | `[10px]` | `rounded-md` |
| `features/gyms/components/operating-hours-summary.tsx:181` | `full` | `rounded-sm` |
| `features/notices/components/audience-selector.tsx:70` | `full` | `rounded-sm` |
| `features/plans-admin/components/plan-card.tsx:37` | `[12px]` | `rounded-md` |
| `features/subscriptions/components/plan-card-hero.tsx:17` | `[22px]` (card) | `rounded-xl` |
| `features/subscriptions/components/plan-card-hero.tsx:21` | `full` (blur decor) | `rounded-none` (exceção explícita) |
| `features/subscriptions/components/plan-card-hero.tsx:23` | `full` (badge) | `rounded-sm` |
| `features/subscriptions/components/plan-card-hero.tsx:39` | `full` (icon) | medir e aplicar regra |
| `features/subscriptions/components/plan-card-secondary.tsx:12` | `[14px]` | `rounded-md` |

- **Step 4: Write the failing test — gym-results.tsx**

```tsx
test("card de resultado não usa mais rounded-[22px]; usa o token de chanfro rounded-xl", () => {
	render(<GymResults gyms={[mockGym]} />)
	expect(screen.getByTestId("gym-card")).not.toHaveClass("rounded-[22px]")
	expect(screen.getByTestId("gym-card")).toHaveClass("rounded-xl")
})
```

- **Step 5: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/features/gyms/components/gym-results.test.tsx`
Expected: FAIL — o card ainda usa `rounded-[22px]` (assertion na linha 156 do teste atual).

- **Step 6: Write minimal implementation — gym-results.tsx**

Em `features/gyms/components/gym-results.tsx:138`, trocar `rounded-[22px]` por `rounded-xl`.

- **Step 7: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/features/gyms/components/gym-results.test.tsx`
Expected: PASS.

- **Step 8: Review Focus: "Dot de status ou elemento com menos de 12px de lado → canto reto (`rounded-none`), nunca losango" — Write the failing test (profile-hero-card)**

```tsx
test("avatar, badge e dot de status do hero não usam rounded-full", () => {
	render(<ProfileHeroCard profile={mockProfile} />)
	expect(screen.getByTestId("hero-avatar")).not.toHaveClass("rounded-full")
	expect(screen.getByTestId("hero-badge")).not.toHaveClass("rounded-full")
	expect(screen.getByTestId("hero-status-dot")).toHaveClass("rounded-none")
})
```

- **Step 9: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/features/dashboard/components/profile-hero-card.test.tsx`
Expected: FAIL — avatar/badge/dot ainda usam `rounded-full`.

- **Step 10: Write minimal implementation — profile-hero-card.tsx**

Aplicar o checklist do Step 3 às linhas 28, 45 e 51 de `profile-hero-card.tsx`.

- **Step 11: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/features/dashboard/components/profile-hero-card.test.tsx`
Expected: PASS.

- **Step 12: Aplicar o restante do checklist do Step 3**

Aplicar a normalização a todos os arquivos restantes do checklist do Step 3 que não têm teste dedicado nesta task. Cada troca é mecânica (classe Tailwind por classe Tailwind); a guarda de resíduo da task-08 (`rounded-residue.test.ts`) cobre a regressão nesses casos sem teste próprio.

- **Step 13: Commit** *(somente se `workflow.auto_commit` estiver ativo no prompt do implementador; caso contrário, pular este passo e reportar os arquivos alterados)*

```bash
git add apps/frontend/src/features apps/frontend/src/app
git commit -m "feat(frontend): normaliza arredondamento avulso para tokens de chanfro em features/ e app/"
```

## Critérios de Sucesso

- O `rg` do Step 1, rodado de novo ao final, não retorna nenhuma ocorrência em `src/features` e `src/app` fora de `weather-globe.tsx`/`weather-globe-fallback.tsx` (FR-003, FR-004).
- `gym-results.test.tsx` e `profile-hero-card.test.tsx` passam com as classes normalizadas.
- Elementos com lado < 12px (dots de status) usam `rounded-none` (FR-004).
