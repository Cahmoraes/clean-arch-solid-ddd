import { randomUUID } from "node:crypto"
import { Gym } from "@/gym/domain/gym"
import { prismaClient } from "@/shared/infra/database/connection/prisma-client"
import { InvalidPersistedGymError } from "@/shared/infra/errors/invalid-persisted-gym-error"
import { PrismaGymRepository } from "./prisma-gym-repository"

describe("PrismaGymRepository operating hours", () => {
	const gymIds: string[] = []
	let sut: PrismaGymRepository

	beforeEach(() => {
		sut = new PrismaGymRepository(prismaClient)
	})

	afterEach(async () => {
		if (gymIds.length === 0) return
		await prismaClient.gym.deleteMany({ where: { id: { in: gymIds } } })
		gymIds.length = 0
	})

	afterAll(async () => {
		await prismaClient.$disconnect()
	})

	async function saveGym(
		operatingHours?: Parameters<typeof Gym.create>[0]["operatingHours"],
	) {
		const id = randomUUID()
		const gym = Gym.create({
			id,
			title: "Academia Prisma",
			cnpj: "11.222.333/0001-81",
			latitude: -23.5,
			longitude: -46.6,
			address: "Rua Prisma, 1",
			...(operatingHours !== undefined ? { operatingHours } : {}),
		}).forceSuccess().value
		await sut.save(gym)
		gymIds.push(id)
		return id
	}

	test("faz round-trip de operatingHours null", async () => {
		const id = await saveGym()

		const restored = await sut.gymOfId(id)

		expect(restored?.operatingHours).toBeNull()
	})

	test("faz round-trip de operatingHours vazio como dia fechado", async () => {
		const id = await saveGym([])

		const restored = await sut.gymOfId(id)

		expect(restored?.operatingHours?.toJSON()).toEqual([])
		expect(restored?.operatingHours?.isEmpty()).toBe(true)
	})

	test("faz round-trip de operatingHours com múltiplos intervalos", async () => {
		const operatingHours = [
			{
				weekday: 1,
				intervals: [
					{ open: "08:00", close: "12:00" },
					{ open: "14:00", close: "18:00" },
				],
			},
			{ weekday: 6, intervals: [{ open: "09:00", close: "13:00" }] },
		]
		const id = await saveGym(operatingHours)

		const restored = await sut.gymOfId(id)

		expect(restored?.operatingHours?.toJSON()).toEqual(operatingHours)
	})

	test("propaga erro explícito quando operating_hours persistido é inválido", async () => {
		const id = await saveGym()
		await prismaClient.gym.update({
			where: { id },
			data: { operating_hours: { invalid: true } },
		})

		await expect(sut.gymOfId(id)).rejects.toBeInstanceOf(
			InvalidPersistedGymError,
		)
	})
})
