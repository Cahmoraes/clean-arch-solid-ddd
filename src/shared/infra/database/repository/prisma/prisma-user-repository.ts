import type { PrismaClient } from "@prisma/client"
import type { ITXClientDenyList } from "@prisma/client/runtime/library"
import { inject, injectable } from "inversify"

import { InvalidTransactionInstance } from "@/shared/infra/errors/invalid-transaction-instance-error"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"
import type { UserQuery } from "@/user/application/persistense/repository/user-query"
import type { UserRepository } from "@/user/application/persistense/repository/user-repository"
import { User } from "@/user/domain/user"
import type { RoleTypes } from "@/user/domain/value-object/role"
import type { StatusTypes } from "@/user/domain/value-object/status"

import { isPrismaTransaction } from "../unit-of-work/prisma-unit-of-work"

interface UserData {
	id: string
	name: string
	email: string
	password_hash: string
	created_at: Date
	updated_at: Date
	role: RoleTypes
	status: StatusTypes
	billingCustomerId?: string
}

@injectable()
export class PrismaUserRepository implements UserRepository {
	constructor(
		@inject(SHARED_TYPES.Prisma.Client)
		private readonly prisma:
			| PrismaClient
			| Omit<PrismaClient, ITXClientDenyList>,
	) {}

	public withTransaction<TX extends object>(prismaClient: TX): UserRepository {
		if (isPrismaTransaction(prismaClient)) {
			return new PrismaUserRepository(prismaClient)
		}
		throw new InvalidTransactionInstance(prismaClient)
	}

	public async get(userQuery: UserQuery): Promise<User | null> {
		const userDataOrNull = await this.prisma.user.findFirst({
			where: userQuery.fields,
		})
		if (!userDataOrNull) return null
		return this.restoreUser(userDataOrNull)
	}

	public async userOfId(id: string): Promise<User | null> {
		const userDataOrNull = await this.prisma.user.findUnique({
			where: {
				id,
			},
		})
		if (!userDataOrNull) return null
		return this.restoreUser(userDataOrNull)
	}

	public async userOfEmail(email: string): Promise<User | null> {
		const userDataOrNull = await this.prisma.user.findUnique({
			where: {
				email,
			},
		})
		if (!userDataOrNull) return null
		return this.restoreUser(userDataOrNull)
	}

	private async restoreUser(userData: UserData): Promise<User> {
		return User.restore({
			id: userData.id,
			email: userData.email,
			name: userData.name,
			password: userData.password_hash,
			createdAt: userData.created_at,
			updatedAt: userData.updated_at,
			role: userData.role,
			status: userData.status,
			billingCustomerId: userData.billingCustomerId,
		})
	}

	public async save(user: User): Promise<void> {
		await this.prisma.user.create({
			data: {
				email: user.email,
				name: user.name,
				password_hash: user.password,
				created_at: user.createdAt,
				role: user.role,
				status: user.status,
				billing_customer_id: user.billingCustomerId,
			},
		})
	}

	public async update(user: User): Promise<void> {
		await this.prisma.user.update({
			where: {
				id: user.id!,
			},
			data: {
				email: user.email,
				name: user.name,
				password_hash: user.password,
				created_at: user.createdAt,
				role: user.role,
				status: user.status,
				billing_customer_id: user.billingCustomerId,
				updated_at: user.updatedAt ? user.updatedAt : new Date(),
			},
		})
	}

	public async delete(user: User): Promise<void> {
		await this.prisma.user.delete({
			where: {
				id: user.id!,
			},
		})
	}
}
