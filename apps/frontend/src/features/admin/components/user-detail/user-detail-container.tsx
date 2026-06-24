"use client"

import { UserRound } from "lucide-react"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { EmptyState } from "@/components/ui/empty-state"
import type { AdminUser } from "@/features/admin/api/use-users"
import { useIsDesktop } from "@/lib/hooks/use-is-desktop"
import { UserDetailPanel } from "./user-detail-panel"

export interface UserDetailContainerProps {
	user: AdminUser | null
	onClose: () => void
	onUserPatched?: (patch: Partial<AdminUser>) => void
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
	if (!user) {
		return (
			<EmptyState
				icon={UserRound}
				title="Selecione um usuário"
				description="Escolha um usuário na lista para ver os detalhes."
				className="md:self-start md:sticky md:top-4"
			/>
		)
	}
	return (
		<div className="rounded-lg border border-border bg-card p-5 md:self-start md:sticky md:top-4 md:max-h-[calc(100vh-2rem)] md:overflow-y-auto">
			<UserDetailPanel
				user={user}
				onClose={onClose}
				onUserPatched={onUserPatched}
			/>
		</div>
	)
}

function MobileView({
	user,
	onClose,
	onUserPatched,
}: {
	user: AdminUser | null
	onClose: () => void
	onUserPatched?: (patch: Partial<AdminUser>) => void
}) {
	return (
		<Dialog
			open={user !== null}
			onOpenChange={(open) => {
				if (!open) onClose()
			}}
		>
			<DialogContent className="max-w-2xl">
				<DialogHeader className="sr-only">
					<DialogTitle>Detalhes do usuário</DialogTitle>
					<DialogDescription>
						Visualize os dados da conta e execute ações administrativas.
					</DialogDescription>
				</DialogHeader>
				{user ? (
					<UserDetailPanel
						user={user}
						onClose={onClose}
						onUserPatched={onUserPatched}
					/>
				) : null}
			</DialogContent>
		</Dialog>
	)
}

export function UserDetailContainer({
	user,
	onClose,
	onUserPatched,
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
		<MobileView user={user} onClose={onClose} onUserPatched={onUserPatched} />
	)
}
