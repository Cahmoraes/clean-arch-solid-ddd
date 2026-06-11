# Task 7: Plugins Fastify (multipart + static) + guard do rawBody [FR-005, FR-014]

**Status:** DONE
**PRD:** `../prd/prd-gym-image-upload.md`
**Spec:** `../specs/gym-image-upload-design.md`
**Depends on:** task-05

## Visão Geral

Registra `@fastify/multipart` (limite 5MB, 1 arquivo — FR-005) e `@fastify/static` (serve `UPLOAD_DIR` em `/uploads` — FR-014) no `FastifyAdapter`, e ajusta o hook `preParsing` (`setupRawBody`) para NÃO consumir o corpo de requisições `multipart/form-data` (senão o upload quebra). Plugins são registrados em `initialize()`, que roda em `server.prepare()` antes do registro de rotas dos controllers.

## Arquivos

- Modify: `apps/backend/src/shared/infra/server/fastify-adapter.ts`
- Modify: `apps/backend/.gitignore`
- Test: `apps/backend/src/shared/infra/server/static-uploads.business-flow-test.ts`

### Conformidade com as Skills Padrão

- use no-workarounds: guard real do hook por content-type, sem desabilitar o hook globalmente.

## Passos

- **Step 1: Escrever o teste que falha (serving estático)**

Crie `apps/backend/src/shared/infra/server/static-uploads.business-flow-test.ts`:

```typescript
import { mkdir, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import request from "supertest"

import { serverBuild } from "@/bootstrap/server-build"
import { env } from "@/shared/infra/env"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"

describe("Serving estático de uploads", () => {
	let fastifyServer: FastifyAdapter
	const fileName = "test-static.webp"
	const relativeKey = `gyms/${fileName}`
	const absoluteDir = path.join(path.resolve(env.UPLOAD_DIR), "gyms")

	beforeEach(async () => {
		await mkdir(absoluteDir, { recursive: true })
		await writeFile(path.join(absoluteDir, fileName), Buffer.from("imagem-fake"))
		fastifyServer = await serverBuild()
		await fastifyServer.ready()
	})

	afterEach(async () => {
		await rm(path.join(absoluteDir, fileName), { force: true })
		await fastifyServer.close()
	})

	test("serve um arquivo existente em /uploads", async () => {
		const response = await request(fastifyServer.server).get(
			`/uploads/${relativeKey}`,
		)
		expect(response.status).toBe(200)
		expect(response.text).toBe("imagem-fake")
	})

	test("retorna 404 para arquivo inexistente", async () => {
		const response = await request(fastifyServer.server).get(
			"/uploads/gyms/missing.webp",
		)
		expect(response.status).toBe(404)
	})
})
```

- **Step 2: Rodar o teste e confirmar a falha**

Run: `pnpm --filter backend test:business-flow -- -t "Serving estático de uploads"`
Expected: FAIL — rota `/uploads/*` não registrada (404 no primeiro teste, ou erro).

- **Step 3: Importar os plugins no `FastifyAdapter`**

Em `apps/backend/src/shared/infra/server/fastify-adapter.ts`, adicione os imports junto aos demais do topo:

```typescript
import { mkdirSync } from "node:fs"
import path from "node:path"
import fastifyMultipart from "@fastify/multipart"
import fastifyStatic from "@fastify/static"
```

> `Readable` já é importado de `node:stream` no topo do arquivo; mantenha.

- **Step 4: Registrar os plugins em `initialize()`**

Em `initialize()`, adicione as duas chamadas ao final:

```typescript
	private async initialize(): Promise<void> {
		void this.setupErrorHandler()
		await this.setupCORS()
		this.setupRawBody()
		this.setupResponseValidation()
		await this.setupRateLimit()
		await this.setupMultipart()
		await this.setupStaticFiles()
	}
```

E adicione os dois métodos privados (ex: logo após `setupRateLimit`):

```typescript
	private async setupMultipart(): Promise<void> {
		await this._server.register(fastifyMultipart, {
			limits: { fileSize: 5 * 1024 * 1024, files: 1 },
		})
	}

	private async setupStaticFiles(): Promise<void> {
		const root = path.resolve(env.UPLOAD_DIR)
		mkdirSync(root, { recursive: true })
		await this._server.register(fastifyStatic, {
			root,
			prefix: "/uploads/",
		})
	}
```

- **Step 5: Proteger o hook `setupRawBody` para pular multipart**

Substitua o método `setupRawBody` por:

```typescript
	private setupRawBody(): void {
		this._server.addHook(
			"preParsing",
			async (request: FastifyRequest, _reply: FastifyReply, payload) => {
				const contentType = request.headers["content-type"] ?? ""
				if (contentType.includes("multipart/form-data")) {
					return payload
				}
				const chunks: Buffer[] = []
				for await (const chunk of payload as AsyncIterable<Buffer | string>) {
					chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
				}
				const body = Buffer.concat(chunks)
				request.rawBody = body.toString("utf8")
				return Readable.from(body) as NodeJS.ReadableStream
			},
		)
	}
```

- **Step 6: Ignorar o diretório de uploads no git**

Em `apps/backend/.gitignore`, adicione a linha (se ainda não existir):

```
uploads/
```

- **Step 7: Rodar o teste e confirmar o sucesso**

Run: `pnpm --filter backend test:business-flow -- -t "Serving estático de uploads"`
Expected: PASS (2 testes).

- **Step 8: Tipos + lint + commit**

Run: `pnpm --filter backend tsc:check`
Expected: zero erros.

Run: `pnpm --filter backend biome:fix`
Expected: zero problemas.

```bash
git add apps/backend/src/shared/infra/server/fastify-adapter.ts apps/backend/.gitignore apps/backend/src/shared/infra/server/static-uploads.business-flow-test.ts
git commit -m "feat(server): register multipart + static plugins and guard rawBody hook"
```

## Critérios de Sucesso

- `@fastify/multipart` (5MB, 1 arquivo) e `@fastify/static` (`/uploads`) registrados em `initialize()`. [FR-005, FR-014]
- Hook `setupRawBody` não consome corpos multipart.
- Business-flow de serving estático passa; `tsc:check` e `biome:fix` sem problemas.
