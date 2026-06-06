import type {
	ImageProcessor,
	ProcessedImage,
} from "@/gym/application/storage/image-processor"
import type { ImageStorage } from "@/gym/application/storage/image-storage"
import { Gym } from "@/gym/domain/gym"
import { InMemoryGymRepository } from "@/shared/infra/database/repository/in-memory/in-memory-gym-repository"
import { GymNotFoundError } from "../error/gym-not-found-error"
import { InvalidImageError } from "../error/invalid-image-error"
import { SetGymImageUseCase } from "./set-gym-image.usecase"

function makeProcessor(impl?: () => Promise<ProcessedImage>): ImageProcessor {
	return {
		process:
			impl ??
			(async () => ({
				buffer: Buffer.from("webp"),
				extension: "webp",
				contentType: "image/webp",
			})),
	}
}

function makeStorage() {
	const deleted: string[] = []
	let counter = 0
	const storage: ImageStorage = {
		save: async () => ({ key: `gyms/new-${++counter}.webp` }),
		delete: async (key: string) => {
			deleted.push(key)
		},
	}
	return { storage, deleted }
}

describe("SetGymImageUseCase", () => {
	test("processa, grava e persiste a nova imageKey", async () => {
		const gymRepository = new InMemoryGymRepository()
		await gymRepository.save(
			Gym.restore({
				id: "gym-1",
				title: "Academia",
				latitude: 0,
				longitude: 0,
				cnpj: "11.222.333/0001-81",
				address: "Rua A, 1",
			}),
		)
		const { storage } = makeStorage()
		const sut = new SetGymImageUseCase(gymRepository, makeProcessor(), storage)

		const result = await sut.execute({
			gymId: "gym-1",
			fileBuffer: Buffer.from("raw"),
		})

		expect(result.forceSuccess().value.imageKey).toBe("gyms/new-1.webp")
		const found = await gymRepository.gymOfId("gym-1")
		expect(found?.imageKey).toBe("gyms/new-1.webp")
	})

	test("remove a imagem anterior ao substituir", async () => {
		const gymRepository = new InMemoryGymRepository()
		await gymRepository.save(
			Gym.restore({
				id: "gym-1",
				title: "Academia",
				latitude: 0,
				longitude: 0,
				cnpj: "11.222.333/0001-81",
				address: "Rua A, 1",
				imageKey: "gyms/old.webp",
			}),
		)
		const { storage, deleted } = makeStorage()
		const sut = new SetGymImageUseCase(gymRepository, makeProcessor(), storage)

		await sut.execute({ gymId: "gym-1", fileBuffer: Buffer.from("raw") })

		expect(deleted).toContain("gyms/old.webp")
	})

	test("retorna GymNotFoundError quando a academia não existe", async () => {
		const gymRepository = new InMemoryGymRepository()
		const { storage } = makeStorage()
		const sut = new SetGymImageUseCase(gymRepository, makeProcessor(), storage)

		const result = await sut.execute({
			gymId: "inexistente",
			fileBuffer: Buffer.from("raw"),
		})

		expect(result.value).toBeInstanceOf(GymNotFoundError)
	})

	test("retorna InvalidImageError e não grava quando o processamento falha", async () => {
		const gymRepository = new InMemoryGymRepository()
		await gymRepository.save(
			Gym.restore({
				id: "gym-1",
				title: "Academia",
				latitude: 0,
				longitude: 0,
				cnpj: "11.222.333/0001-81",
				address: "Rua A, 1",
			}),
		)
		const { storage, deleted } = makeStorage()
		const failingProcessor = makeProcessor(async () => {
			throw new Error("sharp boom")
		})
		const sut = new SetGymImageUseCase(gymRepository, failingProcessor, storage)

		const result = await sut.execute({
			gymId: "gym-1",
			fileBuffer: Buffer.from("raw"),
		})

		expect(result.value).toBeInstanceOf(InvalidImageError)
		expect(deleted).toHaveLength(0)
		const found = await gymRepository.gymOfId("gym-1")
		expect(found?.imageKey).toBeUndefined()
	})
})
