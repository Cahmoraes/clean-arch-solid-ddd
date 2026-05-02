import type { ReactNode } from "react"
import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell"

export default function AuthenticatedLayout({
	children,
}: {
	children: ReactNode
}) {
	return <AuthenticatedShell>{children}</AuthenticatedShell>
}
