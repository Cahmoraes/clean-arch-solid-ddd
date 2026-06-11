import { randomUUID } from "node:crypto"
import ExtendedSet from "@cahmoraes93/extended-set"
import { injectable } from "inversify"
import type {
	FetchUsersData,
	FetchUsersInput,
	FetchUsersOutput,
	UserDAO,
	UserStatsOutput,
} from "@/user/application/persistence/dao/user-dao"
import type { RoleTypes } from "@/user/domain/value-object/role"
import {
	type StatusTypes,
	StatusTypes as UserStatusTypes,
} from "@/user/domain/value-object/status"

export interface CreateUserInput {
	id?: string
	email?: string
	name?: string
	role?: RoleTypes
	status?: StatusTypes
	createdAt?: string
	deletedAt?: string | null
}

const USER_ROLES: RoleTypes[] = ["ADMIN", "MEMBER"]
const USER_STATUSES: StatusTypes[] = [
	UserStatusTypes.ACTIVATED,
	UserStatusTypes.SUSPENDED,
]

function pickRandomItem<T>(items: readonly T[]): T {
	return items[Math.floor(Math.random() * items.length)]
}

function createRandomSuffix(): string {
	return Math.random().toString(36).slice(2, 8)
}

@injectable()
export class UserDAOMemory implements UserDAO {
	public usersData: ExtendedSet<Required<CreateUserInput>>

	constructor() {
		this.usersData = new ExtendedSet()
	}

	public bulkCreateFakeUsers(quantity: number): void {
		for (let i = 0; i < quantity; i++) {
			this.createFakeUser()
		}
	}

	public createFakeUser(createUserInput?: CreateUserInput): FetchUsersData {
		const randomSuffix = createRandomSuffix()
		const fakeUser = {
			id: randomUUID(),
			role: pickRandomItem(USER_ROLES),
			status: pickRandomItem(USER_STATUSES),
			createdAt: new Date().toISOString(),
			name: `User ${randomSuffix}`,
			email: `user_${randomSuffix}@test.com`,
			deletedAt: null,
			...createUserInput,
		}
		this.usersData.add(fakeUser)
		return fakeUser
	}

	public clear(): void {
		this.usersData.clear()
	}

	public async fetchAndCountUsers(
		input: FetchUsersInput,
	): Promise<FetchUsersOutput> {
		const allUsers = this.usersData.toArray().filter((u) => u.deletedAt == null)
		let filtered = input.query
			? allUsers.filter(
					(u) =>
						u.name.toLowerCase().includes(input.query?.toLowerCase() ?? "") ||
						u.email.toLowerCase().includes(input.query?.toLowerCase() ?? ""),
				)
			: allUsers

		if (input.role) {
			filtered = filtered.filter((u) => u.role === input.role)
		}

		if (input.status === "active") {
			filtered = filtered.filter((u) => u.status === UserStatusTypes.ACTIVATED)
		} else if (input.status === "inactive") {
			filtered = filtered.filter((u) => u.status === UserStatusTypes.SUSPENDED)
		}

		const usersData = filtered
			.slice((input.page - 1) * input.limit, input.page * input.limit)
			.map((u) => ({
				id: u.id,
				email: u.email,
				name: u.name,
				role: u.role,
				status: u.status,
				createdAt: u.createdAt,
			}))
		return {
			usersData,
			total: filtered.length,
		}
	}

	public async countUserStats(): Promise<UserStatsOutput> {
		const all = this.usersData.toArray().filter((u) => u.deletedAt == null)
		return {
			total: all.length,
			members: all.filter((u) => u.role === "MEMBER").length,
			admins: all.filter((u) => u.role === "ADMIN").length,
			active: all.filter((u) => u.status === UserStatusTypes.ACTIVATED).length,
			inactive: all.filter((u) => u.status === UserStatusTypes.SUSPENDED)
				.length,
		}
	}
}
