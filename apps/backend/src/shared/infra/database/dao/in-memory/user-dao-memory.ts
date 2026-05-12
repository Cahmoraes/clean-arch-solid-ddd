import { randomUUID } from "node:crypto"
import ExtendedSet from "@cahmoraes93/extended-set"
import { injectable } from "inversify"
import type {
	FetchUsersData,
	FetchUsersInput,
	FetchUsersOutput,
	UserDAO,
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
		const usersData = this.usersData
			.toArray()
			.slice((input.page - 1) * input.limit, input.page * input.limit)
		return {
			usersData,
			total: this.usersData.size,
		}
	}
}
