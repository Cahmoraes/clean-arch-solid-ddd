export interface MesBounds {
	de: string
	ate: string
}

function pad2(value: number): string {
	return String(value).padStart(2, "0")
}

/**
 * Primeiro e último dia do mês em `YYYY-MM-DD`. `month` é 1-based; o último
 * dia sai do dia zero do mês seguinte sem construir a virada dez→jan.
 */
export function mesBounds(year: number, month: number): MesBounds {
	const ultimoDia = new Date(year, month, 0).getDate()
	return {
		de: `${year}-${pad2(month)}-01`,
		ate: `${year}-${pad2(month)}-${pad2(ultimoDia)}`,
	}
}
