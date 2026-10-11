# Task 1: Configuração: dependência mongodb, variáveis de ambiente e serviço Mongo com replica set [FR-001, FR-003, FR-016]

**Status:** DONE

**PRD:** `../prd/prd-mongodb-coexistence.md`

**Spec:** `../specs/mongodb-coexistence-design.md`

**Tier:** standard

## Visão Geral

Esta task prepara o terreno de configuração para o segundo banco: o schema de variáveis de ambiente passa a aceitar `DATABASE_PROVIDER=mongo` (exigindo `DATABASE_URL_MONGO`), a dependência do driver `mongodb` entra no backend, o `compose.yaml` ganha um MongoDB single-node com replica set (necessário para transações) e o script `test:e2e:mongo` passa a existir. O provider padrão continua `prisma`, então sem mudar o ambiente nada muda.

## Arquivos

- Create: `apps/backend/src/shared/infra/env/env-schema.ts`
- Modify: `apps/backend/src/shared/infra/env/index.ts`
- Modify: `apps/backend/package.json`
- Modify: `apps/backend/compose.yaml`
- Modify: `apps/backend/.env.example`
- Modify: `apps/backend/.env.test`
- Test: `apps/backend/src/shared/infra/env/env-schema.test.ts`

## Interfaces

- **Consome:** N/A
- **Produz:** `envSchema` exportado de `@/shared/infra/env/env-schema` (objeto zod com `superRefine`, sem efeitos colaterais de import); `env.DATABASE_PROVIDER: "prisma" | "sqlite" | "mongo"` (padrão `"prisma"`); `env.DATABASE_URL_MONGO: string | undefined`; script `test:e2e:mongo` no `package.json`; serviço `mongodb` (container `mongodb-dev`, `127.0.0.1:27017`, replica set `rs0`) no `compose.yaml`; dependência `mongodb` instalada.

### Skills a invocar

- `typescript-advanced`: o schema zod com `superRefine` precisa manter o tipo inferido de `env` (união literal de `DATABASE_PROVIDER` e `DATABASE_URL_MONGO` opcional) sem casts.
- `no-workarounds`: a validação cruzada (provider `mongo` exige URL) vai no schema, não em um `if` solto depois do parse; nada de `as any` nem supressão de lint.
- `test-antipatterns`: o teste exercita o schema real (`safeParse`), sem mockar zod nem importar o `env` global (que lê `process.env` na importação).
- `context7`: confirmar na documentação do zod 4 a assinatura de `superRefine` / `ctx.addIssue` e na do driver `mongodb` a versão instalada pelo `pnpm add`.

## Passos

- **Step 1: Write the failing test**

Criar `apps/backend/src/shared/infra/env/env-schema.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { envSchema } from "./env-schema"

const baseEnv = {
	PORT: "3333",
	PRIVATE_KEY: "a".repeat(32),
	DATABASE_URL: "postgresql://docker:docker@localhost:5432/apisolid",
	STRIPE_PUBLIC_KEY: "pk_test",
	STRIPE_PRIVATE_KEY: "sk_test",
	STRIPE_PRICE_ID: "price_test",
	STRIPE_WEBHOOK_SECRET: "whsec_test",
}

const mongoUrl =
	"mongodb://localhost:27017/test?replicaSet=rs0&directConnection=true"

function issuePaths(
	result: ReturnType<typeof envSchema.safeParse>,
): string[] {
	if (result.success) return []
	return result.error.issues.map((issue) => issue.path.join("."))
}

describe("envSchema DATABASE_PROVIDER", () => {
	it("FR-003: defaults DATABASE_PROVIDER to prisma when it is absent", () => {
		const result = envSchema.safeParse(baseEnv)
		expect(result.success).toBe(true)
		expect(result.data?.DATABASE_PROVIDER).toBe("prisma")
	})

	it("FR-001: accepts prisma without DATABASE_URL_MONGO", () => {
		const result = envSchema.safeParse({
			...baseEnv,
			DATABASE_PROVIDER: "prisma",
		})
		expect(result.success).toBe(true)
		expect(result.data?.DATABASE_URL_MONGO).toBeUndefined()
	})

	it("FR-001: accepts mongo when DATABASE_URL_MONGO is set", () => {
		const result = envSchema.safeParse({
			...baseEnv,
			DATABASE_PROVIDER: "mongo",
			DATABASE_URL_MONGO: mongoUrl,
		})
		expect(result.success).toBe(true)
		expect(result.data?.DATABASE_PROVIDER).toBe("mongo")
		expect(result.data?.DATABASE_URL_MONGO).toBe(mongoUrl)
	})

	it("AC-04: rejects an invalid DATABASE_PROVIDER value", () => {
		const result = envSchema.safeParse({
			...baseEnv,
			DATABASE_PROVIDER: "mysql",
		})
		expect(result.success).toBe(false)
		expect(issuePaths(result)).toContain("DATABASE_PROVIDER")
	})

	it("AC-04: rejects provider mongo without DATABASE_URL_MONGO", () => {
		const result = envSchema.safeParse({
			...baseEnv,
			DATABASE_PROVIDER: "mongo",
		})
		expect(result.success).toBe(false)
		expect(issuePaths(result)).toContain("DATABASE_URL_MONGO")
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/shared/infra/env/env-schema.test.ts`
Expected: FAIL with "Failed to resolve import "./env-schema"" (o módulo ainda não existe)

- **Step 3: Write minimal implementation**

Criar `apps/backend/src/shared/infra/env/env-schema.ts` (o schema atual sai de `index.ts` sem alteração, mais os dois campos novos e a validação cruzada):

```ts
import { z } from "zod"

export const envSchema = z
	.object({
		NODE_ENV: z.enum(["test", "production"]).default("production"),
		PORT: z.coerce.number(),
		HOST: z.string().default("0.0.0.0"),
		PASSWORD_SALT: z.coerce.number().min(10).default(12),
		PRIVATE_KEY: z.string().min(32),
		ITEMS_PER_PAGE: z.coerce.number().default(20),
		CHECK_IN_EXPIRATION_TIME: z.coerce.number().default(20),
		DATABASE_URL: z.string(),
		JWT_EXPIRES_IN: z.string().default("10Min"),
		JWT_REFRESH_EXPIRES_IN: z.string().default("7D"),
		REFRESH_TOKEN_NAME: z.string().default("refreshToken"),
		AMQP_URL: z.url().default("amqp://localhost"),
		REDIS_HOST: z.string().default("127.0.0.1"),
		REDIS_PORT: z.coerce.number().default(6379),
		TTL: z.coerce.number().default(60),
		DIRECT_URL: z.string().optional(),
		GOOGLE_CLIENT_ID: z.string().optional(),
		CORS_ORIGINS: z.string().optional(),
		FRONTEND_URL: z.url().default("http://localhost:3000"),
		UPLOAD_DIR: z.string().default("uploads"),
		CRON_TIME_TO_UPDATE_CACHE: z.string().default("0 * * * *"),
		STRIPE_PUBLIC_KEY: z.string(),
		STRIPE_PRIVATE_KEY: z.string(),
		STRIPE_PRICE_ID: z.string(),
		STRIPE_WEBHOOK_SECRET: z.string(),
		DATABASE_PROVIDER: z.enum(["prisma", "sqlite", "mongo"]).default("prisma"),
		DATABASE_URL_MONGO: z.string().optional(),
		SUBSCRIPTION_GATEWAY: z.enum(["stripe", "testing"]).default("stripe"),
		GOOGLE_AUTH_PROVIDER: z.enum(["google", "in-memory"]).default("google"),
	})
	.superRefine((value, ctx) => {
		if (value.DATABASE_PROVIDER === "mongo" && !value.DATABASE_URL_MONGO) {
			ctx.addIssue({
				code: "custom",
				path: ["DATABASE_URL_MONGO"],
				message: "DATABASE_URL_MONGO é obrigatório quando DATABASE_PROVIDER=mongo",
			})
		}
	})
```

Substituir o conteúdo de `apps/backend/src/shared/infra/env/index.ts` (o `z` e o schema inline saem; o restante é idêntico ao atual):

```ts
import { config } from "dotenv"
import { fromError } from "zod-validation-error"
import { envSchema } from "./env-schema"

config({
	quiet: true,
})

const _env = envSchema.safeParse(process.env)
if (!_env.success) {
	const validationError = fromError(_env.error)
	console.error(validationError.toString())
	throw new Error("Invalid environment variables ❌")
}

const env = _env.data

export { env }

export function isDevelopment(): boolean {
	return env.NODE_ENV === "test"
}

export function isProduction(): boolean {
	return env.NODE_ENV === "production"
}
```

- **Step 4: Run test to verify it passes**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/shared/infra/env/env-schema.test.ts`
Expected: PASS (5 testes)

- **Step 5: Add the driver dependency**

Run: `pnpm --filter backend add mongodb`
Expected: `apps/backend/package.json` passa a listar `mongodb` em `dependencies`. Anotar a versão instalada: as tasks seguintes usam `MongoClient`, `ClientSession`, `Collection` e `MongoServerError` desse pacote.

- **Step 6: Add the replica-set service to the compose file**

Em `apps/backend/compose.yaml`, adicionar o serviço `mongodb` após `postgresql`, incluí-lo em `nginx.depends_on` e declarar o volume:

```yaml
  mongodb:
    container_name: "mongodb-dev"
    image: mongo:8
    restart: unless-stopped
    command: ["--replSet", "rs0", "--bind_ip_all"]
    ports:
      - "127.0.0.1:27017:27017"
    volumes:
      - mongodb_data:/data/db
    healthcheck:
      test:
        - CMD
        - mongosh
        - --quiet
        - --eval
        - "try { rs.status().ok } catch (e) { rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: 'localhost:27017' }] }).ok }"
      interval: 5s
      timeout: 10s
      retries: 20
      start_period: 5s
```

```yaml
    depends_on:
      - postgresql
      - mongodb
      - rabbitmq
      - redis
```

```yaml
volumes:
  postgresql_data:
  mongodb_data:
  redis_data:
```

- **Step 7: Add the variable to the env files and the integration script**

Acrescentar a linha abaixo em `apps/backend/.env.example` e em `apps/backend/.env.test` (se o `.env` local de desenvolvimento for usado para rodar a API com o provider `mongo`, acrescentar também lá):

```
DATABASE_URL_MONGO=mongodb://localhost:27017/test?replicaSet=rs0&directConnection=true
```

Em `apps/backend/package.json`, na seção `scripts`, ao lado de `test:e2e:prisma`:

```json
"test:e2e:mongo": "vitest run --config ./test/vite.config.integration.ts mongo",
```

- **Step 8: Verify the compose service starts as a replica set**

Run: `cd apps/backend && docker compose -f compose.yaml config --quiet`
Expected: saída vazia, exit code 0 (compose válido)

Run: `cd apps/backend && docker compose -f compose.yaml up -d mongodb`
Expected: container `mongodb-dev` criado

Run: `docker inspect --format '{{.State.Health.Status}}' mongodb-dev`
Expected: `healthy` (repetir até o healthcheck inicializar o replica set; pode levar alguns segundos)

Run: `docker exec mongodb-dev mongosh --quiet --eval "rs.status().ok"`
Expected: `1`

- **Step 9: Commit** *(only when `workflow.auto_commit` is true — the implementer's prompt says so; otherwise skip this step and report the files instead.)*

```bash
git add apps/backend/src/shared/infra/env apps/backend/package.json apps/backend/compose.yaml apps/backend/.env.example apps/backend/.env.test pnpm-lock.yaml
git commit -m "feat(backend): configuração do provider mongo, driver e replica set no compose"
```

## Critérios de Sucesso

- AC-04 [unit]: WHEN `DATABASE_PROVIDER` é inválido THEN a API não sobe
- FR-001: `DATABASE_PROVIDER` aceita `prisma`, `sqlite` (legado) e `mongo`; `mongo` sem `DATABASE_URL_MONGO` também é erro de configuração (provado pelos testes `FR-001` e `AC-04` de `env-schema.test.ts`).
- FR-003: sem `DATABASE_PROVIDER` o valor resolvido é `prisma` (teste `FR-003`).
- FR-016: `docker compose up -d mongodb` sobe um MongoDB em replica set `rs0` com transações possíveis (`rs.status().ok` igual a `1` após o healthcheck).
- O pacote `mongodb` está em `dependencies` do backend e o script `test:e2e:mongo` existe.
