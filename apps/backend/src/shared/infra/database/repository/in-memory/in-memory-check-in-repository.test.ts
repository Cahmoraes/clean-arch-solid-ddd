import { CheckIn } from "@/check-in/domain/check-in"
import { InMemoryCheckInRepository } from "@/shared/infra/database/repository/in-memory/in-memory-check-in-repository"

function makeCheckIn(
	overrides?: Partial<Parameters<typeof CheckIn.create>[0]>,
): CheckIn {
	return CheckIn.create({
		id: "check-in-id",
		userId: "user-1",
		gymId: "gym-1",
		userLatitude: 0,
		userLongitude: 0,
		...overrides,
	})
}

describe("InMemoryCheckInRepository", () => {
	let sut: InMemoryCheckInRepository

	beforeEach(() => {
		sut = new InMemoryCheckInRepository()
	})

	describe("findMany", () => {
		it("deve retornar apenas check-ins do userId informado", async () => {
			await sut.save(
				makeCheckIn({ id: "check-in-1", userId: "user-1", gymId: "gym-1" }),
			)
			await sut.save(
				makeCheckIn({ id: "check-in-2", userId: "user-2", gymId: "gym-2" }),
			)
			await sut.save(
				makeCheckIn({ id: "check-in-3", userId: "user-1", gymId: "gym-3" }),
			)

			const result = await sut.findMany({ userId: "user-1", page: 1 })

			expect(result.total).toBe(2)
			expect(result.items).toHaveLength(2)
			expect(result.items.map((checkIn) => checkIn.id)).toEqual([
				"check-in-1",
				"check-in-3",
			])
		})

		it("deve retornar apenas check-ins validados quando status for validated", async () => {
			await sut.save(
				makeCheckIn({ id: "pending-1", userId: "user-1", gymId: "gym-1" }),
			)
			await sut.save(
				makeCheckIn({
					id: "validated-1",
					userId: "user-2",
					gymId: "gym-2",
				}),
			)
			const validatedCheckIn = await sut.checkOfById("validated-1")
			validatedCheckIn?.validate()

			const result = await sut.findMany({ page: 1, status: "validated" })

			expect(result.total).toBe(1)
			expect(result.items).toHaveLength(1)
			expect(result.items[0]?.id).toBe("validated-1")
		})

		it("deve retornar todos os check-ins paginados com total correto quando não houver filtros", async () => {
			for (let index = 1; index <= 25; index++) {
				await sut.save(
					makeCheckIn({
						id: `check-in-${index}`,
						userId: `user-${index}`,
						gymId: `gym-${index}`,
					}),
				)
			}

			const result = await sut.findMany({ page: 1 })

			expect(result.total).toBe(25)
			expect(result.items).toHaveLength(sut.ITEMS_PER_PAGE)
			expect(result.items[0]?.id).toBe("check-in-1")
			expect(result.items.at(-1)?.id).toBe("check-in-20")
		})
	})
})
