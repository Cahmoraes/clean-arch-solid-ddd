"use client"

import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { UserDetailPermissions } from "./use-user-detail-actions"

export interface ActionFlags {
	isPending: boolean
	isActivating: boolean
	isSuspending: boolean
	isPromoting: boolean
	isDemoting: boolean
	isDeleting: boolean
}

export interface MoreActionsMenuProps {
	permissions: UserDetailPermissions
	flags: ActionFlags
	onActivate: () => void
	onOpenSuspend: () => void
	onOpenPromote: () => void
	onOpenDemote: () => void
	onOpenDelete: () => void
}

interface SectionProps {
	permissions: UserDetailPermissions
	flags: ActionFlags
	onOpenPromote: () => void
	onOpenDemote: () => void
}

function AdminSection({
	permissions,
	flags,
	onOpenPromote,
	onOpenDemote,
}: SectionProps) {
	return (
		<>
			{permissions.canPromoteToAdmin && (
				<DropdownMenuItem onClick={onOpenPromote} disabled={flags.isPromoting}>
					Tornar Admin
				</DropdownMenuItem>
			)}
			{permissions.canDemoteFromAdmin && (
				<DropdownMenuItem onClick={onOpenDemote} disabled={flags.isDemoting}>
					Remover Admin
				</DropdownMenuItem>
			)}
		</>
	)
}

interface StatusSectionProps {
	permissions: UserDetailPermissions
	flags: ActionFlags
	onActivate: () => void
	onOpenSuspend: () => void
}

function StatusSection({
	permissions,
	flags,
	onActivate,
	onOpenSuspend,
}: StatusSectionProps) {
	return (
		<>
			{permissions.canSuspend && (
				<DropdownMenuItem
					onClick={onOpenSuspend}
					disabled={flags.isSuspending}
					className="text-warning focus:text-warning"
				>
					Inativar
				</DropdownMenuItem>
			)}
			{permissions.canActivate && (
				<DropdownMenuItem
					onClick={onActivate}
					disabled={flags.isActivating}
					className="text-success focus:text-success"
				>
					{permissions.isLocked ? "Desbloquear" : "Ativar"}
				</DropdownMenuItem>
			)}
		</>
	)
}

interface DeleteSectionProps {
	permissions: UserDetailPermissions
	flags: ActionFlags
	onOpenDelete: () => void
}

function DeleteSection({
	permissions,
	flags,
	onOpenDelete,
}: DeleteSectionProps) {
	return (
		<>
			{permissions.canDelete && (
				<DropdownMenuItem
					onClick={onOpenDelete}
					disabled={flags.isDeleting}
					className="text-destructive focus:text-destructive"
				>
					Excluir
				</DropdownMenuItem>
			)}
		</>
	)
}

function groupPresence(p: UserDetailPermissions) {
	return {
		g1: p.canPromoteToAdmin || p.canDemoteFromAdmin,
		g2: p.canSuspend || p.canActivate,
		g3: p.canDelete,
	}
}

export function MoreActionsMenu({
	permissions,
	flags,
	onActivate,
	onOpenSuspend,
	onOpenPromote,
	onOpenDemote,
	onOpenDelete,
}: MoreActionsMenuProps) {
	const { g1, g2, g3 } = groupPresence(permissions)

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="outline"
					className="h-11 rounded-md px-4 font-semibold"
					disabled={flags.isPending}
				>
					Mais ações
					<ChevronDown className="ml-1 size-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start">
				<AdminSection
					permissions={permissions}
					flags={flags}
					onOpenPromote={onOpenPromote}
					onOpenDemote={onOpenDemote}
				/>
				{g1 && g2 && <DropdownMenuSeparator />}
				<StatusSection
					permissions={permissions}
					flags={flags}
					onActivate={onActivate}
					onOpenSuspend={onOpenSuspend}
				/>
				{g2 && g3 && <DropdownMenuSeparator />}
				<DeleteSection
					permissions={permissions}
					flags={flags}
					onOpenDelete={onOpenDelete}
				/>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
