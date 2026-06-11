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
