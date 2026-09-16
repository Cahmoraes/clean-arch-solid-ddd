"use client"

import { UserRound } from "lucide-react"
import { useEffect, useRef } from "react"
import { AnimatedPanel } from "@/components/ui/animated-panel"
import { EmptyState } from "@/components/ui/empty-state"
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet"
import type { AdminUser } from "@/features/admin/api/use-users"
import { useIsDesktop } from "@/lib/hooks/use-is-desktop"
import { UserDetailPanel } from "./user-detail-panel"

export interface UserDetailContainerProps {
	user: AdminUser | null
	onClose: () => void
	onUserPatched?: (patch: Partial<AdminUser>) => void
	onDrawerClosed?: (userId: string) => void
}

function DesktopView({
	user,
	onClose,
	onUserPatched,
}: {
	user: AdminUser | null
	onClose: () => void
	onUserPatched?: (patch: Partial<AdminUser>) => void
}) {
	// Envolve EmptyState + AnimatedPanel num único wrapper DOM: durante a
	// transição de fechamento (FR-006/FR-007) os dois ficam montados ao
	// mesmo tempo (EmptyState já aparece, o painel antigo ainda desvanece).
	// Sem este wrapper, o grid pai (`admin-users-grid`, 2 colunas explícitas)
	// recebe 3 filhos diretos nesse intervalo e o auto-placement do CSS
	// grid quebra o layout do split-view.
	return (
		<div className="lg:self-start lg:sticky lg:top-4">
			{!user && (
				<EmptyState
					icon={UserRound}
					title="Selecione um usuário"
					description="Escolha um usuário na lista para ver os detalhes."
				/>
			)}
			<AnimatedPanel
				open={user !== null}
				className="rounded-lg border border-border bg-card p-5 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto"
			>
				{user ? (
					<UserDetailPanel
						user={user}
						onClose={onClose}
						onUserPatched={onUserPatched}
					/>
				) : null}
			</AnimatedPanel>
		</div>
	)
}

function MobileView({
	user,
	onClose,
	onUserPatched,
	onDrawerClosed,
}: {
	user: AdminUser | null
	onClose: () => void
	onUserPatched?: (patch: Partial<AdminUser>) => void
	onDrawerClosed?: (userId: string) => void
}) {
	// FR-014: guarda o último usuário exibido para devolver o foco à linha de
	// origem quando o Radix efetivamente desmontar o conteúdo
	// (onCloseAutoFocus), já que nesse momento `user` (prop) já pode ter
	// voltado a `null`.
	const lastUserIdRef = useRef<string | null>(null)
	useEffect(() => {
		if (user) lastUserIdRef.current = user.id
	}, [user])

	return (
		<Sheet
			open={user !== null}
			onOpenChange={(open) => {
				if (!open) onClose()
			}}
		>
			<SheetContent
				className="w-full overflow-y-auto pt-6 sm:max-w-md"
				onCloseAutoFocus={(event) => {
					// Assumimos o controle do foco pós-fechamento: o Radix não
					// conhece a linha que abriu o drawer (Sheet controlado, sem
					// `SheetTrigger`), então delegamos ao chamador via
					// `onDrawerClosed`.
					event.preventDefault()
					if (lastUserIdRef.current) onDrawerClosed?.(lastUserIdRef.current)
				}}
			>
				<SheetHeader className="sr-only">
					<SheetTitle>Detalhes do usuário</SheetTitle>
					<SheetDescription>
						Visualize os dados da conta e execute ações administrativas.
					</SheetDescription>
				</SheetHeader>
				{user ? (
					<UserDetailPanel
						user={user}
						onClose={onClose}
						onUserPatched={onUserPatched}
					/>
				) : null}
			</SheetContent>
		</Sheet>
	)
}

export function UserDetailContainer({
	user,
	onClose,
	onUserPatched,
	onDrawerClosed,
}: UserDetailContainerProps) {
	const isDesktop = useIsDesktop()
	if (isDesktop) {
		return (
			<DesktopView
				user={user}
				onClose={onClose}
				onUserPatched={onUserPatched}
			/>
		)
	}
	return (
		<MobileView
			user={user}
			onClose={onClose}
			onUserPatched={onUserPatched}
			onDrawerClosed={onDrawerClosed}
		/>
	)
}
