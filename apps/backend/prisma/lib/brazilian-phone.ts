import { faker } from "@faker-js/faker"

// DDDs válidos no Brasil (códigos de área em uso pela ANATEL).
const VALID_DDDS = [
	11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35,
	37, 38, 41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64,
	65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88,
	89, 91, 92, 93, 94, 95, 96, 97, 98, 99,
] as const

const SUBSCRIBER_DIGITS = 8

/**
 * Gera um telefone celular brasileiro válido, apenas dígitos (11 dígitos):
 * DDD (2) + 9 (nono dígito de celular) + número do assinante (8).
 * Exemplo: "11980768766".
 */
export function generateBrazilianMobilePhone(): string {
	const ddd = faker.helpers.arrayElement(VALID_DDDS)
	const subscriber = faker.string.numeric(SUBSCRIBER_DIGITS)
	return `${ddd}9${subscriber}`
}
