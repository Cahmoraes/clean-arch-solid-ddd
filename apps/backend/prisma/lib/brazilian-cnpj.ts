const FIRST_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
const SECOND_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
const CNPJ_LENGTH = 14
const BASE_LENGTH = 12

function calculateDigit(digits: string, weights: number[]): number {
	const sum = digits
		.split("")
		.reduce(
			(acc, digit, index) => acc + Number.parseInt(digit, 10) * weights[index],
			0,
		)
	const remainder = sum % 11
	return remainder < 2 ? 0 : 11 - remainder
}

/**
 * Gera um CNPJ válido (14 dígitos) a partir de uma base de 12 dígitos,
 * calculando os dois dígitos verificadores conforme o algoritmo da Receita
 * (mesmo usado pelo value object CNPJ do domínio).
 */
export function generateValidCnpjFromBase(base12: string): string {
	const dv1 = calculateDigit(base12, FIRST_WEIGHTS)
	const base13 = `${base12}${dv1}`
	const dv2 = calculateDigit(base13, SECOND_WEIGHTS)
	return `${base13}${dv2}`
}

/**
 * Gera um CNPJ válido determinístico e único a partir de um índice numérico.
 * Índices distintos produzem CNPJs distintos (base = índice com zero-padding).
 */
export function generateValidCnpjFromIndex(index: number): string {
	const base12 = String(index).padStart(BASE_LENGTH, "0")
	return generateValidCnpjFromBase(base12)
}

/**
 * Valida os dígitos verificadores de um CNPJ (espelha CNPJ.isValid do domínio).
 */
export function isValidCnpj(cnpj: string | null): boolean {
	if (!cnpj) return false
	const clean = cnpj.replace(/\D/g, "")
	if (clean.length !== CNPJ_LENGTH) return false
	if (/^(\d)\1{13}$/.test(clean)) return false
	const dv1 = calculateDigit(clean.slice(0, 12), FIRST_WEIGHTS)
	if (Number.parseInt(clean[12], 10) !== dv1) return false
	const dv2 = calculateDigit(clean.slice(0, 13), SECOND_WEIGHTS)
	return Number.parseInt(clean[13], 10) === dv2
}
