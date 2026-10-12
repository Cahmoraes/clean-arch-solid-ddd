# Task 5: Mutações e telas passam a enviar o authorization code [FR-002, FR-003, FR-006]

**Status:** PENDING

**PRD:** `../prd/prd-google-custom-signin-button.md`

**Spec:** `../specs/google-custom-signin-button-design.md`

**Tier:** standard

## Visão Geral

As duas mutações de auth trocam o corpo `{ idToken }` por `{ code }` e as três telas — login, cadastro e perfil › senha — deixam de tratar o argumento de `onSuccess` como token. É a edição mecânica que fecha o fluxo: o botão entrega o code, a mutação o manda, o backend o troca. Nenhum mapeamento de status, `setSession` ou toast muda.

## Arquivos

- Modify: `apps/frontend/src/features/auth/api/index.ts`
- Modify: `apps/frontend/src/app/(public)/login/page.tsx`
- Modify: `apps/frontend/src/app/(public)/cadastro/page.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/perfil/senha/page.tsx`
- Test: `apps/frontend/src/features/auth/api/index.test.tsx`
- Test: `apps/frontend/src/app/(public)/login/page.test.tsx`
- Test: `apps/frontend/src/app/(public)/cadastro/page.test.tsx`
- Test: `apps/frontend/src/app/(authenticated)/perfil/senha/page.test.tsx`
- Test: `apps/frontend/src/app/(public)/login/login-volt.test.tsx`

## Interfaces

- **Consome:** `GoogleSignInButton` com props `{ onSuccess: (code: string) => void; onError?: (error: Error) => void; disabled?: boolean; isPending?: boolean }` — `apps/frontend/src/features/auth/components/google-sign-in-button.tsx` (task-04)
- **Produz:** N/A

### Skills a invocar

- `tanstack-query-best-practices`: `useLoginWithGoogle` e `useCreatePasswordReauthGrant` são `useMutation` — a assinatura da variável de mutação é o que muda (`string` → `code: string`), e `toApiError`, `setSession` e os `invalidateQueries` ficam intactos.
- `shadcn`: as três telas continuam compostas por `Button`, `FormField` e `GoogleSignInButton`; a edição é só no nome do parâmetro recebido, sem reestilizar nada.
- `tailwindcss`: nenhuma classe muda nesta task — o layout das três telas permanece o que o design system já produz.
- `test-antipatterns`: os handlers MSW de `/sessions/google` e `/users/me/password/reauth` passam a validar `{ code }`; a asserção é sobre o corpo enviado pela mutação, não sobre o comportamento do handler.
- `typescript-advanced`: os tipos gerados do OpenAPI (`@repo/api-types`) mudam junto com o backend; o corpo enviado precisa casar com o schema Zod novo, sem `as` nem `@ts-expect-error`.

## Passos

- **Step 1: Write the failing test**

  Em `apps/frontend/src/features/auth/api/index.test.tsx`, troque o mock de `@react-oauth/google` — que este arquivo não tem — e ajuste os testes das duas mutações. Substitua o corpo do `describe("useLoginWithGoogle")` inteiro:

```tsx
describe("useLoginWithGoogle", () => {
	test("AC-10 envia o authorization code e popula o auth-store ao autenticar via Google", async () => {
		const token = makeTestJwt({ sub: "google-user-1", role: "MEMBER" })
		let received: unknown = null
		server.use(
			http.post(
				`${apiBaseUrl}/sessions/google`,
				async ({ request }) => {
					received = await request.json()
					return HttpResponse.json(
						{ token, refreshToken: "google-refresh-stub" },
						{ status: 200 },
					)
				},
			),
		)

		const { wrapper } = createWrapper()
		const { result } = renderHook(() => useLoginWithGoogle(), { wrapper })
		await result.current.mutateAsync("auth-code-123")

		expect(received).toEqual({ code: "auth-code-123" })
		await waitFor(() => {
			expect(useAuthStore.getState().accessToken).toBe(token)
		})
	})

	test("deve lançar ApiError 401 quando o authorization code for inválido", async () => {
		server.use(
			http.post(`${apiBaseUrl}/sessions/google`, () =>
				HttpResponse.json({ message: "invalid" }, { status: 401 }),
			),
		)

		const { wrapper } = createWrapper()
		const { result } = renderHook(() => useLoginWithGoogle(), { wrapper })

		await expect(
			result.current.mutateAsync("bad-code"),
		).rejects.toMatchObject({ status: 401 })
		expect(useAuthStore.getState().accessToken).toBeNull()
	})

	test("AC-08 deve lançar ApiError 422 quando email Google não estiver verificado", async () => {
		server.use(
			http.post(`${apiBaseUrl}/sessions/google`, () =>
				HttpResponse.json({ message: "email not verified" }, { status: 422 }),
			),
		)

		const { wrapper } = createWrapper()
		const { result } = renderHook(() => useLoginWithGoogle(), { wrapper })

		await expect(
			result.current.mutateAsync("unverified-code"),
		).rejects.toMatchObject({ status: 422 })
	})
})
```

  E no `describe("useCreatePasswordReauthGrant")`, troque o input de `idToken` por `code` e a asserção do corpo recebido:

```tsx
	test("envia provider e code para solicitar grant de reautenticação", async () => {
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
				code: "auth-code-123",
			}),
		).resolves.toEqual({ reauthGrant: "grant-123", expiresInSeconds: 300 })
		expect(received).toEqual({
			provider: "google",
			code: "auth-code-123",
		})
	})
```

- **Step 2: Run test to verify it fails**

  Run: `pnpm --filter frontend test src/features/auth/api/index.test.tsx -t "envia o authorization code"`
  Expected: FAIL — a asserção `expect(received).toEqual({ code: "auth-code-123" })` recebe `received { idToken: "auth-code-123" }`, porque `useLoginWithGoogle` ainda monta `{ body: { idToken } }`.

- **Step 3: Write minimal implementation**

  Em `apps/frontend/src/features/auth/api/index.ts`, renomeie a variável de mutação e o corpo das duas chamadas. `LoginWithGoogleResult`, `toApiError`, `setSession` e os demais hooks ficam intactos:

```ts
export function useLoginWithGoogle(): UseMutationResult<
	LoginWithGoogleResult,
	ApiError,
	string
> {
	return useMutation<LoginWithGoogleResult, ApiError, string>({
		mutationFn: async (code) => {
			const { data, error } = await api.POST("/sessions/google", {
				body: { code },
			})
			if (error || !data) throw toApiError(error)
			useAuthStore.getState().setSession(data.token)
			return { token: data.token, refreshToken: data.refreshToken }
		},
	})
}
```

```ts
export function useCreatePasswordReauthGrant(): UseMutationResult<
	{ reauthGrant: string; expiresInSeconds: number },
	ApiError,
	{ provider: "google"; code: string }
> {
	return useMutation({
		mutationFn: async ({ provider, code }) => {
			const { data, error } = await api.POST("/users/me/password/reauth", {
				body: { provider, code },
			})
			if (error || !data) throw toApiError(error)
			return data
		},
	})
}
```

- **Step 4: Run test to verify it passes**

  Run: `pnpm --filter frontend test src/features/auth/api/index.test.tsx`
  Expected: PASS — 9 testes passaram, 0 falharam. Se `api.POST` reclamar do tipo do body, o tipo gerado do OpenAPI ainda é o antigo: rode `pnpm generate:types` na raiz do monorepo e repita o comando — não contorne com `as`.

- **Step 5: Write the failing test**

  Em `apps/frontend/src/app/(public)/login/page.test.tsx`, troque o mock de `GoogleLogin` pelo mock de `useGoogleLogin` que dispara o `onSuccess` com um code:

```tsx
vi.mock("@react-oauth/google", () => ({
	useGoogleLogin: (options: Record<string, unknown>) => () => {
		;(options.onSuccess as (response: { code?: string; scope?: string }) => void)(
			{ code: "auth-code-123", scope: "openid email" },
		)
	},
}))
```

  E endureça o handler MSW de `/sessions/google` do teste que hoje se chama `test("redireciona para /inicio após login Google bem-sucedido")` — renomeie para `test("AC-01 redireciona para /inicio após login Google bem-sucedido")`; o clique passa a ser em `google-sign-in-button` e o handler passa a provar o corpo enviado:

```tsx
		const token = makeTestJwt({ sub: "google-user", role: "MEMBER" })
		let received: unknown = null
		server.use(
			http.post(
				`${apiBaseUrl}/sessions/google`,
				async ({ request }) => {
					received = await request.json()
					return HttpResponse.json(
						{ token, refreshToken: "google-refresh" },
						{ status: 200 },
					)
				},
			),
		)
		const user = userEvent.setup()
		renderWithProviders(<LoginPage />)

		await user.click(screen.getByTestId("google-sign-in-button"))

		await waitFor(() => {
			expect(replace).toHaveBeenCalledWith("/inicio")
		})
		expect(received).toEqual({ code: "auth-code-123" })
		expect(useAuthStore.getState().accessToken).toBe(token)
```

  Renomeie o teste que hoje só verifica a presença do botão, `test("exibe botão Entrar com Google", …)`, para `test("AC-02 exibe o botão Continuar com Google do design system")` e dê a ele o corpo abaixo:

```tsx
	test("AC-02 exibe o botão Continuar com Google do design system", () => {
		renderWithProviders(<LoginPage />)

		const button = screen.getByTestId("google-sign-in-button")

		expect(button).toHaveTextContent("Continuar com Google")
		expect(button).toHaveClass("bg-card", "font-display")
	})
```

  Acrescente ainda o teste de conflito, que fixa a mensagem que o usuário lê quando o e-mail pertence a conta sem Google vinculado:

```tsx
	test("AC-09 exibe a mensagem de vínculo pendente quando a conta Google exige link externo", async () => {
		server.use(
			http.post(`${apiBaseUrl}/sessions/google`, () =>
				HttpResponse.json(
					{
						code: "external_account_link_required",
						message: "Link this external account first",
					},
					{ status: 409 },
				),
			),
		)
		const user = userEvent.setup()
		renderWithProviders(<LoginPage />)

		await user.click(screen.getByTestId("google-sign-in-button"))

		expect(await screen.findByText(/vincular sua conta/i)).toBeInTheDocument()
		expect(replace).not.toHaveBeenCalled()
	})
```

- **Step 6: Run test to verify it fails**

  Run: `pnpm --filter frontend test "src/app/(public)/login/page.test.tsx"`
  Expected: FAIL — o import de `GoogleLogin` na página ainda é resolvido pelo mock que não o expõe mais, e a asserção `expect(received).toEqual({ code: "auth-code-123" })` recebe `received { idToken: undefined }` porque a página ainda passa o `idToken` recebido do `GoogleLogin` para a mutação.

- **Step 7: Write minimal implementation**

  Em `apps/frontend/src/app/(public)/login/page.tsx`, renomeie o parâmetro de `onSuccess` e o argumento enviado. O redirecionamento, o `toast.error(googleLoginErrorMessage(...))` e `disabled`/`isPending` ficam como estão:

```tsx
						<GoogleSignInButton
							onSuccess={async (code) => {
								try {
									await mutateAsyncGoogle(code)
									const redirect =
										searchParams?.get("redirect") ?? DEFAULT_REDIRECT
									router.replace(redirect)
								} catch (submitError) {
									toast.error(googleLoginErrorMessage(submitError))
								}
							}}
							onError={(submitError) =>
								toast.error(googleLoginErrorMessage(submitError))
							}
							disabled={isPending}
							isPending={isGooglePending}
						/>
```

  E acrescente a entrada de `409` ao mapa de mensagens que já existe no arquivo, para que o conflito chegue ao usuário em PT-BR como as demais falhas do Google:

```ts
const googleLoginStatusMessages: Record<number, string> = {
	401: "Token Google inválido ou expirado.",
	422: "O e-mail da conta Google não está verificado.",
	409: "Vincular sua conta a este provedor exige uma sessão ativa primeiro.",
}
```

- **Step 8: Run test to verify it passes**

  Run: `pnpm --filter frontend test "src/app/(public)/login/page.test.tsx"`
  Expected: PASS — 10 testes passaram, 0 falharam.

- **Step 9: Write the failing test**

  Em `apps/frontend/src/app/(public)/cadastro/page.test.tsx`, aplique o mesmo mock de `useGoogleLogin` do passo 5 e endureça o handler MSW de `/sessions/google` do teste "redireciona para /academias após cadastro Google bem-sucedido", trocando o `http.post` por um `async ({ request })` que guarde `received = await request.json()` e acrescente `expect(received).toEqual({ code: "auth-code-123" })` depois do `waitFor`.

- **Step 10: Run test to verify it fails**

  Run: `pnpm --filter frontend test "src/app/(public)/cadastro/page.test.tsx"`
  Expected: FAIL — a asserção `expect(received).toEqual({ code: "auth-code-123" })` recebe `received { idToken: undefined }`, porque `onGoogleSuccess(idToken: string)` ainda repassa o argumento do botão como token.

- **Step 11: Write minimal implementation**

  Em `apps/frontend/src/app/(public)/cadastro/page.tsx`, renomeie o parâmetro e o argumento. `mutateAsyncGoogle(...).then(...)` e `.catch(...)` ficam como estão:

```tsx
	function onGoogleSuccess(code: string) {
		mutateAsyncGoogle(code)
			.then(() => router.replace("/academias"))
			.catch((err: unknown) => toast.error(googleSignupErrorMessage(err)))
	}
```

- **Step 12: Run test to verify it passes**

  Run: `pnpm --filter frontend test "src/app/(public)/cadastro/page.test.tsx"`
  Expected: PASS — 3 testes passaram, 0 falharam.

- **Step 13: Write the failing test**

  Em `apps/frontend/src/app/(authenticated)/perfil/senha/page.test.tsx`, aplique o mock de `useGoogleLogin` do passo 5 e troque o handler MSW de `/users/me/password/reauth` do teste de confirmação de senha, para que ele prove o corpo enviado:

```tsx
			http.post(
				`${apiBaseUrl}/users/me/password/reauth`,
				async ({ request }) => {
					receivedReauth = await request.json()
					return HttpResponse.json(
						{ reauthGrant: "grant-123", expiresInSeconds: 300 },
						{ status: 200 },
					)
				},
			),
```

  com `let receivedReauth: unknown = null` declarado no início do teste, e acrescente, logo antes do `expect` final, `expect(receivedReauth).toEqual({ provider: "google", code: "auth-code-123" })`. Troque também o clique, que hoje usa o mock do botão oficial, por `await user.click(screen.getByTestId("google-sign-in-button"))`.

- **Step 14: Run test to verify it fails**

  Run: `pnpm --filter frontend test "src/app/(authenticated)/perfil/senha/page.test.tsx"`
  Expected: FAIL — a asserção `expect(receivedReauth).toEqual({ provider: "google", code: "auth-code-123" })` recebe `received { provider: "google", idToken: undefined }`, porque a página ainda envia a chave antiga.

- **Step 15: Write minimal implementation**

  Em `apps/frontend/src/app/(authenticated)/perfil/senha/page.tsx`, renomeie o parâmetro e a propriedade enviada:

```tsx
			<GoogleSignInButton
				onSuccess={async (code) => {
					try {
						const response = await requestReauth({ provider, code })
						setReauthGrant(response.reauthGrant)
						toast.success(
							"Reautenticação confirmada. Agora você já pode definir sua senha.",
						)
					} catch (submitError) {
						toast.error(passwordReauthErrorMessage(submitError))
					}
				}}
				onError={(submitError) =>
					toast.error(passwordReauthErrorMessage(submitError))
				}
				disabled={isPending}
				isPending={isRequestingReauth}
			/>
```

- **Step 16: Run test to verify it passes**

  Run: `pnpm --filter frontend test "src/app/(authenticated)/perfil/senha/page.test.tsx"`
  Expected: PASS — 4 testes passaram, 0 falharam.

- **Step 17: Sincronizar o mock de `login-volt.test.tsx`**

  Em `apps/frontend/src/app/(public)/login/login-volt.test.tsx`, o mock de `@react-oauth/google` serve só para satisfazer a importação da árvore renderizada; troque `GoogleLogin` por `useGoogleLogin` com o mesmo corpo do passo 5. Nenhuma asserção deste arquivo muda — ele verifica identidade visual do hero e do formulário, não o login Google.

```tsx
vi.mock("@react-oauth/google", () => ({
	useGoogleLogin: (options: Record<string, unknown>) => () => {
		;(options.onSuccess as (response: { code?: string; scope?: string }) => void)(
			{ code: "auth-code-123", scope: "openid email" },
		)
	},
}))
```

- **Step 18: Run test to verify it passes**

  Run: `pnpm --filter frontend test "src/app/(public)/login/login-volt.test.tsx"`
  Expected: PASS — 5 testes passaram, 0 falharam.

- **Step 19: Commit**

```bash
git add apps/frontend/src/features/auth/api/index.ts \
  apps/frontend/src/features/auth/api/index.test.tsx \
  "apps/frontend/src/app/(public)/login/page.tsx" \
  "apps/frontend/src/app/(public)/login/page.test.tsx" \
  "apps/frontend/src/app/(public)/login/login-volt.test.tsx" \
  "apps/frontend/src/app/(public)/cadastro/page.tsx" \
  "apps/frontend/src/app/(public)/cadastro/page.test.tsx" \
  "apps/frontend/src/app/(authenticated)/perfil/senha/page.tsx" \
  "apps/frontend/src/app/(authenticated)/perfil/senha/page.test.tsx"
git commit -m "feat(auth): login, cadastro e reautenticação enviam o authorization code"
```

## Critérios de Sucesso

- `useLoginWithGoogle` envia `{ code }` para `POST /sessions/google` e nenhum `{ idToken }` sai do browser
- `useCreatePasswordReauthGrant` envia `{ provider, code }` para `POST /users/me/password/reauth`
- Login, cadastro e perfil › senha passam o authorization code recebido de `onSuccess` direto para a mutação, sem variável intermediária chamada `idToken`
- `setSession`, `toApiError`, os mapeamentos de status por tela e os `invalidateQueries` continuam idênticos
- Nenhum handler MSW de teste recebe um corpo sem `code`, e nenhum handler afirma comportamento do próprio mock: a asserção é sobre o corpo que a mutação enviou
- O `GoogleSignInButton` é localizado nas três telas por `getByTestId("google-sign-in-button")` — nenhum teste depende mais de `google-login-mock`
- A resposta `409 external_account_link_required` chega ao usuário como mensagem em PT-BR na tela de login, e a tela não redireciona
- Nenhum token do Google é armazenado, logado ou exibido
- `pnpm generate:types` foi executado na raiz do monorepo e os tipos de `POST /sessions/google` e `POST /users/me/password/reauth` aceitam `code`
- AC-01 [int]: WHEN o usuário clica em "Continuar com Google" THEN o popup de autorização abre e o callback entrega `{ code }` ao `onSuccess(code)`
- AC-02 [int]: WHEN o botão é renderizado THEN usa `Button` do design system com `variant="outline"`, `font-display` e o logo G oficial
- AC-08 [int]: WHEN o e-mail Google não está verificado THEN a resposta é `422`
- AC-09 [int]: WHEN o e-mail pertence a conta sem Google vinculado THEN a resposta é `409 external_account_link_required`
- AC-10 [int]: WHEN o body traz `idToken` em vez de `code` THEN a resposta é `400` de validação

Observação: a prova de backend do AC-10 (`POST /sessions/google` com `{ idToken }` → `400` de validação) está na task-02; o que esta task prova é o lado do cliente — as duas mutações só produzem corpo com `code`, então o corpo antigo não existe mais em nenhum caminho do app.