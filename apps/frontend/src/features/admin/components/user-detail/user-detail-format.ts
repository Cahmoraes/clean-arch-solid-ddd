export function statusLabel(status: string): string {
	if (status === "activated") return "Ativo"
	if (status === "suspended") return "Inativo"
	if (status === "locked") return "Bloqueado"
	return status
}

export function statusBadgeClassName(status: string): string {
	if (status === "activated") {
		return "border-transparent bg-success-soft text-success"
	}
	if (status === "suspended") {
		return "border-transparent bg-destructive-soft text-destructive"
	}
	if (status === "locked") {
		return "border-transparent bg-warning-soft text-warning"
	}
	return "border-border bg-muted text-muted-foreground"
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
