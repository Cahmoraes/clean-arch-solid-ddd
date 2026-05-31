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
	onEdit: (user: AdminUser) => void
}

function DesktopView({
	user,
	onEdit,
}: {
	user: AdminUser | null
	onEdit: (user: AdminUser) => void
}) {
	if (!user) {
		return (
			<EmptyState
				icon={UserRound}
				title="Selecione um usuário"
				description="Escolha um usuário na lista para ver os detalhes."
			/>
		)
	}
	return (
		<div className="rounded-lg border border-border bg-card p-5">
			<UserDetailPanel user={user} onEdit={() => onEdit(user)} />
		</div>
	)
}

function MobileView({
	user,
	onClose,
	onEdit,
}: {
	user: AdminUser | null
	onClose: () => void
	onEdit: (user: AdminUser) => void
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
					<UserDetailPanel user={user} onEdit={() => onEdit(user)} />
				) : null}
			</DialogContent>
		</Dialog>
	)
}

export function UserDetailContainer({
	user,
	onClose,
	onEdit,
}: UserDetailContainerProps) {
	const isDesktop = useIsDesktop()
	if (isDesktop) {
		return <DesktopView user={user} onEdit={onEdit} />
	}
	return <MobileView user={user} onClose={onClose} onEdit={onEdit} />
}
