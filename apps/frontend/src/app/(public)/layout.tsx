import type { ReactNode } from "react"
import { PublicShell } from "@/components/layout/public-shell"
import { BootMarker } from "@/components/ui/boot-marker"
import { bootPrepaintScript } from "@/lib/boot-session"

export default function PublicLayout({ children }: { children: ReactNode }) {
	return (
		<>
			{/** biome-ignore lint/security/noDangerouslySetInnerHtml: script minimo, defensivo, sem entrada do usuario (D3) */}
			<script dangerouslySetInnerHTML={{ __html: bootPrepaintScript() }} />
			<BootMarker />
			<PublicShell>{children}</PublicShell>
		</>
	)
}
