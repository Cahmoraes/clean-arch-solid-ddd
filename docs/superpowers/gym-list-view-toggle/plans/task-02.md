# Task 2: Criar módulo de cookie `gym-view-cookie.ts`

**Status:** DONE
**PRD:** N/A
**Spec:** ../specs/gym-list-view-toggle-design.md
**Tier:** cheap
**Depends on:** N/A

## Visão Geral

Cria o módulo de leitura/escrita do cookie `gym_view`, replicando exatamente a API e a implementação de `sidebar-collapse-cookie.ts` (chave `sidebar_collapsed`, boolean) mas com valores `"cards" | "rows"` e default seguro `"cards"` para ausência ou valor inválido. Esse módulo é consumido pelo `GymViewStore` (task 3, como efeito colateral de `toggle`/`setView`) e por `AcademiasContent` (task 7, na hidratação client-only).

## Arquivos

- Create: `apps/frontend/src/lib/ui-state/gym-view-cookie.ts`
- Create (test): `apps/frontend/src/lib/ui-state/gym-view-cookie.test.ts`

### Conformidade com as Skills Padrão

- `typescript-advanced`: modelar `GymView` como union type `"cards" | "rows"` e garantir que a função de leitura estreite corretamente um `string | undefined` bruto para esse union.
- `code-style`: seguir o mesmo naming/estrutura de `sidebar-collapse-cookie.ts` (constante `*_COOKIE`, `write*Cookie`, `parse*Cookie`) para manter convenção consistente em `lib/ui-state/`.
- `test-antipatterns`: cobrir os casos reais de borda (ausente, inválido, `"cards"`, `"rows"`) sem testar detalhes de implementação do `document.cookie`.

## Passos

- **Step 1: Write the failing test**

```ts
// apps/frontend/src/lib/ui-state/gym-view-cookie.test.ts
import { afterEach, describe, expect, test } from "vitest"
import {
	GYM_VIEW_COOKIE,
	parseGymViewCookie,
	writeGymViewCookie,
} from "./gym-view-cookie"

function clearCookie(): void {
	// biome-ignore lint/suspicious/noDocumentCookie: helper de limpeza de cookie em testes
	document.cookie = `${GYM_VIEW_COOKIE}=; path=/; max-age=0`
}

afterEach(clearCookie)

describe("gym-view-cookie", () => {
	test("interpreta valor ausente como cards", () => {
		expect(parseGymViewCookie(undefined)).toBe("cards")
	})

	test("interpreta valor inválido como cards", () => {
		expect(parseGymViewCookie("qualquer-coisa")).toBe("cards")
	})

	test('interpreta "cards" e "rows" corretamente', () => {
		expect(parseGymViewCookie("cards")).toBe("cards")
		expect(parseGymViewCookie("rows")).toBe("rows")
	})

	test("escreve o cookie com a view cards", () => {
		writeGymViewCookie("cards")
		expect(document.cookie).toContain(`${GYM_VIEW_COOKIE}=cards`)
	})

	test("escreve o cookie com a view rows", () => {
		writeGymViewCookie("rows")
		expect(document.cookie).toContain(`${GYM_VIEW_COOKIE}=rows`)
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend test gym-view-cookie.test.ts`
Expected: FAIL with `Failed to resolve import "./gym-view-cookie"` (o módulo ainda não existe)

- **Step 3: Write minimal implementation**

```ts
// apps/frontend/src/lib/ui-state/gym-view-cookie.ts
export type GymView = "cards" | "rows"

export const GYM_VIEW_COOKIE = "gym_view"

/**
 * Grava a preferência de visualização de academias num cookie de 1 ano.
 * Client-side only — no-op durante SSR (sem `document`).
 */
export function writeGymViewCookie(view: GymView): void {
	if (typeof document === "undefined") return
	// biome-ignore lint/suspicious/noDocumentCookie: cookieStore não está disponível no Firefox e Safari <17; document.cookie é o fallback compatível
	document.cookie = `${GYM_VIEW_COOKIE}=${view}; path=/; max-age=31536000; SameSite=Lax`
}

/** Interpreta o valor bruto do cookie. Ausente/inválido => cards. */
export function parseGymViewCookie(value: string | undefined): GymView {
	return value === "rows" ? "rows" : "cards"
}
```

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend test gym-view-cookie.test.ts`
Expected: PASS

- **Step 5: Commit**

```bash
git add apps/frontend/src/lib/ui-state/gym-view-cookie.ts apps/frontend/src/lib/ui-state/gym-view-cookie.test.ts
git commit -m "feat: adiciona módulo de cookie gym-view-cookie para persistir a view de academias"
```

## Critérios de Sucesso

- `gym-view-cookie.ts` exporta `GymView`, `GYM_VIEW_COOKIE`, `writeGymViewCookie(view)` e `parseGymViewCookie(value)`.
- Valor ausente ou inválido resolve para `"cards"`.
- Escrita usa a chave `gym_view`, `path=/`, `max-age=31536000`, `SameSite=Lax`, mesmo shape de `sidebar-collapse-cookie.ts`.
- `pnpm --filter frontend test gym-view-cookie.test.ts` 100% verde.
