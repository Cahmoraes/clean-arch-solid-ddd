/**
 * URL base da API para uso em contexto de servidor (RSC).
 *
 * Prioriza `API_URL` (variável só de servidor, tipicamente o endereço
 * interno da rede — ex.: http://backend:3333) sobre `NEXT_PUBLIC_API_URL`
 * (injetada em build-time para o cliente). Diferente de `API_BASE_URL`
 * de `@/lib/api`, que é a URL pública usada no browser.
 */
export const SERVER_API_URL =
	process.env.API_URL ??
	process.env.NEXT_PUBLIC_API_URL ??
	"http://localhost:3333"
