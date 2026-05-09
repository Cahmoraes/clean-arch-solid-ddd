interface LoadSutOptions {
	googleClientId?: string
	payload?: {
		sub?: string
		email?: string
		name?: string
		email_verified?: boolean
	}
	error?: Error
}

describe("GoogleAuthProviderImpl", () => {
	afterEach(() => {
		vi.resetModules()
		vi.clearAllMocks()
		vi.doUnmock("google-auth-library")
		vi.doUnmock("@/shared/infra/env/index.js")
	})

	test("deve retornar InvalidGoogleTokenError quando GOOGLE_CLIENT_ID não estiver configurado", async () => {
		const { sut, verifyIdTokenSpy, InvalidGoogleTokenError } = await loadSut({
			googleClientId: undefined,
		})

		const result = await sut.verify("valid-token")

		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toBeInstanceOf(InvalidGoogleTokenError)
		expect(verifyIdTokenSpy).not.toHaveBeenCalled()
	})

	test("deve retornar os dados do usuário quando o token for válido", async () => {
		const { sut, verifyIdTokenSpy } = await loadSut({
			googleClientId: "google-client-id",
			payload: {
				sub: "google-user-1",
				email: "john@doe.com",
				name: "John Doe",
				email_verified: true,
			},
		})

		const result = await sut.verify("valid-token")

		expect(verifyIdTokenSpy).toHaveBeenCalledWith({
			idToken: "valid-token",
			audience: "google-client-id",
		})
		expect(result.isSuccess()).toBe(true)
		expect(result.forceSuccess().value).toEqual({
			sub: "google-user-1",
			email: "john@doe.com",
			name: "John Doe",
			emailVerified: true,
		})
	})

	test("deve retornar InvalidGoogleTokenError quando o payload estiver incompleto", async () => {
		const { sut, InvalidGoogleTokenError } = await loadSut({
			googleClientId: "google-client-id",
			payload: {
				sub: "google-user-1",
				email: "john@doe.com",
			},
		})

		const result = await sut.verify("valid-token")

		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toBeInstanceOf(InvalidGoogleTokenError)
	})

	test("deve retornar success com emailVerified=false quando e-mail não for verificado", async () => {
		const { sut } = await loadSut({
			googleClientId: "google-client-id",
			payload: {
				sub: "google-user-1",
				email: "john@doe.com",
				name: "John Doe",
				email_verified: false,
			},
		})

		const result = await sut.verify("valid-token")

		expect(result.isSuccess()).toBe(true)
		expect(result.forceSuccess().value).toMatchObject({ emailVerified: false })
	})

	test("deve retornar InvalidGoogleTokenError quando a verificação do token lançar erro", async () => {
		const { sut, InvalidGoogleTokenError } = await loadSut({
			googleClientId: "google-client-id",
			error: new Error("invalid token"),
		})

		const result = await sut.verify("invalid-token")

		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toBeInstanceOf(InvalidGoogleTokenError)
	})
})

async function loadSut({
	googleClientId,
	payload,
	error,
}: LoadSutOptions = {}) {
	const verifyIdTokenSpy = vi.fn(async (_options: unknown) => {
		if (error) {
			throw error
		}

		return {
			getPayload: () => payload,
		}
	})

	vi.doMock("google-auth-library", () => ({
		OAuth2Client: class {
			public async verifyIdToken(options: unknown) {
				return verifyIdTokenSpy(options)
			}
		},
	}))

	vi.doMock("@/shared/infra/env/index.js", () => ({
		env: {
			GOOGLE_CLIENT_ID: googleClientId,
		},
	}))

	const [{ GoogleAuthProviderImpl }, { InvalidGoogleTokenError }] =
		await Promise.all([
			import("./google-auth-provider-impl.js"),
			import("@/session/application/error/invalid-google-token-error.js"),
		])

	return {
		sut: new GoogleAuthProviderImpl(),
		verifyIdTokenSpy,
		InvalidGoogleTokenError,
	}
}
