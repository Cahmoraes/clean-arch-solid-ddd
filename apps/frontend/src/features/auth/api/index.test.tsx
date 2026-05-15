import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, test, vi } from "vitest"
import { profileQueryKeys } from "@/features/profile/api"
import { useAuthStore } from "@/lib/auth/auth-store"
import { server } from "@/test/msw/server"
import { makeTestJwt } from "@/test/render"
import {
	useChangePassword,
	useCreatePasswordReauthGrant,
	useDefinePassword,
	useLogin,
	useLoginWithGoogle,
} from "./index"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

function createWrapper(): {
	queryClient: QueryClient
	wrapper: (props: { children: ReactNode }) => React.JSX.Element
} {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	})

	return {
		queryClient,
		wrapper: ({ children }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		),
	}
}

describe("useLogin", () => {
	test("popula o auth-store com token decodificado ao receber sucesso do MSW", async () => {
		const token = makeTestJwt({ sub: "user-42", role: "ADMIN" })
		server.use(
			http.post(`${apiBaseUrl}/sessions`, () =>
				HttpResponse.json(
					{ token, refreshToken: "refresh-stub" },
					{ status: 200 },
				),
			),
		)

		const { wrapper } = createWrapper()
		const { result } = renderHook(() => useLogin(), { wrapper })
		await result.current.mutateAsync({
			email: "user@example.com",
			password: "secret123",
		})

		await waitFor(() => {
			const state = useAuthStore.getState()
			expect(state.accessToken).toBe(token)
			expect(state.user).toEqual({ id: "user-42", role: "ADMIN" })
		})
	})

	test("propaga ApiError quando backend retorna 401", async () => {
		server.use(
			http.post(`${apiBaseUrl}/sessions`, () =>
				HttpResponse.json({ message: "invalid" }, { status: 401 }),
			),
		)
		const { wrapper } = createWrapper()
		const { result } = renderHook(() => useLogin(), { wrapper })

		await expect(
			result.current.mutateAsync({
				email: "user@example.com",
				password: "wrongpass",
			}),
		).rejects.toMatchObject({ status: 401 })
		expect(useAuthStore.getState().accessToken).toBeNull()
	})
})

describe("useLoginWithGoogle", () => {
	test("deve popular o auth-store com token ao autenticar via Google", async () => {
		const token = makeTestJwt({ sub: "google-user-1", role: "MEMBER" })
		server.use(
			http.post(`${apiBaseUrl}/sessions/google`, () =>
				HttpResponse.json(
					{ token, refreshToken: "google-refresh-stub" },
					{ status: 200 },
				),
			),
		)

		const { wrapper } = createWrapper()
		const { result } = renderHook(() => useLoginWithGoogle(), { wrapper })
		await result.current.mutateAsync("fake-id-token")

		await waitFor(() => {
			expect(useAuthStore.getState().accessToken).toBe(token)
		})
	})

	test("deve lançar ApiError 401 quando token Google for inválido", async () => {
		server.use(
			http.post(`${apiBaseUrl}/sessions/google`, () =>
				HttpResponse.json({ message: "invalid token" }, { status: 401 }),
			),
		)

		const { wrapper } = createWrapper()
		const { result } = renderHook(() => useLoginWithGoogle(), { wrapper })

		await expect(result.current.mutateAsync("bad-token")).rejects.toMatchObject(
			{
				status: 401,
			},
		)
		expect(useAuthStore.getState().accessToken).toBeNull()
	})

	test("deve lançar ApiError 422 quando email Google não estiver verificado", async () => {
		server.use(
			http.post(`${apiBaseUrl}/sessions/google`, () =>
				HttpResponse.json({ message: "email not verified" }, { status: 422 }),
			),
		)

		const { wrapper } = createWrapper()
		const { result } = renderHook(() => useLoginWithGoogle(), { wrapper })

		await expect(
			result.current.mutateAsync("unverified-token"),
		).rejects.toMatchObject({ status: 422 })
	})
})

describe("useCreatePasswordReauthGrant", () => {
	test("envia provider e idToken para solicitar grant de reautenticação", async () => {
		let received: unknown = null
		server.use(
			http.post(
				`${apiBaseUrl}/users/me/password/reauth`,
				async ({ request }) => {
					received = await request.json()
					return HttpResponse.json(
						{ reauthGrant: "grant-123", expiresInSeconds: 300 },
						{ status: 200 },
					)
				},
			),
		)

		const { wrapper } = createWrapper()
		const { result } = renderHook(() => useCreatePasswordReauthGrant(), {
			wrapper,
		})

		await expect(
			result.current.mutateAsync({
				provider: "google",
				idToken: "google-id-token",
			}),
		).resolves.toEqual({ reauthGrant: "grant-123", expiresInSeconds: 300 })
		expect(received).toEqual({
			provider: "google",
			idToken: "google-id-token",
		})
	})
})

describe("useDefinePassword", () => {
	test("envia newRawPassword e invalida o perfil após definir senha", async () => {
		let received: unknown = null
		const { queryClient, wrapper } = createWrapper()
		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

		server.use(
			http.post(`${apiBaseUrl}/users/me/password`, async ({ request }) => {
				received = await request.json()
				return new HttpResponse(null, { status: 204 })
			}),
		)

		const { result } = renderHook(() => useDefinePassword(), { wrapper })

		await result.current.mutateAsync({
			provider: "google",
			reauthGrant: "grant-123",
			newPassword: "SenhaNova123!",
		})

		expect(received).toEqual({
			provider: "google",
			reauthGrant: "grant-123",
			newRawPassword: "SenhaNova123!",
		})
		await waitFor(() => {
			expect(invalidateSpy).toHaveBeenCalledWith({
				queryKey: profileQueryKeys.me(),
			})
		})
	})
})

describe("useChangePassword", () => {
	test("deve enviar currentRawPassword ao alterar senha", async () => {
		let received: unknown = null
		useAuthStore
			.getState()
			.setSession(makeTestJwt({ sub: "user-password-1", role: "MEMBER" }))
		server.use(
			http.patch(
				`${apiBaseUrl}/users/me/change-password`,
				async ({ request }) => {
					received = await request.json()
					return new HttpResponse(null, { status: 204 })
				},
			),
		)

		const { wrapper } = createWrapper()
		const { result } = renderHook(() => useChangePassword(), { wrapper })

		await result.current.mutateAsync({
			currentPassword: "SenhaAtual123!",
			newPassword: "SenhaNova123!",
			confirmPassword: "SenhaNova123!",
		})

		expect(received).toEqual({
			currentRawPassword: "SenhaAtual123!",
			newRawPassword: "SenhaNova123!",
		})
	})

	test("invalida o perfil após alterar a senha", async () => {
		const { queryClient, wrapper } = createWrapper()
		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")
		server.use(
			http.patch(
				`${apiBaseUrl}/users/me/change-password`,
				() => new HttpResponse(null, { status: 204 }),
			),
		)

		const { result } = renderHook(() => useChangePassword(), { wrapper })

		await result.current.mutateAsync({
			currentPassword: "SenhaAtual123!",
			newPassword: "SenhaNova123!",
			confirmPassword: "SenhaNova123!",
		})

		await waitFor(() => {
			expect(invalidateSpy).toHaveBeenCalledWith({
				queryKey: profileQueryKeys.me(),
			})
		})
	})
})
