export function statusLabel(status: string): string {
	if (status === "activated") return "Ativo"
	if (status === "suspended") return "Inativo"
	if (status === "locked") return "Bloqueado"
	return status
}

export function statusTone(
	status: string,
): "success" | "warning" | "danger" | "neutral" {
	if (status === "activated") return "success"
	if (status === "locked") return "warning"
	if (status === "suspended") return "danger"
	return "neutral"
}

export function formatCreatedAt(iso: string): string {
	try {
		return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(
			new Date(iso),
		)
	} catch {
		return iso
	}
}
