import { cookies } from "next/headers"
import type { ReactNode } from "react"
import { AuthenticatedShell } from "@/components/layout/authenticated-shell"
import {
	parseSidebarCollapseCookie,
	SIDEBAR_COLLAPSE_COOKIE,
} from "@/lib/ui-state/sidebar-collapse-cookie"

export default async function AuthenticatedLayout({
	children,
}: {
	children: ReactNode
}) {
	const cookieStore = await cookies()
	const defaultCollapsed = parseSidebarCollapseCookie(
		cookieStore.get(SIDEBAR_COLLAPSE_COOKIE)?.value,
	)
	return (
		<AuthenticatedShell defaultCollapsed={defaultCollapsed}>
			{children}
		</AuthenticatedShell>
	)
}
