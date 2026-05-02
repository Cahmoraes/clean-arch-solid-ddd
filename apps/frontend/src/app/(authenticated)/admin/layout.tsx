import type { ReactNode } from "react"
import { AdminGuard } from "@/components/layout/admin-guard"

export default function AdminLayout({ children }: { children: ReactNode }) {
	return <AdminGuard redirectTo="/">{children}</AdminGuard>
}
