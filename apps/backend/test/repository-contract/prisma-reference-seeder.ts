import type { PrismaClient } from "@/shared/infra/database/generated/prisma/client"

function randomCnpj(): string {
	return Array.from({ length: 14 }, () => Math.floor(Math.random() * 10)).join(
		"",
	)
}

export class PrismaReferenceSeeder {
	private readonly userIds = new Set<string>()
	private readonly gymIds = new Set<string>()
	private readonly planIds = new Set<string>()

	constructor(private readonly prisma: PrismaClient) {}

	public async ensureUsers(ids: readonly string[]): Promise<void> {
		for (const id of ids) {
			await this.prisma.user.create({
				data: {
					id,
					name: "Contract Reference",
					email: `${id}@reference.test`,
					role: "MEMBER",
					status: "activated",
				},
			})
			this.userIds.add(id)
		}
	}

	public async ensureGyms(ids: readonly string[]): Promise<void> {
		for (const id of ids) {
			await this.prisma.gym.create({
				data: {
					id,
					cnpj: randomCnpj(),
					title: "Contract Reference Gym",
					latitude: -23.5505,
					longitude: -46.6333,
					status: "activated",
				},
			})
			this.gymIds.add(id)
		}
	}

	public async ensurePlans(ids: readonly string[]): Promise<void> {
		for (const id of ids) {
			await this.prisma.plan.create({
				data: {
					id,
					name: "Contract Reference Plan",
					price_cents: 1000,
					billing_period: "monthly",
					tagline: "reference",
					features: [],
					is_active: true,
				},
			})
			this.planIds.add(id)
		}
	}

	public async cleanup(): Promise<void> {
		const userIds = [...this.userIds]
		const gymIds = [...this.gymIds]
		const planIds = [...this.planIds]
		await this.prisma.userActivityEvent.deleteMany({
			where: { userId: { in: userIds } },
		})
		await this.prisma.userNotification.deleteMany({
			where: { userId: { in: userIds } },
		})
		await this.prisma.notification.deleteMany({
			where: { userId: { in: userIds } },
		})
		await this.prisma.subscription.deleteMany({
			where: {
				OR: [{ user_id: { in: userIds } }, { plan_id: { in: planIds } }],
			},
		})
		await this.prisma.checkIn.deleteMany({
			where: {
				OR: [{ user_id: { in: userIds } }, { gym_id: { in: gymIds } }],
			},
		})
		await this.prisma.plan.deleteMany({ where: { id: { in: planIds } } })
		await this.prisma.gym.deleteMany({ where: { id: { in: gymIds } } })
		await this.prisma.user.deleteMany({ where: { id: { in: userIds } } })
		this.userIds.clear()
		this.gymIds.clear()
		this.planIds.clear()
	}
}
