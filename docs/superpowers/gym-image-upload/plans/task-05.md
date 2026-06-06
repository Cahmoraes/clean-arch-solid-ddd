# Task 5: Portas de imagem + implementações (sharp/fs) + deps + env [FR-005, FR-008]

**Status:** PENDING
**PRD:** `../prd/prd-gym-image-upload.md`
**Spec:** `../specs/gym-image-upload-design.md`
**Depends on:** N/A

## Visão Geral

Define as portas (interfaces) `ImageProcessor` e `ImageStorage` na camada de aplicação e suas implementações de infra: `SharpImageProcessor` (re-encode + cover crop 16:9 → webp 800×450, FR-005/FR-008) e `LocalFileSystemImageStorage` (grava/remove arquivos em um diretório local). Adiciona as dependências e a variável `UPLOAD_DIR`. O isolamento atrás de portas é o que permite trocar o storage no futuro sem tocar nos casos de uso.

## Arquivos

- Create: `apps/backend/src/gym/application/storage/image-processor.ts`
- Create: `apps/backend/src/gym/application/storage/image-storage.ts`
- Create: `apps/backend/src/gym/application/error/invalid-image-error.ts`
- Create: `apps/backend/src/shared/infra/storage/sharp-image-processor.ts`
- Create: `apps/backend/src/shared/infra/storage/local-file-system-image-storage.ts`
- Modify: `apps/backend/src/shared/infra/env/index.ts`
- Test: `apps/backend/src/shared/infra/storage/sharp-image-processor.test.ts`
- Test: `apps/backend/src/shared/infra/storage/local-file-system-image-storage.test.ts`

### Conformidade com as Skills Padrão

- use no-workarounds: re-encode real via sharp (sanitiza/normaliza), sem confiar cegamente no arquivo do cliente.
- use test-antipatterns: testes usam imagem real gerada pelo próprio sharp e diretório temporário real.

## Passos

- **Step 1: Instalar dependências**

Run: `pnpm --filter backend add sharp @fastify/multipart @fastify/static`
Expected: as três entram em `apps/backend/package.json` → `dependencies`.

- **Step 2: Adicionar `UPLOAD_DIR` ao env**

Em `apps/backend/src/shared/infra/env/index.ts`, adicione ao `envSchema` (ex: após `FRONTEND_URL`):

```typescript
	UPLOAD_DIR: z.string().default("uploads"),
```

- **Step 3: Criar as portas (interfaces de aplicação)**

Crie `apps/backend/src/gym/application/storage/image-processor.ts`:

```typescript
export interface ProcessedImage {
	buffer: Buffer
	extension: string
	contentType: string
}

export interface ImageProcessor {
	/**
	 * Re-encoda e recorta (cover) a imagem para o formato e dimensões alvo.
	 * Lança erro quando o input não é uma imagem válida.
	 */
	process(input: Buffer): Promise<ProcessedImage>
}
```

Crie `apps/backend/src/gym/application/storage/image-storage.ts`:

```typescript
export interface StoredImage {
	key: string
}

export interface ImageStorage {
	/** Persiste o binário e retorna a chave relativa (ex: gyms/<uuid>.webp). */
	save(buffer: Buffer, extension: string): Promise<StoredImage>
	/** Remove o binário identificado pela chave. Ignora ausência. */
	delete(key: string): Promise<void>
}
```

- **Step 4: Criar o erro de domínio `InvalidImageError`**

Crie `apps/backend/src/gym/application/error/invalid-image-error.ts`:

```typescript
import { DomainError } from "@/shared/domain/error/domain-error"

export class InvalidImageError extends DomainError {
	public readonly kind = "validation"

	constructor(message = "Invalid image file") {
		super(message)
		this.name = "InvalidImageError"
	}
}
```

- **Step 5: Escrever o teste que falha do `SharpImageProcessor`**

Crie `apps/backend/src/shared/infra/storage/sharp-image-processor.test.ts`:

```typescript
import sharp from "sharp"
import { InvalidImageError } from "@/gym/application/error/invalid-image-error"
import { SharpImageProcessor } from "./sharp-image-processor"

describe("SharpImageProcessor", () => {
	test("re-encoda para webp 800x450 (cover)", async () => {
		const sut = new SharpImageProcessor()
		const input = await sharp({
			create: {
				width: 1200,
				height: 1200,
				channels: 3,
				background: { r: 100, g: 150, b: 200 },
			},
		})
			.png()
			.toBuffer()

		const result = await sut.process(input)

		const meta = await sharp(result.buffer).metadata()
		expect(result.extension).toBe("webp")
		expect(result.contentType).toBe("image/webp")
		expect(meta.format).toBe("webp")
		expect(meta.width).toBe(800)
		expect(meta.height).toBe(450)
	})

	test("lança InvalidImageError para buffer que não é imagem", async () => {
		const sut = new SharpImageProcessor()
		await expect(sut.process(Buffer.from("not-an-image"))).rejects.toBeInstanceOf(
			InvalidImageError,
		)
	})
})
```

- **Step 6: Rodar o teste e confirmar a falha**

Run: `pnpm --filter backend test:run -- -t "SharpImageProcessor"`
Expected: FAIL — módulo `./sharp-image-processor` não existe.

- **Step 7: Implementar `SharpImageProcessor`**

Crie `apps/backend/src/shared/infra/storage/sharp-image-processor.ts`:

```typescript
import { injectable } from "inversify"
import sharp from "sharp"

import { InvalidImageError } from "@/gym/application/error/invalid-image-error"
import type {
	ImageProcessor,
	ProcessedImage,
} from "@/gym/application/storage/image-processor"

const TARGET_WIDTH = 800
const TARGET_HEIGHT = 450
const WEBP_QUALITY = 80

@injectable()
export class SharpImageProcessor implements ImageProcessor {
	public async process(input: Buffer): Promise<ProcessedImage> {
		try {
			const buffer = await sharp(input)
				.resize(TARGET_WIDTH, TARGET_HEIGHT, {
					fit: "cover",
					position: "attention",
				})
				.webp({ quality: WEBP_QUALITY })
				.toBuffer()
			return { buffer, extension: "webp", contentType: "image/webp" }
		} catch {
			throw new InvalidImageError()
		}
	}
}
```

- **Step 8: Rodar o teste e confirmar o sucesso**

Run: `pnpm --filter backend test:run -- -t "SharpImageProcessor"`
Expected: PASS (2 testes).

- **Step 9: Escrever o teste que falha do `LocalFileSystemImageStorage`**

Crie `apps/backend/src/shared/infra/storage/local-file-system-image-storage.test.ts`:

```typescript
import { mkdtemp, readFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { LocalFileSystemImageStorage } from "./local-file-system-image-storage"

describe("LocalFileSystemImageStorage", () => {
	test("salva o arquivo sob gyms/<uuid>.webp e retorna a chave", async () => {
		const baseDir = await mkdtemp(path.join(tmpdir(), "gym-img-"))
		const sut = new LocalFileSystemImageStorage(baseDir)

		const { key } = await sut.save(Buffer.from("conteudo"), "webp")

		expect(key).toMatch(/^gyms\/[0-9a-f-]+\.webp$/)
		const saved = await readFile(path.join(baseDir, key))
		expect(saved.toString()).toBe("conteudo")
	})

	test("remove o arquivo pela chave", async () => {
		const baseDir = await mkdtemp(path.join(tmpdir(), "gym-img-"))
		const sut = new LocalFileSystemImageStorage(baseDir)
		const { key } = await sut.save(Buffer.from("x"), "webp")

		await sut.delete(key)

		await expect(readFile(path.join(baseDir, key))).rejects.toThrow()
	})

	test("delete ignora chave fora do diretório base (path traversal)", async () => {
		const baseDir = await mkdtemp(path.join(tmpdir(), "gym-img-"))
		const sut = new LocalFileSystemImageStorage(baseDir)
		await expect(sut.delete("../../etc/passwd")).resolves.toBeUndefined()
	})
})
```

- **Step 10: Rodar o teste e confirmar a falha**

Run: `pnpm --filter backend test:run -- -t "LocalFileSystemImageStorage"`
Expected: FAIL — módulo não existe.

- **Step 11: Implementar `LocalFileSystemImageStorage`**

Crie `apps/backend/src/shared/infra/storage/local-file-system-image-storage.ts`:

```typescript
import { randomUUID } from "node:crypto"
import { mkdir, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { injectable } from "inversify"

import type {
	ImageStorage,
	StoredImage,
} from "@/gym/application/storage/image-storage"
import { env } from "@/shared/infra/env"

const GYMS_SUBDIR = "gyms"

@injectable()
export class LocalFileSystemImageStorage implements ImageStorage {
	constructor(private readonly baseDir: string = env.UPLOAD_DIR) {}

	public async save(buffer: Buffer, extension: string): Promise<StoredImage> {
		const fileName = `${randomUUID()}.${extension}`
		const key = `${GYMS_SUBDIR}/${fileName}`
		const absoluteDir = path.join(this.baseDir, GYMS_SUBDIR)
		await mkdir(absoluteDir, { recursive: true })
		await writeFile(path.join(absoluteDir, fileName), buffer)
		return { key }
	}

	public async delete(key: string): Promise<void> {
		const root = path.resolve(this.baseDir)
		const absolutePath = path.resolve(root, key)
		if (!absolutePath.startsWith(root + path.sep)) return
		await rm(absolutePath, { force: true })
	}
}
```

- **Step 12: Rodar todos os testes de storage + tipos + lint + commit**

Run: `pnpm --filter backend test:run -- -t "LocalFileSystemImageStorage"`
Expected: PASS (3 testes).

Run: `pnpm --filter backend tsc:check`
Expected: zero erros.

Run: `pnpm --filter backend biome:fix`
Expected: zero problemas.

```bash
git add apps/backend/package.json apps/backend/src/gym/application/storage apps/backend/src/gym/application/error/invalid-image-error.ts apps/backend/src/shared/infra/storage apps/backend/src/shared/infra/env/index.ts
git commit -m "feat(gym): add image ports + sharp/fs implementations + UPLOAD_DIR env"
```

## Critérios de Sucesso

- `ImageProcessor`/`ImageStorage` definidos; `SharpImageProcessor` produz webp 800×450 e falha com `InvalidImageError` para input inválido. [FR-005]
- `LocalFileSystemImageStorage` grava sob `gyms/<uuid>.webp`, remove pela chave e ignora path traversal. [FR-008]
- `UPLOAD_DIR` no env (default `uploads`). Testes, `tsc:check` e `biome:fix` sem problemas.
