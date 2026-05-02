import type { paths } from "@repo/api-types"
import createClient from "openapi-fetch"

export const api = createClient<paths>({
	baseUrl: process.env.NEXT_PUBLIC_API_URL,
})
