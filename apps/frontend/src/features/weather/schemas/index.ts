import { z } from "zod"

export const citySchema = z.object({
	city: z.string().trim().min(1, "Informe o nome de uma cidade."),
})

export type CityInput = z.infer<typeof citySchema>
