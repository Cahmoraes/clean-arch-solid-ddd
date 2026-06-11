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
