# Task 2: Mover `ActivityTab` e helpers de formatação para `features/activity/` [FR-004, FR-005, FR-008, FR-009, FR-010, FR-011, FR-012]

**Status:** DONE
**PRD:** `../prd/prd-historico-atividade-perfil.md`
**Spec:** `../specs/historico-atividade-perfil-design.md`
**Tier:** standard
**Depends on:** N/A

## Visão Geral

Move o componente presentacional `ActivityTab` e os helpers de formatação de atividade (`formatActivityGroupLabel`, `formatActivityTime`, `isSameCalendarDay`) do módulo `features/admin/components/user-detail/` para o novo módulo compartilhado `features/activity/components/` (D2). O componente é 100% presentacional com props estáveis (`events`, `isLoading`, `isError`) — o move é seguro e coberto pelos testes existentes do `ActivityTab` (agrupamento por data FR-008, ícone por categoria FR-009, loading distinto do vazio FR-010, erro distinto do vazio FR-011, vazio FR-012, tipo+horário por evento FR-004/FR-005). O admin passa a importar do novo local; os arquivos antigos são removidos. Não há mudança de comportamento.

## Arquivos

- Create: `apps/frontend/src/features/activity/components/activity-tab.tsx`
- Create: `apps/frontend/src/features/activity/components/activity-format.ts`
- Test: `apps/frontend/src/features/activity/components/activity-tab.test.tsx` (movido de admin)
- Modify: `apps/frontend/src/features/admin/components/user-detail/user-detail-panel.tsx` (import de `ActivityTab`)
- Modify: `apps/frontend/src/features/admin/components/user-detail/user-detail-format.ts` (remove helpers de atividade)
- Delete: `apps/frontend/src/features/admin/components/user-detail/activity-tab.tsx`
- Delete: `apps/frontend/src/features/admin/components/user-detail/activity-tab.test.tsx`

### Conformidade com as Skills Padrão

- `code-style`: convenções de nomeação/estrutura React/TS do projeto (componentes PascalCase, arquivos kebab-case, imports `@/features/...`).
- `refactoring`: move sem mudança de comportamento (Fowler) — o componente e seus helpers são realocados intactos, testes existentes validam.
- `test-antipatterns`: testes existentes do `ActivityTab` e do `UserDetailTabs` continuam a validar a tela admin após o move — não criar mocks desnecessários.

### Fidelidade Visual

<!-- N/A — esta task apenas realoca o componente; o mockup é o norte da Task 4 (página /perfil). Subseção omitida. -->

## Passos

- **Step 1: Mover o módulo de formatação de atividade**

Crie `apps/frontend/src/features/activity/components/activity-format.ts` com exatamente o conteúdo abaixo (copiado de `user-detail-format.ts`, contendo apenas os helpers de atividade + o helper privado `isSameCalendarDay`):

```ts
function isSameCalendarDay(a: Date, b: Date): boolean {
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	)
}

export function formatActivityGroupLabel(occurredAtISO: string): string {
	const date = new Date(occurredAtISO)
	const now = new Date()

	if (isSameCalendarDay(date, now)) return "Hoje"

	const yesterday = new Date(now)
	yesterday.setDate(yesterday.getDate() - 1)
	if (isSameCalendarDay(date, yesterday)) return "Ontem"

	return new Intl.DateTimeFormat("pt-BR", {
		day: "2-digit",
		month: "long",
		year: "numeric",
	}).format(date)
}

export function formatActivityTime(occurredAtISO: string): string {
	try {
		return new Intl.DateTimeFormat("pt-BR", {
			hour: "2-digit",
			minute: "2-digit",
		}).format(new Date(occurredAtISO))
	} catch {
		return occurredAtISO
	}
}
```

- **Step 2: Mover o componente `ActivityTab`**

Crie `apps/frontend/src/features/activity/components/activity-tab.tsx` com o conteúdo exato do atual `apps/frontend/src/features/admin/components/user-detail/activity-tab.tsx`, alterando APENAS o import de `"./user-detail-format"` para `"./activity-format"`. O restante do arquivo (props `ActivityTabProps`, `ACTIVITY_ICON_CONFIG`, `groupEventsByDate`, `ActivityEventIcon`, `ActivityGroupHeader`, skeletons, `EmptyState`) permanece idêntico. Referência do conteúdo atual (218 linhas, transcrito do arquivo de origem):

```tsx
import {
	Activity,
	CheckCircle2,
	KeyRound,
	ShieldAlert,
	ShieldCheck,
	UserCircle,
} from "lucide-react"
import type { ComponentType } from "react"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/cn"
import {
	formatActivityGroupLabel,
	formatActivityTime,
} from "./activity-format"
```

> Copie o corpo completo do arquivo original (`groupEventsByDate`, `ActivityEventIcon`, `ActivityGroupHeader`, `ActivityTabSkeleton`, `ActivityTabError`, `ActivityTab` export, e as constantes `ACTIVITY_SKELETON_KEYS`, `ACTIVITY_ICON_CONFIG`, tipos `UserActivityEventType`/`UserActivityEvent`/`ActivityTabProps`) SEM alteração de lógica. A única mudança é o caminho do import acima.

- **Step 3: Mover o teste do componente**

Mova `apps/frontend/src/features/admin/components/user-detail/activity-tab.test.tsx` para `apps/frontend/src/features/activity/components/activity-tab.test.tsx` sem alterar o conteúdo (o import relativo `"./activity-tab"` continua válido no novo local).

- **Step 4: Atualizar o admin para importar do novo local**

Em `apps/frontend/src/features/admin/components/user-detail/user-detail-panel.tsx`, troque o import do componente:

```tsx
// de:
import { ActivityTab } from "./activity-tab"
// para:
import { ActivityTab } from "@/features/activity/components/activity-tab"
```

- **Step 5: Remover os helpers de atividade do `user-detail-format.ts` do admin**

Em `apps/frontend/src/features/admin/components/user-detail/user-detail-format.ts`, remova `isSameCalendarDay`, `formatActivityGroupLabel` e `formatActivityTime`. Mantenha `statusLabel`, `statusTone` e `formatCreatedAt` (usados por `details-tab.tsx` e `user-detail-panel.tsx`). O arquivo final deve conter apenas:

```ts
export function statusLabel(status: string): string {
	if (status === "activated") return "Ativo"
	if (status === "suspended") return "Inativo"
	if (status === "locked") return "Bloqueado"
	return status
}

export function statusTone(
	status: string,
): "success" | "warning" | "danger" | "neutral" {
	if (status === "activated") return "success"
	if (status === "locked") return "warning"
	if (status === "suspended") return "danger"
	return "neutral"
}

export function formatCreatedAt(iso: string): string {
	try {
		return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(
			new Date(iso),
		)
	} catch {
		return iso
	}
}
```

- **Step 6: Remover os arquivos antigos do admin**

```bash
git rm apps/frontend/src/features/admin/components/user-detail/activity-tab.tsx apps/frontend/src/features/admin/components/user-detail/activity-tab.test.tsx
```

- **Step 7: Rodar os testes movidos e da tela admin**

Run: `npx vitest run src/features/activity/components/activity-tab.test.tsx` (a partir de `apps/frontend`)
Expected: PASS — todos os testes do `ActivityTab` (agrupamento "Hoje"/"Ontem"/data, ícone por categoria, skeleton, erro, vazio) passam no novo local.

Run: `npx vitest run src/features/admin/components/user-detail/user-detail-panel.test.tsx` (a partir de `apps/frontend`)
Expected: PASS — a tela admin (que renderiza `UserDetailTabs` → `ActivityTab`) continua íntegra.

- **Step 8: Commit** *(execução sequencial apenas — em wave paralela o orquestrador faz o commit na barreira de integração. Se você for um implementador em árvore compartilhada, pule este passo e reporte os arquivos.)*

```bash
git add apps/frontend/src/features/activity/components apps/frontend/src/features/admin/components/user-detail
git commit -m "refactor(frontend): move ActivityTab to shared features/activity module"
```

## Critérios de Sucesso

- `ActivityTab` e os helpers de formatação de atividade vivem em `features/activity/components/` e são importados pelo admin a partir desse único local (D2).
- Nenhuma duplicação de markup nem de lógica de formatação do feed — admin e perfil renderizam pelo mesmo `ActivityTab` (Consistência).
- Testes existentes do `ActivityTab` continuam passando no novo local (agrupamento FR-008, ícone/cor FR-009, loading FR-010, erro distinto do vazio FR-011, vazio FR-012, tipo+horário FR-004/FR-005).
- Testes da tela admin (`user-detail-panel.test.tsx`) continuam passando.
- `statusLabel`, `statusTone`, `formatCreatedAt` permanecem no admin sem quebrar `details-tab.tsx`/`user-detail-panel.tsx`.