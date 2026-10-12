interface LoadSutOptions {
	googleClientId?: string | null
	googleClientSecret?: string | null
	payload?: {
		sub?: string
		email?: string
		name?: string
		email_verified?: boolean
	}
	tokens?: { id_token?: string }
	getTokenError?: Error
}

describe("GoogleAuthProviderImpl", () => {
	afterEach(() => {
		vi.resetModules()
		vi.clearAllMocks()
		vi.doUnmock("google-auth-library")
		vi.doUnmock("@/shared/infra/env/index.js")
	})

	test("AC-03 deve trocar o authorization code por tokens e verificar o id_token com aud = GOOGLE_CLIENT_ID", async () => {
		const { sut, getTokenSpy, verifyIdTokenSpy } = await loadSut({
			payload: {
				sub: "google-user-1",
				email: "john@doe.com",
				name: "John Doe",
				email_verified: true,
			},
		})

		const result = await sut.verify("auth-code-123")

		expect(getTokenSpy).toHaveBeenCalledWith({
			code: "auth-code-123",
			client_id: "google-client-id",
		})
		expect(verifyIdTokenSpy).toHaveBeenCalledWith({
			idToken: "google-id-token",
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

	test("deve retornar InvalidGoogleTokenError quando a troca não devolver id_token", async () => {
		const { sut, verifyIdTokenSpy, InvalidGoogleTokenError } = await loadSut({
			tokens: {},
			payload: {
				sub: "google-user-1",
				email: "john@doe.com",
				name: "John Doe",
			},
		})

		const result = await sut.verify("auth-code-123")

		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toBeInstanceOf(InvalidGoogleTokenError)
		expect(verifyIdTokenSpy).not.toHaveBeenCalled()
	})

	test("deve retornar InvalidGoogleTokenError quando o payload estiver incompleto", async () => {
		const { sut, InvalidGoogleTokenError } = await loadSut({
			payload: { sub: "google-user-1", email: "john@doe.com" },
		})

		const result = await sut.verify("auth-code-123")

		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toBeInstanceOf(InvalidGoogleTokenError)
	})

	test("AC-07 deve retornar InvalidGoogleTokenError sem chamar o Google quando GOOGLE_CLIENT_SECRET não estiver configurado", async () => {
		const { sut, getTokenSpy, verifyIdTokenSpy, InvalidGoogleTokenError } =
			await loadSut({ googleClientSecret: null })

		const result = await sut.verify("auth-code-123")

		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toBeInstanceOf(InvalidGoogleTokenError)
		expect(getTokenSpy).not.toHaveBeenCalled()
		expect(verifyIdTokenSpy).not.toHaveBeenCalled()
	})

	test("AC-07 deve retornar InvalidGoogleTokenError sem chamar o Google quando GOOGLE_CLIENT_ID não estiver configurado", async () => {
		const { sut, getTokenSpy, verifyIdTokenSpy, InvalidGoogleTokenError } =
			await loadSut({ googleClientId: null })

		const result = await sut.verify("auth-code-123")

		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toBeInstanceOf(InvalidGoogleTokenError)
		expect(getTokenSpy).not.toHaveBeenCalled()
		expect(verifyIdTokenSpy).not.toHaveBeenCalled()
	})

	test("AC-06 deve retornar InvalidGoogleTokenError quando o authorization code já foi consumido", async () => {
		const { sut, verifyIdTokenSpy, InvalidGoogleTokenError } = await loadSut({
			getTokenError: Object.assign(new Error("invalid_grant"), {
				code: "invalid_grant",
			}),
		})

		const result = await sut.verify("already-used-code")

		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toBeInstanceOf(InvalidGoogleTokenError)
		expect(result.forceFailure().value.name).toBe("InvalidGoogleTokenError")
		expect(verifyIdTokenSpy).not.toHaveBeenCalled()
	})

	test("deve retornar success com emailVerified=false quando e-mail não for verificado", async () => {
		const { sut } = await loadSut({
			payload: {
				sub: "google-user-1",
				email: "john@doe.com",
				name: "John Doe",
				email_verified: false,
			},
		})

		const result = await sut.verify("auth-code-123")

		expect(result.isSuccess()).toBe(true)
		expect(result.forceSuccess().value).toMatchObject({ emailVerified: false })
	})
})

async function loadSut({
	googleClientId = "google-client-id",
	googleClientSecret = "google-client-secret",
	payload,
	tokens = { id_token: "google-id-token" },
	getTokenError,
}: LoadSutOptions = {}) {
	// O grafo de módulos já foi avaliado por test/setup-test.ts (via container do IoC),
	// então env e google-auth-library chegam aqui sem mock no primeiro teste do arquivo.
	vi.resetModules()

	const getTokenSpy = vi.fn(async (_options: unknown) => {
		if (getTokenError) {
			throw getTokenError
		}

		return { tokens, res: null }
	})

	const verifyIdTokenSpy = vi.fn(async (_options: unknown) => ({
		getPayload: () => payload,
	}))

	vi.doMock("google-auth-library", () => ({
		OAuth2Client: class {
			public async getToken(options: unknown) {
				return getTokenSpy(options)
			}

			public async verifyIdToken(options: unknown) {
				return verifyIdTokenSpy(options)
			}
		},
	}))

	vi.doMock("@/shared/infra/env/index.js", () => ({
		env: {
			GOOGLE_CLIENT_ID: googleClientId,
			GOOGLE_CLIENT_SECRET: googleClientSecret,
		},
	}))

	const [{ GoogleAuthProviderImpl }, { InvalidGoogleTokenError }] =
		await Promise.all([
			import("./google-auth-provider-impl.js"),
			import("@/session/application/error/invalid-google-token-error.js"),
		])

	return {
		sut: new GoogleAuthProviderImpl(),
		getTokenSpy,
		verifyIdTokenSpy,
		InvalidGoogleTokenError,
	}
}
