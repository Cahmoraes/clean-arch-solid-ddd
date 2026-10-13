# Task 4: Botão "Continuar com Google" customizado com design system [FR-001, FR-002, FR-004, FR-005]

**Status:** DONE

**PRD:** `../prd/prd-google-custom-signin-button.md`

**Spec:** `../specs/google-custom-signin-button-design.md`

**Tier:** standard

## Visão Geral

O iframe `GoogleLogin` do Google sai da tela: o botão passa a ser um `Button` do design system com o logo G oficial, `font-display`, forma retangular e as cores de `variant="outline"`, e dispara `useGoogleLogin` com `flow: "auth-code"` no clique, recebendo `{ code }` no callback em vez de um ID token. As três telas mantêm a mesma interface pública — só o significado do argumento de `onSuccess` muda, de token para authorization code.

## Arquivos

- Modify: `apps/frontend/src/features/auth/components/google-sign-in-button.tsx`
- Test: `apps/frontend/src/features/auth/components/google-sign-in-button.test.tsx`

## Interfaces

- **Consome:** `GoogleGIcon({ className }: { className?: string }): React.JSX.Element` — `apps/frontend/src/components/ui/google-g-icon.tsx` (task-03)
- **Produz:**
  - `GoogleSignInButton` com props `{ onSuccess: (code: string) => void; onError?: (error: Error) => void; disabled?: boolean; isPending?: boolean }` — o `onSuccess` passa a receber o authorization code, não o `idToken` (task-05 liga as 3 telas)
  - Mensagem de popup bloqueado: `Não foi possível abrir o login com Google. Verifique o bloqueador de pop-ups.`

### Skills a invocar

- `shadcn`: o botão é o `Button` do design system — reaproveite `variant="outline"`, o `className` fundido por `cn()` e o comportamento de `disabled`; não reescreva nem estenda o primitivo.
- `tailwindcss`: `w-full max-w-[400px]`, `gap-2.5` (10px) e `h-5 w-5` no ícone são da escala do repo; nenhum `rounded-*` e nenhuma cor literal (a guarda `src/test/rounded-residue.test.ts` e `no-literal-colors.test.ts` continuam valendo).
- `vercel-react-best-practices`: o componente não guarda estado de loading — o `isPending` vem do pai, o que evita um segundo ciclo de render e um estado interno que trava.
- `vercel-composition-patterns`: o componente compõe `Button` + `GoogleGIcon` + `useGoogleLogin` e esconde popup, `onNonOAuthError` e carregamento atrás de 4 props estáveis.
- `wcag-audit-patterns`: o nome acessível do botão vem do texto "Continuar com Google"; o svg é decorativo (`aria-hidden`), o botão nativo mantém a ordem de foco e `disabled` usa o comportamento do `Button` (`opacity-50`, `cursor-not-allowed`) em vez de `pointer-events-none` no container.
- `context7`: confirmar a assinatura real de `useGoogleLogin` em `@react-oauth/google` 0.13.5 — `useGoogleLogin(options: UseGoogleLoginOptionsAuthCodeFlow): () => void` — e que `onSuccess` do fluxo `auth-code` recebe `CodeResponse` (`{ code, scope }`), antes de escrever o teste contra um contrato imaginado.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/google-custom-signin-button-visual.md` (baseline de layout, espaçamento, tipografia e tokens)
- **Fonte de design original:** nenhuma; seguir o mockup curado (comparativo aprovado no preview local contra o botão oficial, nos temas dark e light)
- **Confirmar com o usuário:** existe um export/screenshot final do botão para servir de fonte de design original para esta tela? Sem resposta, siga o mockup curado — o passo nunca bloqueia
- **Ferramentas de fidelidade visual (descobrir no ambiente):** `playwright-cli` — capturar o botão renderizado nas telas de login, cadastro e perfil › senha, nos temas dark e light, e comparar com o mockup lado a lado; `figma-visual-tester` não se aplica (não há Figma neste feature)
- **Decisões visuais já tomadas (não refazer):** rótulo único "Continuar com Google" nas 3 telas, sem prop de texto por tela; logo G oficial multicolorido em 20px (`h-5`) alinhado à esquerda com gap de 10px (`gap-2.5`); forma retangular com chanfro do tema (`rounded-md` do `Button`, sem `rounded-full`); altura 40px (`size="md"`) e `w-full max-w-[400px]`; `font-display` em caixa alta com `tracking-[0.06em]` vindo do `Button`; cores por tema via `variant="outline"` (`bg-card`/`card-foreground`/`border`); estados `disabled`/`isPending` herdados do `Button`

## Passos

- **Step 0: Confirm design source & fidelity tools**

  Leia `../specs/mockups/google-custom-signin-button-visual.md` e o bloco acima. Confirme com o usuário se existe uma fonte de design original (export/screenshot) para o botão; sem resposta, construa manualmente a partir do mockup curado, reaproveitando o markup de referência dele (`variant="outline"`, `w-full max-w-[400px] gap-2.5`, `GoogleGIcon className="h-5 w-5 shrink-0"`) sem re-derivar layout, espaçamento ou tokens. Não redesenhe nem monocromize o logo.

- **Step 1: Write the failing test**

  Reescreva `apps/frontend/src/features/auth/components/google-sign-in-button.test.tsx` inteiro. O mock de `GoogleLogin` sai e entra um mock de `useGoogleLogin` que guarda as opções recebidas e devolve a função de disparo; um ref de `vi.hoisted` escolhe, por teste, qual callback o popup dispara. O mock de `next-themes` **não** é mais necessário. Os testes que fixavam `shape`, `text`, `width` e `theme` do botão oficial saem junto com o `GoogleLogin`.

```tsx
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { GoogleSignInButton } from "./google-sign-in-button"

type GoogleScenario =
	| "code"
	| "no_code"
	| "popup_blocked"
	| "popup_closed"
	| "popup_error"

const { scenario, lastUseGoogleLoginOptions } = vi.hoisted(() => ({
	scenario: { current: "code" as GoogleScenario },
	lastUseGoogleLoginOptions: [] as Record<string, unknown>[],
}))

vi.mock("@react-oauth/google", () => ({
	useGoogleLogin: (options: Record<string, unknown>) => {
		lastUseGoogleLoginOptions.push(options)

		return () => {
			const onSuccess = options.onSuccess as ((response: {
				code?: string
				scope?: string
			}) => void) | undefined
			const onError = options.onError as
				| ((response: unknown) => void)
				| undefined
			const onNonOAuthError = options.onNonOAuthError as
				| ((response: { type: string }) => void)
				| undefined

			switch (scenario.current) {
				case "code":
					onSuccess?.({ code: "fake-auth-code", scope: "openid email" })
					break
				case "no_code":
					onSuccess?.({ scope: "openid email" })
					break
				case "popup_blocked":
					onNonOAuthError?.({ type: "popup_failed_to_open" })
					break
				case "popup_closed":
					onNonOAuthError?.({ type: "popup_closed" })
					break
				case "popup_error":
					onError?.({ error: "popup_error" })
					break
			}
		}
	},
}))

describe("GoogleSignInButton", () => {
	beforeEach(() => {
		lastUseGoogleLoginOptions.length = 0
		scenario.current = "code"
	})

	test("AC-01 entrega o authorization code ao onSuccess quando o usuário conclui o login Google", async () => {
		const onSuccess = vi.fn()
		const user = userEvent.setup()

		render(<GoogleSignInButton onSuccess={onSuccess} />)
		await user.click(screen.getByTestId("google-sign-in-button"))

		expect(onSuccess).toHaveBeenCalledWith("fake-auth-code")
	})

	test("dispara o fluxo auth-code em popup, sem token no browser", async () => {
		const user = userEvent.setup()

		render(<GoogleSignInButton onSuccess={vi.fn()} />)
		await user.click(screen.getByTestId("google-sign-in-button"))

		expect(lastUseGoogleLoginOptions.at(-1)).toMatchObject({
			flow: "auth-code",
			ux_mode: "popup",
		})
	})

	test("AC-02 renderiza o Button do design system com variant outline, font-display e o logo G oficial", () => {
		render(<GoogleSignInButton onSuccess={vi.fn()} />)

		const button = screen.getByTestId("google-sign-in-button")

		expect(button).toHaveClass("bg-card", "font-display", "uppercase")
		expect(button).toHaveClass("w-full", "max-w-[400px]")
		expect(button).toHaveTextContent("Continuar com Google")
		expect(button.querySelector("svg")).toHaveAttribute("aria-hidden", "true")
		expect(button).not.toHaveClass("pointer-events-none")
	})

	test("AC-04 mapeia popup bloqueado para onError com a mensagem do bloqueador", async () => {
		scenario.current = "popup_blocked"
		const onError = vi.fn()
		const user = userEvent.setup()

		render(<GoogleSignInButton onSuccess={vi.fn()} onError={onError} />)
		await user.click(screen.getByTestId("google-sign-in-button"))

		expect(onError).toHaveBeenCalledWith(expect.any(Error))
		expect(onError.mock.calls[0][0].message).toBe(
			"Não foi possível abrir o login com Google. Verifique o bloqueador de pop-ups.",
		)
	})

	test("AC-05 não reporta erro quando o usuário fecha o popup", async () => {
		scenario.current = "popup_closed"
		const onError = vi.fn()
		const onSuccess = vi.fn()
		const user = userEvent.setup()

		render(<GoogleSignInButton onSuccess={onSuccess} onError={onError} />)
		await user.click(screen.getByTestId("google-sign-in-button"))

		expect(onError).not.toHaveBeenCalled()
		expect(onSuccess).not.toHaveBeenCalled()
		expect(screen.getByTestId("google-sign-in-button")).toBeEnabled()
	})

	test("deriva disabled e isPending do Button, sem travar o ciclo de loading", async () => {
		const user = userEvent.setup()
		const { rerender } = render(
			<GoogleSignInButton onSuccess={vi.fn()} isPending />,
		)

		expect(screen.getByTestId("google-sign-in-button")).toBeDisabled()

		rerender(<GoogleSignInButton onSuccess={vi.fn()} />)

		expect(screen.getByTestId("google-sign-in-button")).toBeEnabled()
		await user.click(screen.getByTestId("google-sign-in-button"))
	})
})
```

- **Step 2: Run test to verify it fails**

  Run: `pnpm --filter frontend test src/features/auth/components/google-sign-in-button.test.tsx`
  Expected: FAIL — o `vi.mock("@react-oauth/google")` do teste não exporta `GoogleLogin`, que o componente atual ainda importa, então a resolução do import falha; o mock de `next-themes`, que o componente atual ainda chama, também deixou de estar no lugar.

- **Step 3: Review Focus: Google não devolvendo `code` nem `email_verified` no payload: o botão não pode quebrar o ciclo de loading — `task-04` — Write the failing test**

  Acrescente ao mesmo arquivo o teste que fixa o payload sem `code`:

```tsx
	test("Google sem authorization code no payload não quebra o ciclo de loading", async () => {
		scenario.current = "no_code"
		const onSuccess = vi.fn()
		const onError = vi.fn()
		const user = userEvent.setup()

		render(<GoogleSignInButton onSuccess={onSuccess} onError={onError} />)
		await user.click(screen.getByTestId("google-sign-in-button"))

		expect(onSuccess).not.toHaveBeenCalled()
		expect(onError).toHaveBeenCalledWith(expect.any(Error))
		expect(onError.mock.calls[0][0].message).toMatch(/authorization code/i)
		expect(screen.getByTestId("google-sign-in-button")).toBeEnabled()
	})
```

- **Step 4: Run test to verify it fails**

  Run: `pnpm --filter frontend test src/features/auth/components/google-sign-in-button.test.tsx -t "authorization code no payload"`
  Expected: FAIL — o componente atual só conhece `GoogleLogin`/`handleSuccess` e não recebe `useGoogleLogin`; a asserção `expect(onError).toHaveBeenCalledWith(expect.any(Error))` recebe `received 0`.

- **Step 5: Write minimal implementation**

  Reescreva `apps/frontend/src/features/auth/components/google-sign-in-button.tsx`. Saem o import de `GoogleLogin`/`CredentialResponse`, o `useTheme` e o `pointer-events-none opacity-60` do container; entram o `Button` do design system, o `GoogleGIcon` e o `useGoogleLogin` disparado no clique:

```tsx
"use client"

import { useGoogleLogin } from "@react-oauth/google"
import { Button } from "@/components/ui/button"
import { GoogleGIcon } from "@/components/ui/google-g-icon"

interface GoogleSignInButtonProps {
	onSuccess: (code: string) => void
	onError?: (error: Error) => void
	disabled?: boolean
	isPending?: boolean
}

const POPUP_BLOCKED_MESSAGE =
	"Não foi possível abrir o login com Google. Verifique o bloqueador de pop-ups."

export function GoogleSignInButton({
	onSuccess,
	onError,
	disabled = false,
	isPending = false,
}: GoogleSignInButtonProps) {
	const login = useGoogleLogin({
		flow: "auth-code",
		ux_mode: "popup",
		onSuccess: ({ code }) => {
			if (!code) {
				onError?.(new Error("O Google não retornou um authorization code."))
				return
			}

			onSuccess(code)
		},
		onError: () =>
			onError?.(new Error("Não foi possível iniciar o login com Google.")),
		onNonOAuthError: ({ type }) => {
			if (type === "popup_failed_to_open") {
				onError?.(new Error(POPUP_BLOCKED_MESSAGE))
			}
		},
	})

	return (
		<Button
			type="button"
			variant="outline"
			className="w-full max-w-[400px] gap-2.5"
			onClick={() => login()}
			disabled={disabled || isPending}
			data-testid="google-sign-in-button"
		>
			<GoogleGIcon className="h-5 w-5 shrink-0" />
			Continuar com Google
		</Button>
	)
}
```

- **Step 6: Run test to verify it passes**

  Run: `pnpm --filter frontend test src/features/auth/components/google-sign-in-button.test.tsx`
  Expected: PASS — 7 testes passaram, 0 falharam.

- **Step 7: Run test to verify it passes**

  Run: `pnpm --filter frontend test src/features/auth/components/google-sign-in-button.test.tsx -t "authorization code no payload"`
  Expected: PASS — 1 teste passou, o resto skipped.

- **Step 8: Commit**

```bash
git add apps/frontend/src/features/auth/components/google-sign-in-button.tsx \
  apps/frontend/src/features/auth/components/google-sign-in-button.test.tsx
git commit -m "feat(auth): botão Continuar com Google sobre o design system"
```

## Critérios de Sucesso

- O componente não importa mais `GoogleLogin` nem `next-themes`; o único toque com o Google é `useGoogleLogin({ flow: "auth-code", ux_mode: "popup" })`, disparado no clique
- `onSuccess` recebe o authorization code (`(code: string) => void`) e nenhum token do Google chega ao browser
- O botão renderiza `Button variant="outline"` com `w-full max-w-[400px]`, `gap-2.5`, o `GoogleGIcon` em `h-5 w-5 shrink-0` e o texto "Continuar com Google" — a única fonte de estilo é o `Button`, sem `font-display` ou cor escrita à mão
- O rótulo é literal no componente: não há prop de texto por tela
- `popup_failed_to_open` chama `onError` com `Não foi possível abrir o login com Google. Verifique o bloqueador de pop-ups.`; `popup_closed` não chama `onError` nem `onSuccess`; um `onSuccess` sem `code` chama `onError` e não chama `onSuccess`
- `disabled`/`isPending` desabilitam o próprio `Button` e o container não recebe `pointer-events-none` nem `opacity-60`
- O botão mantém nome acessível pelo texto visível e o svg do logo permanece `aria-hidden`, fora da ordem de foco
- O `data-testid="google-sign-in-button"` está no elemento `<button>`, de modo que as telas de login, cadastro e perfil › senha continuam localizando-o por `getByTestId`
- Risco: Popup bloqueado derruba o login Google
- AC-01 [unit]: WHEN o usuário clica em "Continuar com Google" THEN o popup de autorização abre e o callback entrega `{ code }` ao `onSuccess(code)`
- AC-02 [unit]: WHEN o botão é renderizado THEN usa `Button` do design system com `variant="outline"`, `font-display` e o logo G oficial
- AC-04 [unit]: WHEN o navegador bloqueia o popup THEN `isPending` termina e o usuário vê o toast de pop-up bloqueado
- AC-05 [unit]: WHEN o usuário fecha o popup THEN nenhum toast aparece e o botão volta ao estado normal