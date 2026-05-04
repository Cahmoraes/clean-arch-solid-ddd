import { Gym } from "@/gym/domain/gym"
import { InMemoryGymRepository } from "@/shared/infra/database/repository/in-memory/in-memory-gym-repository"
import { env } from "@/shared/infra/env"

function makeGym(overrides?: Partial<Parameters<typeof Gym.create>[0]>): Gym {
	return Gym.create({
		id: "gym-id-1",
		title: "Academia Base",
		cnpj: "11.222.333/0001-81",
		latitude: 0,
		longitude: 0,
		...overrides,
	}).forceSuccess().value
}

describe("InMemoryGymRepository", () => {
	let sut: InMemoryGymRepository

	beforeEach(() => {
		sut = new InMemoryGymRepository()
	})

	describe("fetchGyms", () => {
		it("deve retornar todas as academias paginadas quando title não for informado", async () => {
			for (let index = 1; index <= env.ITEMS_PER_PAGE + 5; index++) {
				await sut.save(
					makeGym({
						id: `gym-${index}`,
						title: `Academia ${index}`,
					}),
				)
			}

			const result = await sut.fetchGyms({ page: 1 })

			expect(result).toHaveLength(env.ITEMS_PER_PAGE)
			expect(result[0]?.title).toBe("Academia 1")
			expect(result.at(-1)?.title).toBe(`Academia ${env.ITEMS_PER_PAGE}`)
		})

		it("deve retornar apenas academias cujo nome contém o título informado", async () => {
			await sut.save(makeGym({ id: "gym-1", title: "CrossFit Downtown" }))
			await sut.save(makeGym({ id: "gym-2", title: "crossfit Riverside" }))
			await sut.save(makeGym({ id: "gym-3", title: "Pilates Studio" }))

			const result = await sut.fetchGyms({ title: "CrossFit", page: 1 })

			expect(result).toHaveLength(2)
			expect(result.map((gym) => gym.title)).toEqual([
				"CrossFit Downtown",
				"crossfit Riverside",
			])
		})
	})
})
