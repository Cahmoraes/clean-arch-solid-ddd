import type { ReactNode } from "react"
import { PublicShell } from "@/components/layout/public-shell"
import { bootPrepaintScript } from "@/lib/boot-session"

export default function PublicLayout({ children }: { children: ReactNode }) {
	return (
		<>
			{/* O script so precisa existir no HTML do servidor. Renderizado no cliente (navegacao suave), o React avisa que scripts nao executam e o boot ja tocou na carga inicial. */}
			{typeof window === "undefined" && (
				// biome-ignore lint/security/noDangerouslySetInnerHtml: script minimo, defensivo, sem entrada do usuario (D3)
				<script dangerouslySetInnerHTML={{ __html: bootPrepaintScript() }} />
			)}
			<PublicShell>{children}</PublicShell>
		</>
	)
}
