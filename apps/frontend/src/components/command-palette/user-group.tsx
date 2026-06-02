"use client"

import { Command } from "cmdk"
import { User } from "lucide-react"
import { useRouter } from "next/navigation"
import type { AdminUser } from "@/features/admin/api/use-users"
import { useUsers } from "@/features/admin/api/use-users"

interface UserGroupProps {
	query: string
	isActive: boolean
	onSelect: () => void
}

interface UserItemProps {
	user: AdminUser
	onNavigate: (user: AdminUser) => void
}

function UserItem({ user, onNavigate }: UserItemProps) {
	return (
		<Command.Item
			value={user.name}
			onSelect={() => onNavigate(user)}
			className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground aria-selected:bg-surface-2"
		>
			<User className="h-4 w-4 shrink-0 text-subtle" aria-hidden="true" />
			<span className="flex-1 truncate">{user.name}</span>
			<span className="text-xs text-subtle">
				{user.role === "ADMIN" ? "admin" : "membro"}
			</span>
		</Command.Item>
	)
}

function useUserNavigation(onSelect: () => void) {
	const router = useRouter()
	return (user: AdminUser) => {
		const params = new URLSearchParams({ userId: user.id, query: user.name })
		router.push(`/admin/usuarios?${params.toString()}`)
		onSelect()
	}
}

export function UserGroup({ query, isActive, onSelect }: UserGroupProps) {
	const navigate = useUserNavigation(onSelect)

	const { data, isLoading } = useUsers({
		page: 1,
		limit: 5,
		query: isActive ? query : undefined,
		enabled: isActive,
	})

	const users = data?.users ?? []

	if (!isActive) return null

	if (isLoading) {
		return (
			<Command.Group heading="Usuários">
				<div
					data-testid="user-group-loading"
					role="status"
					className="space-y-1 px-3 py-2"
					aria-label="Carregando usuários"
				>
					{[1, 2].map((i) => (
						<div
							key={i}
							className="h-8 animate-pulse rounded-md bg-surface-3"
						/>
					))}
				</div>
			</Command.Group>
		)
	}

	if (users.length === 0) {
		return (
			<Command.Group heading="Usuários">
				<p className="px-3 py-2 text-sm text-subtle">
					Nenhum usuário encontrado.
				</p>
			</Command.Group>
		)
	}

	return (
		<Command.Group heading="Usuários">
			{users.map((user) => (
				<UserItem key={user.id} user={user} onNavigate={navigate} />
			))}
		</Command.Group>
	)
}
