"use client"

import { Command } from "cmdk"
import {
	Building2,
	CheckCircle,
	CreditCard,
	LayoutDashboard,
	User,
	Users,
} from "lucide-react"
import { useRouter } from "next/navigation"
import type { ElementType } from "react"
import { useAuthStore } from "@/lib/auth/auth-store"

interface NavItem {
	href: string
	label: string
	icon: ElementType
	adminOnly?: boolean
}

const NAV_ITEMS: ReadonlyArray<NavItem> = [
	{ href: "/inicio", label: "Dashboard", icon: LayoutDashboard },
	{ href: "/check-ins", label: "Check-ins", icon: CheckCircle },
	{ href: "/academias", label: "Academias", icon: Building2 },
	{ href: "/perfil", label: "Perfil", icon: User },
	{ href: "/assinatura", label: "Assinatura", icon: CreditCard },
	{
		href: "/admin/usuarios",
		label: "Usuários (admin)",
		icon: Users,
		adminOnly: true,
	},
	{
		href: "/admin/check-ins",
		label: "Check-ins (admin)",
		icon: CheckCircle,
		adminOnly: true,
	},
]

interface NavigationGroupProps {
	query: string
	onSelect: () => void
}

export function NavigationGroup({ query, onSelect }: NavigationGroupProps) {
	const role = useAuthStore((state) => state.user?.role)
	const router = useRouter()
	const isAdmin = role === "ADMIN"

	const q = query.trim().toLowerCase()
	const items = NAV_ITEMS.filter((item) => {
		if (item.adminOnly && !isAdmin) return false
		if (q.length === 0) return true
		return item.label.toLowerCase().includes(q)
	})

	if (items.length === 0) return null

	return (
		<Command.Group heading="Navegação">
			{items.map((item) => {
				const Icon = item.icon
				return (
					<Command.Item
						key={item.href}
						value={item.label}
						onSelect={() => {
							router.push(item.href)
							onSelect()
						}}
						className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground aria-selected:bg-surface-2"
					>
						<Icon className="h-4 w-4 shrink-0 text-subtle" aria-hidden="true" />
						{item.label}
					</Command.Item>
				)
			})}
		</Command.Group>
	)
}
