# Task 17: ActivityTab — agrupamento por data + ícone por categoria [FR-002, FR-003, FR-004, FR-013]

**Status:** DONE
**PRD:** `../prd/prd-historico-atividade-usuario.md`
**Spec:** `../specs/historico-atividade-usuario-design.md`
**Tier:** capable
**Depends on:** N/A

## Visão Geral

Evoluir `ActivityTab` (`apps/frontend/src/features/admin/components/user-detail/activity-tab.tsx`) para: (1) agrupar os eventos visualmente por data — "Hoje", "Ontem" ou a data completa em pt-BR (FR-003); (2) exibir um ícone com cor distinta por categoria de evento — check-in, segurança, conta/perfil/administrativo (FR-004); (3) indicar o tipo de cada evento junto do horário (FR-002). O estado vazio existente ("Sem dados de atividade disponíveis") permanece inalterado (FR-013 — regressão). A interface `UserActivityEvent` do componente ganha o campo `type`, hoje ausente, necessário para o mapeamento de ícone/cor.

**Estados de loading e erro (achado de revisão):** a busca real via hook React Query (task 16, conectada na task 18) introduz dois estados que o componente hoje não distingue do vazio — sem isso, uma falha de rede fica visualmente idêntica a "usuário sem atividade", enganoso numa tela usada em decisões administrativas. `ActivityTabProps` ganha `isLoading?: boolean` e `isError?: boolean`, seguindo o mesmo padrão de `isLoading`/`isError` já usado em `apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx` (`LoadingState`/`ErrorState`, com `Skeleton` de `@/components/ui/skeleton`).

## Arquivos

- Modify: `apps/frontend/src/features/admin/components/user-detail/activity-tab.tsx`
- Modify: `apps/frontend/src/features/admin/components/user-detail/user-detail-format.ts`
- Test: `apps/frontend/src/features/admin/components/user-detail/activity-tab.test.tsx`

### Conformidade com as Skills Padrão

- `tailwindcss`: uso dos tokens de tema já existentes (`bg-accent/16`, `bg-warning-soft`, `bg-surface-3`, `text-subtle`, `text-muted-foreground`) em vez de cores arbitrárias — os mesmos tokens já usados em `user-row.test.tsx` (`bg-accent/40`) e `globals.css` (`--color-warning-soft`, `--color-surface-3`).
- `shadcn`: reaproveita `EmptyState` (design system do projeto) sem alterar sua API.
- `vercel-composition-patterns`: o agrupamento por data e o ícone por categoria são extraídos em subcomponentes pequenos (`ActivityGroupHeader`, `ActivityEventIcon`) em vez de um único componente monolítico com condicionais inline.
- `vercel-react-best-practices`: `groupEventsByDate` é uma função pura fora do componente (não recalculada via hook desnecessário), já que a lista de eventos é pequena (máx. 20 itens) e já vem ordenada do backend.
- `frontend-design` / `impeccable`: hierarquia visual do agrupamento (cabeçalho uppercase pequeno antes de cada grupo) e diferenciação de cor por categoria, conforme a Especificação Visual do mockup.
- `typescript-advanced`: `ACTIVITY_ICON_CONFIG` é um `Record<UserActivityEventType, ActivityIconConfig>` — garante em tempo de compilação que todo tipo de evento tem um ícone/cor mapeado.
- `test-antipatterns`: os testes novos verificam o DOM renderizado (texto do cabeçalho de grupo, presença do ícone), não detalhes internos de implementação como o nome da função `groupEventsByDate`.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/historico-atividade-usuario-visual.md` (baseline de layout/spacing/hierarquia/tokens).
- **Fonte de design original:** nenhuma — confirmado no spec de design; seguir o mockup curado.
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL de Figma) para esta tela além do mockup em markdown já commitado?
- **Ferramentas de fidelidade visual (descobrir no ambiente):** nenhuma skill/MCP de design-to-code ou teste visual configurada neste repositório no momento em que este plano foi escrito — construir manualmente a partir do mockup curado, reaproveitando `EmptyState` já existente no design system do projeto.
- **Decisões visuais já tomadas (não refazer):** categorias de ícone/cor definidas na Especificação Visual — `CHECK_IN` → fundo `bg-accent/16`, ícone `text-accent`; `PASSWORD_CHANGED`/`ACCOUNT_LOCKED` (segurança) → fundo `bg-warning-soft`, ícone `text-warning`; `GOOGLE_LINKED`/`PROFILE_UPDATED`/`ROLE_CHANGED`/`STATUS_CHANGED`/`LOGIN` (conta/perfil/administrativo) → fundo `bg-surface-3`, ícone `text-muted-foreground`. Cabeçalho de grupo: uppercase, `text-[11px] font-semibold tracking-[.04em] text-subtle`.

## Passos

- **Step 0: Confirmar fonte de design e ferramentas de fidelidade**

Perguntar ao usuário se existe uma fonte de design original (Figma ou equivalente) para a aba "Atividade" além do mockup curado em `../specs/mockups/historico-atividade-usuario-visual.md`. Verificar no ambiente atual se há alguma skill/MCP de design-to-code ou teste visual conectada (nenhuma foi encontrada no momento em que este plano foi escrito). Se nenhuma fonte/ferramenta adicional existir, construir manualmente a partir do mockup curado, reaproveitando as decisões visuais já registradas acima (não redefinir cores, espaçamento ou hierarquia).

- **Step 1: Escrever os testes falhando**

```typescript
// apps/frontend/src/features/admin/components/user-detail/activity-tab.test.tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { ActivityTab, type UserActivityEvent } from "./activity-tab"

function buildEvent(overrides: Partial<UserActivityEvent> = {}): UserActivityEvent {
	return {
		id: "e1",
		type: "LOGIN",
		description: "Login realizado",
		occurredAt: new Date().toISOString(),
		...overrides,
	}
}

describe("ActivityTab", () => {
	test("exibe estado vazio quando não há eventos", () => {
		render(<ActivityTab events={[]} />)
		expect(
			screen.getByText("Sem dados de atividade disponíveis"),
		).toBeInTheDocument()
	})

	test("exibe estado vazio por padrão quando events é omitido", () => {
		render(<ActivityTab />)
		expect(
			screen.getByText("Sem dados de atividade disponíveis"),
		).toBeInTheDocument()
	})

	test("renderiza a lista de eventos quando fornecida", () => {
		const events: UserActivityEvent[] = [
			buildEvent({ id: "e1", description: "Conta criada" }),
			buildEvent({ id: "e2", description: "Login realizado" }),
		]
		render(<ActivityTab events={events} />)
		expect(screen.getByText("Conta criada")).toBeInTheDocument()
		expect(screen.getByText("Login realizado")).toBeInTheDocument()
	})

	test("agrupa eventos de datas diferentes sob cabeçalhos de grupo distintos", () => {
		const today = new Date()
		const longAgo = new Date("2024-01-05T10:00:00.000Z")
		const events: UserActivityEvent[] = [
			buildEvent({ id: "e1", occurredAt: today.toISOString() }),
			buildEvent({ id: "e2", occurredAt: longAgo.toISOString() }),
		]
		render(<ActivityTab events={events} />)

		expect(screen.getByText("Hoje")).toBeInTheDocument()
		expect(
			screen.getByText(
				new Intl.DateTimeFormat("pt-BR", {
					day: "2-digit",
					month: "long",
					year: "numeric",
				}).format(longAgo),
			),
		).toBeInTheDocument()
	})

	test("exibe ícone com cor de destaque para eventos do tipo CHECK_IN", () => {
		const events: UserActivityEvent[] = [
			buildEvent({ id: "e1", type: "CHECK_IN", description: "Check-in — Academia Central" }),
		]
		render(<ActivityTab events={events} />)

		const item = screen.getByText("Check-in — Academia Central").closest("li")
		expect(item).not.toBeNull()
		const badge = (item as HTMLElement).querySelector(".bg-accent\\/16")
		expect(badge).not.toBeNull()
	})

	test("exibe skeleton de carregamento distinto do estado vazio quando isLoading", () => {
		render(<ActivityTab events={[]} isLoading />)
		expect(screen.getByTestId("activity-tab-skeleton")).toBeInTheDocument()
		expect(
			screen.queryByText("Sem dados de atividade disponíveis"),
		).not.toBeInTheDocument()
	})

	test("exibe mensagem de erro distinta do estado vazio quando isError", () => {
		render(<ActivityTab events={[]} isError />)
		expect(
			screen.getByText("Não foi possível carregar o histórico de atividade."),
		).toBeInTheDocument()
		expect(
			screen.queryByText("Sem dados de atividade disponíveis"),
		).not.toBeInTheDocument()
	})
})
```

- **Step 2: Rodar os testes e confirmar a falha**

Run: `vitest run src/features/admin/components/user-detail/activity-tab.test.tsx` (a partir de `apps/frontend/`)
Expected: FAIL — `type` ausente na interface `UserActivityEvent` (erro de tipagem nos fixtures), "Hoje"/cabeçalho de grupo, o badge `bg-accent/16`, o skeleton de loading e a mensagem de erro ainda não existem no componente.

- **Step 3: Implementação mínima**

Adicionar `formatActivityGroupLabel` a `apps/frontend/src/features/admin/components/user-detail/user-detail-format.ts` (mantendo `statusLabel`, `statusTone` e `formatCreatedAt` já existentes):

```typescript
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
```

Reescrever `apps/frontend/src/features/admin/components/user-detail/activity-tab.tsx`:

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
import { formatActivityGroupLabel } from "./user-detail-format"

const ACTIVITY_SKELETON_KEYS = [0, 1, 2] as const

export type UserActivityEventType =
	| "LOGIN"
	| "PASSWORD_CHANGED"
	| "ACCOUNT_LOCKED"
	| "GOOGLE_LINKED"
	| "PROFILE_UPDATED"
	| "ROLE_CHANGED"
	| "STATUS_CHANGED"
	| "CHECK_IN"

export interface UserActivityEvent {
	id: string
	type: UserActivityEventType
	description: string
	occurredAt: string
}

export interface ActivityTabProps {
	events?: UserActivityEvent[]
	isLoading?: boolean
	isError?: boolean
}

interface ActivityIconConfig {
	icon: ComponentType<{ className?: string }>
	iconClassName: string
	badgeClassName: string
}

const ACTIVITY_ICON_CONFIG: Record<UserActivityEventType, ActivityIconConfig> = {
	CHECK_IN: {
		icon: CheckCircle2,
		iconClassName: "text-accent",
		badgeClassName: "bg-accent/16",
	},
	PASSWORD_CHANGED: {
		icon: KeyRound,
		iconClassName: "text-warning",
		badgeClassName: "bg-warning-soft",
	},
	ACCOUNT_LOCKED: {
		icon: ShieldAlert,
		iconClassName: "text-warning",
		badgeClassName: "bg-warning-soft",
	},
	GOOGLE_LINKED: {
		icon: UserCircle,
		iconClassName: "text-muted-foreground",
		badgeClassName: "bg-surface-3",
	},
	PROFILE_UPDATED: {
		icon: UserCircle,
		iconClassName: "text-muted-foreground",
		badgeClassName: "bg-surface-3",
	},
	ROLE_CHANGED: {
		icon: ShieldCheck,
		iconClassName: "text-muted-foreground",
		badgeClassName: "bg-surface-3",
	},
	STATUS_CHANGED: {
		icon: UserCircle,
		iconClassName: "text-muted-foreground",
		badgeClassName: "bg-surface-3",
	},
	LOGIN: {
		icon: UserCircle,
		iconClassName: "text-muted-foreground",
		badgeClassName: "bg-surface-3",
	},
}

interface ActivityGroup {
	label: string
	events: UserActivityEvent[]
}

function groupEventsByDate(events: UserActivityEvent[]): ActivityGroup[] {
	const groups: ActivityGroup[] = []
	for (const event of events) {
		const label = formatActivityGroupLabel(event.occurredAt)
		const lastGroup = groups.at(-1)
		if (lastGroup && lastGroup.label === label) {
			lastGroup.events.push(event)
		} else {
			groups.push({ label, events: [event] })
		}
	}
	return groups
}

function ActivityEventIcon({ type }: { type: UserActivityEventType }) {
	const config = ACTIVITY_ICON_CONFIG[type]
	const Icon = config.icon
	return (
		<div
			className={cn(
				"flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
				config.badgeClassName,
			)}
		>
			<Icon className={cn("h-4 w-4", config.iconClassName)} />
		</div>
	)
}

function ActivityGroupHeader({ label }: { label: string }) {
	return (
		<span className="text-[11px] font-semibold uppercase tracking-[.04em] text-subtle">
			{label}
		</span>
	)
}

export function ActivityTab({
	events = [],
	isLoading = false,
	isError = false,
}: ActivityTabProps) {
	if (isLoading) {
		return (
			<ul
				data-testid="activity-tab-skeleton"
				aria-label="Carregando atividade"
				className="flex flex-col gap-3"
			>
				{ACTIVITY_SKELETON_KEYS.map((key) => (
					<li key={key}>
						<Skeleton className="h-10 w-full" />
					</li>
				))}
			</ul>
		)
	}

	if (isError) {
		return (
			<p
				role="alert"
				className="rounded-[12px] border border-transparent bg-destructive-soft px-4 py-3 text-sm text-destructive"
			>
				Não foi possível carregar o histórico de atividade.
			</p>
		)
	}

	if (events.length === 0) {
		return (
			<EmptyState
				icon={Activity}
				title="Sem dados de atividade disponíveis"
				description="O histórico de atividade deste usuário ainda não está disponível."
			/>
		)
	}

	const groups = groupEventsByDate(events)

	return (
		<div className="flex flex-col gap-4">
			{groups.map((group) => (
				<div key={group.label} className="flex flex-col gap-3">
					<ActivityGroupHeader label={group.label} />
					<ul className="flex flex-col gap-3">
						{group.events.map((event) => (
							<li key={event.id} className="flex items-start gap-3">
								<ActivityEventIcon type={event.type} />
								<div className="flex flex-col gap-0.5">
									<span className="text-sm text-foreground">
										{event.description}
									</span>
									<span className="text-xs text-muted-foreground">
										{event.occurredAt}
									</span>
								</div>
							</li>
						))}
					</ul>
				</div>
			))}
		</div>
	)
}
```

- **Step 4: Rodar os testes e confirmar o sucesso**

Run: `vitest run src/features/admin/components/user-detail/activity-tab.test.tsx` (a partir de `apps/frontend/`)
Expected: PASS — os 7 testes.

- **Step 5: Commit**

Commit pulado — orquestrador faz commit na barreira de integração da wave; reporte os arquivos alterados (esta task está na Wave 1, execução paralela).

## Critérios de Sucesso

- Eventos de datas diferentes renderizam cabeçalhos de grupo distintos ("Hoje", "Ontem" ou a data completa em pt-BR), preservando a ordem já decrescente vinda do backend (FR-003).
- Cada item exibe um ícone cuja cor de fundo/ícone reflete a categoria do evento (`bg-accent/16` para check-in, `bg-warning-soft` para segurança, `bg-surface-3` para conta/perfil/administrativo) — FR-004.
- A descrição e o horário de cada evento continuam visíveis (FR-002).
- O estado vazio ("Sem dados de atividade disponíveis") continua sendo renderizado sem alteração quando `events` é vazio ou omitido (FR-013).
- `isLoading` renderiza um skeleton distinto do estado vazio; `isError` renderiza uma mensagem de erro distinta do estado vazio — nenhum dos dois é confundível com "sem eventos" (achado de revisão).
- Os 7 testes de `activity-tab.test.tsx`, incluindo os 3 adaptados dos pré-existentes, passam.
