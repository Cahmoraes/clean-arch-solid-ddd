import { API_BASE_URL } from "@/lib/api"

/**
 * Monta a URL pública da imagem da academia a partir da chave relativa.
 * Retorna null quando não há imagem.
 */
export function gymImageUrl(
	imageKey: string | null | undefined,
): string | null {
	const key = imageKey?.trim()
	if (!key) return null
	return `${API_BASE_URL}/uploads/${key}`
}
