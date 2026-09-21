# Task 1: Value object NoticeAudience no domínio de notificação [FR-015]

**Status:** DONE
**Verified:** `bash -c cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/notification/domain/value-object/notice-audience.test.ts` → exit 0
**PRD:** `../prd/prd-notice-audience.md`
**Spec:** `../specs/notice-audience-design.md`
**Tier:** cheap
**Depends on:** N/A

## Visão Geral

Cria o value object `NoticeAudience` no domínio `notification`, com os valores `ALL`, `MEMBERS` e `ADMINS`. Ele representa o público de um aviso sem conhecer `Role` (decisão D1 do spec: o contexto `notification` não pode depender do contexto `user`). `NoticeAudience.all()` é o padrão, que sustenta o FR-015 (envio sem público equivale a "Todos"), e `NoticeAudience.create(value)` recusa qualquer valor fora dos três com `InvalidNoticeError`. O diretório `apps/backend/src/notification/domain/value-object/` ainda não existe e é criado aqui. O modelo de estilo é `apps/backend/src/user/domain/value-object/role.ts`.

## Arquivos

- Create: `apps/backend/src/notification/domain/value-object/notice-audience.ts`
- Test: `apps/backend/src/notification/domain/value-object/notice-audience.test.ts`

### Conformidade com as Skills Padrão

- `no-workarounds`: o valor inválido deve virar `failure(InvalidNoticeError)` na origem; nada de cast, `as never` ou fallback silencioso para `ALL`.
- `test-antipatterns`: os testes exercitam o value object real, sem mocks; nomes em português; cada teste prova uma regra.
- `typescript-advanced`: o tipo `NoticeAudienceTypes` é derivado de `NoticeAudienceValues` com `as const` e `keyof`, e a validação usa um type guard em vez de asserção.

## Passos

- **Step 1: Write the failing test**

Criar `apps/backend/src/notification/domain/value-object/notice-audience.test.ts`:

```ts
import { describe, expect, test } from "vitest"
import { InvalidNoticeError } from "@/notification/domain/errors/invalid-notice-error.js"
import {
	NoticeAudience,
	NoticeAudienceValues,
} from "./notice-audience.js"

describe("NoticeAudience", () => {
	test("os valores possiveis sao ALL, MEMBERS e ADMINS", () => {
		expect(NoticeAudienceValues).toEqual({
			ALL: "ALL",
			MEMBERS: "MEMBERS",
			ADMINS: "ADMINS",
		})
	})

	test("FR-015: all() representa o publico padrao ALL", () => {
		expect(NoticeAudience.all().value).toBe("ALL")
	})

	test.each(["ALL", "MEMBERS", "ADMINS"])(
		"create(%s) retorna sucesso com o mesmo valor",
		(value) => {
			const result = NoticeAudience.create(value)

			expect(result.isSuccess()).toBe(true)
			expect(result.force.success().value.value).toBe(value)
		},
	)

	test.each([
		["minusculas", "all"],
		["nome em portugues", "todos"],
		["string vazia", ""],
		["capitalizado", "Members"],
		["com espaco", " ADMINS"],
		["papel do dominio user", "ADMIN"],
	])("create com valor invalido (%s) retorna InvalidNoticeError", (_, value) => {
		const result = NoticeAudience.create(value)

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(InvalidNoticeError)
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/notification/domain/value-object/notice-audience.test.ts`
Expected: FAIL with "Failed to resolve import "./notice-audience.js"" (o arquivo ainda não existe), 1 arquivo de teste com falha.

- **Step 3: Write minimal implementation**

Criar `apps/backend/src/notification/domain/value-object/notice-audience.ts`:

```ts
import { InvalidNoticeError } from "@/notification/domain/errors/invalid-notice-error.js"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either.js"

export const NoticeAudienceValues = {
	ALL: "ALL",
	MEMBERS: "MEMBERS",
	ADMINS: "ADMINS",
} as const

export type NoticeAudienceTypes =
	(typeof NoticeAudienceValues)[keyof typeof NoticeAudienceValues]

function isNoticeAudience(value: string): value is NoticeAudienceTypes {
	return Object.values(NoticeAudienceValues).some(
		(candidate) => candidate === value,
	)
}

export class NoticeAudience {
	private constructor(private readonly audience: NoticeAudienceTypes) {}

	public static all(): NoticeAudience {
		return new NoticeAudience(NoticeAudienceValues.ALL)
	}

	public static create(
		value: string,
	): Either<InvalidNoticeError, NoticeAudience> {
		if (!isNoticeAudience(value)) {
			return failure(
				new InvalidNoticeError(
					`Audience must be one of ${Object.values(NoticeAudienceValues).join(", ")}`,
				),
			)
		}
		return success(new NoticeAudience(value))
	}

	get value(): NoticeAudienceTypes {
		return this.audience
	}
}
```

- **Step 4: Run test to verify it passes**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/notification/domain/value-object/notice-audience.test.ts`
Expected: PASS (1 arquivo, 4 grupos de teste: 1 + 1 + 3 + 6 = 11 testes).

- **Step 5: Commit** *(execução sequencial apenas; em onda paralela o orquestrador commita na barreira de integração. Se o seu prompt diz que você é um de vários implementadores em uma árvore compartilhada, pule este passo e reporte os arquivos.)*

```bash
git add apps/backend/src/notification/domain/value-object/notice-audience.ts apps/backend/src/notification/domain/value-object/notice-audience.test.ts
git commit -m "feat(notice-audience): adiciona value object NoticeAudience"
```

## Critérios de Sucesso

- `NoticeAudience.all()` devolve o valor `ALL` (FR-015: sem público informado, o padrão é "Todos").
- `NoticeAudience.create` aceita exatamente `ALL`, `MEMBERS` e `ADMINS`, e devolve `failure(InvalidNoticeError)` para qualquer outro valor, inclusive minúsculas, string vazia e `ADMIN`.
- O value object não importa nada do contexto `user`.
