# Task 1: Implementar container `max-w-6xl` na tela de login + verificação

**Status:** PENDING
**PRD:** N/A
**Spec:** `../specs/login-content-container-design.md`
**Depends on:** N/A

## Visão Geral

Envolver o grid de duas colunas do componente `LoginForm` em um container `mx-auto w-full max-w-6xl`, alinhando os limites laterais do conteúdo com o header e o footer do `PublicShell` (que usam `max-w-6xl`). A mudança é limitada a `apps/frontend/src/app/(public)/login/page.tsx`.

## Arquivos

- Modify: `apps/frontend/src/app/(public)/login/page.tsx`
- Test: `apps/frontend/src/app/(public)/login/page.test.tsx`

### Conformidade com as Skills Padrão

- `tailwindcss`: classes utilitárias de layout (`mx-auto`, `w-full`, `max-w-6xl`)
- `test-antipatterns`: não testar detalhes de implementação CSS; usar `data-testid` para identificar o container

## Passos

### Step 1: Escrever o teste que vai falhar

Abra `apps/frontend/src/app/(public)/login/page.test.tsx` e adicione este teste ao final do `describe("LoginPage", ...)`, antes do fechamento `})`:

```typescript
test("renderiza container com max-w-6xl alinhado ao header e footer", () => {
  renderWithProviders(<LoginPage />)

  const container = screen.getByTestId("login-content-container")
  expect(container).toBeInTheDocument()
  expect(container).toHaveClass("mx-auto")
  expect(container).toHaveClass("max-w-6xl")
  expect(container).toHaveClass("w-full")
})
```

### Step 2: Executar o teste para confirmar que falha

```bash
cd apps/frontend
pnpm test -- -t "renderiza container com max-w-6xl"
```

Saída esperada: **FAIL** — `Unable to find an element by: [data-testid="login-content-container"]`

### Step 3: Implementar o wrapper no `LoginForm`

Abra `apps/frontend/src/app/(public)/login/page.tsx`.

Localize o retorno de `LoginForm` (linha ~73). Substitua:

```tsx
return (
	<div className="grid min-h-[calc(100vh-8rem)] grid-cols-[1.05fr_1fr] max-[860px]:grid-cols-1">
```

por:

```tsx
return (
	<div className="mx-auto w-full max-w-6xl" data-testid="login-content-container">
		<div className="grid min-h-[calc(100vh-8rem)] grid-cols-[1.05fr_1fr] max-[860px]:grid-cols-1">
```

E feche a nova `div` antes do `</div>` de fechamento do `LoginForm`. O retorno completo do componente deve ficar assim:

```tsx
return (
	<div className="mx-auto w-full max-w-6xl" data-testid="login-content-container">
		<div className="grid min-h-[calc(100vh-8rem)] grid-cols-[1.05fr_1fr] max-[860px]:grid-cols-1">
			<aside className="relative flex flex-col justify-between overflow-hidden bg-surface-3 p-12 dark:bg-[#0a0a0a] max-[860px]:hidden">
				<h2 className="font-display text-[clamp(48px,7vw,92px)] font-bold leading-[0.92] tracking-[-0.03em]">
					Treine onde
					<br />
					<span className="text-accent">você</span> estiver.
				</h2>
				<div className="flex flex-wrap gap-9">
					<div className="flex flex-col gap-0.5">
						<span className="font-mono text-3xl font-bold text-accent tabular-nums">
							312
						</span>
						<span className="max-w-[110px] text-xs text-muted-foreground dark:text-white/55">
							academias parceiras
						</span>
					</div>
					<div className="flex flex-col gap-0.5">
						<span className="font-mono text-3xl font-bold text-accent tabular-nums">
							48k
						</span>
						<span className="max-w-[110px] text-xs text-muted-foreground dark:text-white/55">
							check-ins por mês
						</span>
					</div>
					<div className="flex flex-col gap-0.5">
						<span className="font-mono text-3xl font-bold text-accent tabular-nums">
							4.9
						</span>
						<span className="max-w-[110px] text-xs text-muted-foreground dark:text-white/55">
							avaliação média
						</span>
					</div>
				</div>
			</aside>

			<div className="flex flex-col justify-center p-12 max-[560px]:p-6">
				<div className="mx-auto flex w-full max-w-[400px] flex-col gap-8">
					<header className="flex flex-col gap-2">
						<Eyebrow>Acesse sua conta</Eyebrow>
						<h1 className="font-display text-[30px] font-semibold tracking-tight text-foreground">
							Entrar
						</h1>
					</header>

					<form
						noValidate
						className="flex flex-col gap-4"
						onSubmit={handleSubmit(onSubmit)}
						aria-busy={isPending || isGooglePending}
					>
						<FormField
							id={emailId}
							label="E-mail"
							type="email"
							autoComplete="email"
							error={errors.email?.message}
							{...register("email")}
						/>
						<FormField
							id={passwordId}
							label="Senha"
							type="password"
							autoComplete="current-password"
							error={errors.password?.message}
							{...register("password")}
						/>
						<div className="flex justify-end">
							<Link
								href="/recuperar-senha"
								className="text-sm font-medium text-foreground underline underline-offset-4"
							>
								Esqueceu sua senha?
							</Link>
						</div>

						{submissionMessage ? (
							<p
								role="alert"
								data-testid="login-submit-error"
								className="rounded-[12px] border border-border bg-accent px-4 py-3 text-sm text-foreground"
							>
								{submissionMessage}
							</p>
						) : null}

						<Button
							type="submit"
							disabled={isPending || isGooglePending}
							data-testid="login-submit"
						>
							{isPending ? "Entrando…" : "Entrar"}
						</Button>
					</form>

					<div className="flex items-center gap-3">
						<div className="flex-1 border-t border-border" />
						<span className="text-xs text-muted-foreground">ou</span>
						<div className="flex-1 border-t border-border" />
					</div>

					<GoogleSignInButton
						onSuccess={async (idToken) => {
							try {
								await mutateAsyncGoogle(idToken)
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

					<p className="text-sm text-muted-foreground">
						Não tem conta?{" "}
						<Link
							href="/cadastro"
							className="font-medium text-foreground underline underline-offset-4"
						>
							Crie agora
						</Link>
					</p>
				</div>
			</div>
		</div>
	</div>
)
```

### Step 4: Executar o teste novo para confirmar que passa

```bash
cd apps/frontend
pnpm test -- -t "renderiza container com max-w-6xl"
```

Saída esperada: **PASS**

### Step 5: Executar a suíte completa para confirmar não-regressão

```bash
cd apps/frontend
pnpm test
```

Saída esperada: todos os testes passando. Nenhum teste de `LoginPage` pode ter falhado — a mudança não altera comportamento, apenas adiciona um `div` wrapper.

### Step 6: Lint e verificação de tipos

```bash
cd apps/frontend
pnpm lint:fix && pnpm tsc:check
```

Saída esperada: zero erros de lint e zero erros de tipo. O `data-testid` em um `div` nativo não requer tipo extra.

### Step 7: Build de produção

```bash
cd apps/frontend
pnpm build
```

Saída esperada: build bem-sucedido sem erros.

### Step 8: Verificação visual manual (obrigatória)

Inicie o servidor de desenvolvimento:

```bash
cd apps/frontend
pnpm dev
```

Acesse `http://localhost:3000/login` e verifique:

1. **Viewport 1440px** (abrir DevTools, definir largura): o grid de "Treine onde você estiver" + formulário não ultrapassa a largura do header/footer — há espaço em branco visible nas laterais, alinhado com o logo VOLT.
2. **Viewport 1152px** (exatamente `max-w-6xl`): o grid preenche exatamente a largura da tela sem overflow.
3. **Viewport 860px** (breakpoint mobile): a coluna "Treine onde você estiver" desaparece e apenas o formulário é exibido — comportamento `max-[860px]:grid-cols-1` inalterado.
4. **Viewport 375px** (mobile): formulário centralizado, sem quebra de layout.

### Step 9: Commit

```bash
cd /home/cahmoraes/projects/estudo/clean-arch-solid-ddd
git add apps/frontend/src/app/\(public\)/login/page.tsx \
        apps/frontend/src/app/\(public\)/login/page.test.tsx
git commit -m "feat(frontend): add max-w-6xl container to login page content

Wraps the 2-column grid in LoginForm with mx-auto w-full max-w-6xl,
aligning the content boundaries with the PublicShell header and footer.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- `data-testid="login-content-container"` presente no DOM com classes `mx-auto w-full max-w-6xl`
- Todos os testes existentes de `LoginPage` continuam passando sem alteração
- `pnpm lint:fix` sem erros
- `pnpm tsc:check` sem erros
- `pnpm build` bem-sucedido
- Em viewport ≥ 1152px, os limites laterais do grid são visualmente alinhados com o header e footer
- Breakpoint `max-[860px]:grid-cols-1` inalterado (layout mobile intacto)
