import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
	type RenderOptions,
	type RenderResult,
	render,
} from "@testing-library/react"
import { type ReactElement, type ReactNode, Suspense } from "react"

interface ProviderProps {
	children: ReactNode
}

interface RenderWithProvidersOptions extends Omit<RenderOptions, "wrapper"> {
	queryClient?: QueryClient
}

interface RenderWithProvidersResult extends RenderResult {
	queryClient: QueryClient
}

function createTestQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: { retry: false, staleTime: 0, gcTime: 0 },
			mutations: { retry: false },
		},
	})
}

export function renderWithProviders(
	ui: ReactElement,
	options: RenderWithProvidersOptions = {},
): RenderWithProvidersResult {
	const { queryClient = createTestQueryClient(), ...renderOptions } = options
	function Wrapper({ children }: ProviderProps): ReactElement {
		return (
			<QueryClientProvider client={queryClient}>
				<Suspense fallback={null}>{children}</Suspense>
			</QueryClientProvider>
		)
	}
	const result = render(ui, { wrapper: Wrapper, ...renderOptions })
	return { ...result, queryClient }
}

interface TestJwtOptions {
	sub?: string
	role?: "MEMBER" | "ADMIN"
	expSeconds?: number
}

function base64UrlEncode(input: string): string {
	const base64 =
		typeof btoa === "function"
			? btoa(input)
			: Buffer.from(input, "binary").toString("base64")
	return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "")
}

/**
 * Builds a syntactically-valid (unsigned) JWT for tests. The signature
 * segment is bogus; backend mocks (MSW) accept it because nothing verifies
 * cryptography on the client. The payload satisfies `decodeJwt` so
 * `auth-store.setSession` can populate user/expiresAt.
 */
export function makeTestJwt(options: TestJwtOptions = {}): string {
	const {
		sub = "user-test-id",
		role = "MEMBER",
		expSeconds = Math.floor(Date.now() / 1000) + 60 * 60,
	} = options
	const header = base64UrlEncode(JSON.stringify({ alg: "none", typ: "JWT" }))
	const payload = base64UrlEncode(
		JSON.stringify({ sub, role, exp: expSeconds }),
	)
	return `${header}.${payload}.signature`
}
