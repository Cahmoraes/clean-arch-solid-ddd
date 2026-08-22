import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
	title: "Consulta de clima — VOLT",
}

export default function ClimaLayout({ children }: { children: ReactNode }) {
	return children
}
