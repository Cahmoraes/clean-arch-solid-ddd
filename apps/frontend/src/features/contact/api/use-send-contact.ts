import { type UseMutationResult, useMutation } from "@tanstack/react-query"
import { API_BASE_URL } from "@/lib/api"
import { ApiError } from "@/lib/errors"
import type { ContactFormInput } from "../schemas"

export const CONTACT_MUTATION_KEY = ["contact", "send"] as const

export function useSendContact(): UseMutationResult<
	void,
	ApiError,
	ContactFormInput
> {
	return useMutation<void, ApiError, ContactFormInput>({
		mutationKey: CONTACT_MUTATION_KEY,
		retry: 0,
		mutationFn: async (input) => {
			const response = await fetch(`${API_BASE_URL}/contact`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(input),
			})
			if (!response.ok) {
				throw new ApiError(
					response.status,
					"contact_failed",
					"Não foi possível enviar a mensagem. Tente novamente.",
				)
			}
		},
	})
}
