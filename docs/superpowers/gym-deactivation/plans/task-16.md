# Task 16: `GymStatusConfirmationDialog` (frontend) [FR-004]

**Status:** PENDING
**PRD:** `../prd/prd-gym-deactivation.md`
**Spec:** `../specs/gym-deactivation-design.md`
**Tier:** cheap
**Depends on:** N/A

## Visão Geral

Cria `GymStatusConfirmationDialog`, um componente de confirmação reaproveitando exatamente o
padrão visual/estrutural de `SuspendConfirmationDialog`
(`apps/frontend/src/features/admin/components/user-detail/confirmation-dialogs.tsx`), mas
parametrizado por `action: "deactivate" | "activate"` — um único componente cujo título,
descrição, cor e label do botão de ação trocam de acordo com a ação, em vez de dois
componentes separados. Isso reflete a decisão visual de "o botão troca de estado", já expressa
para o botão-gatilho no mockup, também aplicada ao modal que ele abre.

## Arquivos

- Create: `apps/frontend/src/features/gyms/components/gym-status-confirmation-dialog.tsx`
- Test: `apps/frontend/src/features/gyms/components/gym-status-confirmation-dialog.test.tsx`

### Conformidade com as Skills Padrão

- `typescript-advanced`: união discriminada `action: "deactivate" | "activate"` derivando
  título/descrição/variant/label sem `any`, com um `Record` tipado por ação.
- `react-components` (se disponível no repo; caso não exista skill nomeada, aplicar a
  categoria mínima — componente controlado, sem estado interno de abertura, `open`/
  `onOpenChange` vindos do pai): componente 100% controlado, seguindo o mesmo contrato de
  `SuspendConfirmationDialog`.
- `vitest`: suíte de teste com `@testing-library/react` + `renderWithProviders`, seguindo o
  padrão real de `gym-card.test.tsx`.
- `no-workarounds`: nenhum texto ou cor hardcoded fora do mapa de configuração por ação —
  evita duplicar lógica de estilo entre os dois estados.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/gym-deactivation-visual.md` (baseline de
  layout/spacing/hierarquia/tokens)
- **Fonte de design original:** nenhuma; seguir o mockup curado (aprovado pelo usuário sem
  alterações, conforme o próprio arquivo de mockup)
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL/Figma) para esta
  tela além do mockup curado?
- **Ferramentas de fidelidade visual (descobrir no ambiente):** nenhuma ferramenta de
  design-to-code ou teste visual foi encontrada configurada neste repo no momento do
  planejamento; construir manualmente a partir do mockup, revalidando a lista de
  skills/MCPs disponíveis no ambiente de execução antes de assumir que continua sendo o caso.
- **Decisões visuais já tomadas (não refazer):** reaproveitar 100% a estrutura visual do
  `AlertDialog` já existente (`border-radius: 12px`, `padding: 24px`, título `font-display`
  19-20px, descrição `text-sm text-muted-foreground`); footer com `AlertDialogCancel`
  (`variant="outline"`) + botão de ação com `variant="destructive"` para desativar e
  `variant="primary"` (não `"default"` — essa variante não existe em `buttonVariants`, ver
  `apps/frontend/src/components/ui/button.tsx`) para reativar; troca de label durante
  `isPending` (`"Desativando..."` / `"Reativando..."`).

## Passos

- **Step 0: Confirmar fonte de design e ferramentas de fidelidade**

Ler `../specs/mockups/gym-deactivation-visual.md` (já lido e resumido acima em "Decisões
visuais já tomadas") e confirmar com o usuário se existe alguma fonte de design original além
do mockup curado. Se nenhuma ferramenta de design-to-code/teste visual estiver configurada no
ambiente de execução no momento de implementar esta task, prosseguir manualmente contra o
mockup — essa é uma resposta válida, não um bloqueio.

- **Step 1: Escrever o teste que falha**

```typescript
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import { renderWithProviders } from "@/test/render"
import { GymStatusConfirmationDialog } from "./gym-status-confirmation-dialog"

describe("GymStatusConfirmationDialog", () => {
	test("modo 'deactivate' exibe título e descrição de desativação", () => {
		renderWithProviders(
			<GymStatusConfirmationDialog
				open
				action="deactivate"
				gymTitle="Iron Gym"
				isPending={false}
				onOpenChange={vi.fn()}
				onConfirm={vi.fn()}
			/>,
		)

		expect(screen.getByText("Confirmar desativação")).toBeInTheDocument()
		expect(
			screen.getByText(/deixará de aparecer nas buscas/i),
		).toBeInTheDocument()
		expect(
			screen.getByRole("button", { name: "Confirmar desativação" }),
		).toBeInTheDocument()
	})

	test("modo 'activate' exibe título e descrição de reativação", () => {
		renderWithProviders(
			<GymStatusConfirmationDialog
				open
				action="activate"
				gymTitle="Iron Gym"
				isPending={false}
				onOpenChange={vi.fn()}
				onConfirm={vi.fn()}
			/>,
		)

		expect(screen.getByText("Confirmar reativação")).toBeInTheDocument()
		expect(
			screen.getByText(/voltará a aparecer nas buscas/i),
		).toBeInTheDocument()
		expect(
			screen.getByRole("button", { name: "Confirmar reativação" }),
		).toBeInTheDocument()
	})

	test("durante isPending, o botão de ação troca de label e fica desabilitado", () => {
		renderWithProviders(
			<GymStatusConfirmationDialog
				open
				action="deactivate"
				gymTitle="Iron Gym"
				isPending
				onOpenChange={vi.fn()}
				onConfirm={vi.fn()}
			/>,
		)

		const actionButton = screen.getByRole("button", { name: "Desativando..." })
		expect(actionButton).toBeDisabled()
	})

	test("clicar no botão de ação chama onConfirm", async () => {
		const user = userEvent.setup()
		const onConfirm = vi.fn()
		renderWithProviders(
			<GymStatusConfirmationDialog
				open
				action="activate"
				gymTitle="Iron Gym"
				isPending={false}
				onOpenChange={vi.fn()}
				onConfirm={onConfirm}
			/>,
		)

		await user.click(screen.getByRole("button", { name: "Confirmar reativação" }))

		expect(onConfirm).toHaveBeenCalledTimes(1)
	})
})
```

- **Step 2: Rodar o teste e confirmar que falha**

Run: `pnpm --filter frontend test:run -- gym-status-confirmation-dialog`
Expected: FAIL — o módulo `./gym-status-confirmation-dialog` ainda não existe.

- **Step 3: Implementação mínima**

```typescript
"use client"

import type { MouseEvent } from "react"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button, type ButtonProps } from "@/components/ui/button"

export type GymStatusAction = "deactivate" | "activate"

export interface GymStatusConfirmationDialogProps {
	open: boolean
	action: GymStatusAction
	gymTitle: string
	isPending: boolean
	onOpenChange: (open: boolean) => void
	onConfirm: (event: MouseEvent<HTMLButtonElement>) => void
}

interface StatusActionConfig {
	title: string
	description: string
	confirmLabel: string
	pendingLabel: string
	variant: ButtonProps["variant"]
}

const STATUS_ACTION_CONFIG: Record<GymStatusAction, StatusActionConfig> = {
	deactivate: {
		title: "Confirmar desativação",
		description:
			"Essa academia deixará de aparecer nas buscas e não será mais possível fazer check-in nela. Os check-ins e dados já registrados são mantidos. Você pode reverter essa ação depois.",
		confirmLabel: "Confirmar desativação",
		pendingLabel: "Desativando...",
		variant: "destructive",
	},
	activate: {
		title: "Confirmar reativação",
		description:
			"Essa academia voltará a aparecer nas buscas e será possível fazer check-in nela novamente.",
		confirmLabel: "Confirmar reativação",
		pendingLabel: "Reativando...",
		variant: "primary",
	},
}

export function GymStatusConfirmationDialog({
	open,
	action,
	gymTitle,
	isPending,
	onOpenChange,
	onConfirm,
}: GymStatusConfirmationDialogProps) {
	const config = STATUS_ACTION_CONFIG[action]

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{config.title}</AlertDialogTitle>
					<AlertDialogDescription>{config.description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
					<AlertDialogAction asChild>
						<Button
							variant={config.variant}
							onClick={onConfirm}
							disabled={isPending}
							aria-busy={isPending}
							aria-label={`${config.confirmLabel} ${gymTitle}`}
						>
							{isPending ? config.pendingLabel : config.confirmLabel}
						</Button>
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
```

`aria-label` do botão de ação inclui `gymTitle` para acessibilidade (nome único quando há
múltiplos diálogos no DOM em algum fluxo futuro), mas `getByRole("button", { name: ... })` nos
testes acima usa `config.confirmLabel` puro — ajustar o teste para usar
`` `${confirmLabel} ${gymTitle}` `` quando o `aria-label` estiver presente, OU remover o
`aria-label` composto se o texto visível do botão já for suficiente para
`@testing-library`'s cálculo de "accessible name" (o texto interno do botão já compõe o nome
acessível por padrão; um `aria-label` explícito o sobrescreve). Como o texto visível
(`config.confirmLabel`/`config.pendingLabel`) já é suficiente e mais simples, a implementação
final **não deve** incluir o `aria-label` composto acima — usar apenas o texto interno do
botão como nome acessível, mantendo os testes do Step 1 válidos como estão. Remover a linha
`aria-label={...}` do trecho de código acima antes de considerar esta task concluída.

- **Step 4: Rodar o teste e confirmar que passa**

Run: `pnpm --filter frontend test:run -- gym-status-confirmation-dialog`
Expected: PASS — os 4 casos de teste passam.

- **Step 5: Commit**

```bash
git add apps/frontend/src/features/gyms/components/gym-status-confirmation-dialog.tsx \
  apps/frontend/src/features/gyms/components/gym-status-confirmation-dialog.test.tsx
git commit -m "feat(gym): add GymStatusConfirmationDialog component"
```

## Critérios de Sucesso

- Um único componente `GymStatusConfirmationDialog` cobre os dois modos (`deactivate` e
  `activate`), sem duplicação de estrutura JSX entre eles (FR-004).
- Modo `deactivate` mostra "Confirmar desativação" e a descrição de desativação; modo
  `activate` mostra "Confirmar reativação" e a descrição de reativação.
- O botão de ação usa `variant="destructive"` para desativar e `variant="primary"` para
  reativar — nunca `variant="default"` (variante inexistente em `buttonVariants`).
- Durante `isPending`, o botão de ação troca de label (`"Desativando..."`/`"Reativando..."`) e
  fica `disabled`.
- Clicar no botão de ação invoca `onConfirm` exatamente uma vez.
- `pnpm --filter frontend test:run -- gym-status-confirmation-dialog` passa com os 4 casos
  mínimos.
