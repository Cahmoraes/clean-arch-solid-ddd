import type { ReactNode } from "react"
import { AdminGuard } from "@/components/layout/AdminGuard"

export default function AdminLayout({ children }: { children: ReactNode }) {
	return <AdminGuard redirectTo="/">{children}</AdminGuard>
}
