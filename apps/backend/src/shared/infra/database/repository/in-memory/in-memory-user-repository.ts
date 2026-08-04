import ExtendedSet from "@cahmoraes93/extended-set"
import { injectable } from "inversify"
import type { UserQuery } from "@/user/application/persistence/repository/user-query"
import type { UserRepository } from "@/user/application/persistence/repository/user-repository"
import { User } from "@/user/domain/user"
import type { StatusTypes } from "@/user/domain/value-object/status"

@injectable()
export class InMemoryUserRepository implements UserRepository {
	public users = new ExtendedSet<User>()

	public withTransaction(): UserRepository {
		return this
	}

	public async save(user: User): Promise<void> {
		const userWithId = User.restore({
			id: user.id,
			email: user.email,
			name: user.name,
			password: user.password,
			googleId: user.googleId,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt,
			role: user.role,
			status: user.status,
			billingCustomerId: user.billingCustomerId,
			isSuperAdmin: user.isSuperAdmin,
			deletedAt: user.deletedAt,
		})
		this.users.add(userWithId)
	}

	public async update(user: User): Promise<void> {
		const userOrNull = this.users.find((u) => u.id === user.id)
		if (!userOrNull) return
		this.users.delete(userOrNull)
		this.users.add(user)
	}

	public async get(objectQuery: UserQuery): Promise<User | null> {
		const fields = objectQuery.fields
		return this.users.find((user) => {
			if (user.isDeleted) return false
			return Object.keys(fields).every((field) => {
				return (user as any)[field] === (fields as any)[field]
			})
		})
	}

	public async userOfEmail(email: string): Promise<User | null> {
		return this.users.find((user) => !user.isDeleted && user.email === email)
	}

	public async userOfGoogleId(googleId: string): Promise<User | null> {
		return this.users.find(
			(user) => !user.isDeleted && user.googleId === googleId,
		)
	}

	public async userOfId(id: string): Promise<User | null> {
		return this.users.find((user) => !user.isDeleted && user.id === id)
	}

	public async usersOfIds(ids: string[]): Promise<User[]> {
		return this.users.filter((user) => ids.includes(user.id)).toArray()
	}

	public async updateManyStatus(
		ids: string[],
		status: StatusTypes,
	): Promise<number> {
		const targets = this.users
			.filter((user) => ids.includes(user.id) && user.status !== status)
			.toArray()
		for (const user of targets) {
			applyStatusTransition(user, status)
			await this.update(user)
		}
		return targets.length
	}
}

function applyStatusTransition(user: User, status: StatusTypes): void {
	const transitions: Record<StatusTypes, () => void> = {
		activated: () => user.activate(),
		suspended: () => user.suspend(),
		locked: () => user.lock(),
	}
	transitions[status]()
}
