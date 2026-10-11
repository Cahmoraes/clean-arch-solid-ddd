import { afterEach, beforeEach, describe, expect, it } from "vitest"
import type { GymRepository } from "@/gym/application/repository/gym-repository"
import { Gym } from "@/gym/domain/gym"

export interface GymRepositoryContractContext {
	repository: GymRepository
	newId(): string
	cleanup(): Promise<void>
}

type GymProps = Parameters<typeof Gym.restore>[0]

export function randomCnpj(): string {
	return Array.from({ length: 14 }, () => Math.floor(Math.random() * 10)).join(
		"",
	)
}

export function describeGymRepositoryContract(
	name: string,
	factory: () => Promise<GymRepositoryContractContext>,
): void {
	describe(`GymRepository contract (${name})`, () => {
		let context: GymRepositoryContractContext
		let token: string

		beforeEach(async () => {
			context = await factory()
			token = context.newId().slice(0, 8)
		})

		afterEach(async () => {
			await context.cleanup()
		})

		function buildGym(overrides: Partial<GymProps> = {}): Gym {
			return Gym.restore({
				id: overrides.id ?? context.newId(),
				title: `${token} Gym`,
				description: "Contract gym",
				phone: "+5511999999999",
				address: "Rua do Contrato, 1",
				latitude: -23.5505,
				longitude: -46.6333,
				cnpj: randomCnpj(),
				status: "activated",
				operatingHours: null,
				...overrides,
			})
		}

		it("saves a gym and finds it by id and by CNPJ", async () => {
			const gym = buildGym()

			const saved = await context.repository.save(gym)
			const byId = await context.repository.gymOfId(gym.id)
			const byCnpj = await context.repository.gymOfCNPJ(gym.cnpj)

			expect(saved).toEqual({ id: gym.id })
			expect(byId?.title).toBe(gym.title)
			expect(byId?.cnpj).toBe(gym.cnpj)
			expect(byId?.status).toBe("activated")
			expect(byId?.description).toBe("Contract gym")
			expect(byId?.address).toBe("Rua do Contrato, 1")
			expect(byId?.latitude).toBeCloseTo(-23.5505, 6)
			expect(byId?.longitude).toBeCloseTo(-46.6333, 6)
			expect(byCnpj?.id).toBe(gym.id)
		})

		it("returns null for an unknown id and an unknown CNPJ", async () => {
			expect(await context.repository.gymOfId(context.newId())).toBeNull()
			expect(await context.repository.gymOfCNPJ(randomCnpj())).toBeNull()
		})

		it("update persists the changed title and status", async () => {
			const id = context.newId()
			const cnpj = randomCnpj()
			await context.repository.save(buildGym({ id, cnpj }))

			await context.repository.update(
				buildGym({
					id,
					cnpj,
					title: `${token} Renamed`,
					status: "deactivated",
				}),
			)

			const found = await context.repository.gymOfId(id)
			expect(found?.title).toBe(`${token} Renamed`)
			expect(found?.status).toBe("deactivated")
		})

		it("update of a gym that does not exist rejects", async () => {
			await expect(context.repository.update(buildGym())).rejects.toThrow()
		})

		it("FR-006: gymOfId hides a deactivated gym only when includeInactive is false", async () => {
			const gym = buildGym({ status: "deactivated" })
			await context.repository.save(gym)

			expect(
				await context.repository.gymOfId(gym.id, { includeInactive: false }),
			).toBeNull()
			expect(
				(await context.repository.gymOfId(gym.id, { includeInactive: true }))
					?.id,
			).toBe(gym.id)
			expect((await context.repository.gymOfId(gym.id))?.id).toBe(gym.id)
		})

		it("fetchGyms filters by a case-insensitive title and by includeInactive", async () => {
			const active = buildGym({ title: `${token} Alpha` })
			const other = buildGym({ title: `${token} Beta` })
			const inactive = buildGym({
				title: `${token} Gamma`,
				status: "deactivated",
			})
			await context.repository.save(active)
			await context.repository.save(other)
			await context.repository.save(inactive)

			const all = await context.repository.fetchGyms({
				title: token.toUpperCase(),
				page: 1,
			})
			const onlyActive = await context.repository.fetchGyms({
				title: token.toUpperCase(),
				page: 1,
				includeInactive: false,
			})
			const byName = await context.repository.fetchGyms({
				title: `${token} alpha`,
				page: 1,
			})

			expect(all.total).toBe(3)
			expect(all.items.map((gym) => gym.id).sort()).toEqual(
				[active.id, other.id, inactive.id].sort(),
			)
			expect(onlyActive.total).toBe(2)
			expect(onlyActive.items.map((gym) => gym.id).sort()).toEqual(
				[active.id, other.id].sort(),
			)
			expect(byName.items.map((gym) => gym.id)).toEqual([active.id])
		})

		it("fetchGyms past the last page returns no items but keeps the total", async () => {
			await context.repository.save(buildGym({ title: `${token} One` }))
			await context.repository.save(buildGym({ title: `${token} Two` }))

			const output = await context.repository.fetchGyms({
				title: token,
				page: 999,
			})

			expect(output.items).toEqual([])
			expect(output.total).toBe(2)
		})
	})
}
