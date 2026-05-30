import type { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { User } from "@/user/domain/user"
import type { RoleTypes } from "@/user/domain/value-object/role"

export interface CreateAndSaveUserProps {
	userRepository: InMemoryUserRepository
	id?: string
	name?: string
	email?: string
	password?: string
	googleId?: string
	role?: RoleTypes
	isSuperAdmin?: boolean
}

function resolvePassword(props: CreateAndSaveUserProps): string | undefined {
	if (props.password !== undefined) return props.password
	if (props.googleId !== undefined) return undefined
	return "any_password"
}

function resolveIsSuperAdmin(
	props: CreateAndSaveUserProps,
	email: string,
): boolean {
	if (props.isSuperAdmin !== undefined) return props.isSuperAdmin
	return email === "admin@admin.com"
}

export async function createAndSaveUser(props: CreateAndSaveUserProps) {
	const userId = props.id ?? "any_user_id"
	const name = props.name ?? "any_name"
	const email = props.email ?? "john@doe.com.br"
	const createdUser = (
		await User.create({
			id: userId,
			name,
			email,
			password: resolvePassword(props),
			googleId: props.googleId,
			role: props.role ?? "MEMBER",
		})
	).force.success().value
	const user = resolveIsSuperAdmin(props, email)
		? User.restore({
				id: createdUser.id,
				name: createdUser.name,
				email: createdUser.email,
				password: createdUser.password,
				googleId: createdUser.googleId,
				role: createdUser.role,
				status: createdUser.status,
				createdAt: createdUser.createdAt,
				updatedAt: createdUser.updatedAt,
				billingCustomerId: createdUser.billingCustomerId,
				isSuperAdmin: true,
			})
		: createdUser
	await props.userRepository.save(user)
	// biome-ignore lint/style/noNonNullAssertion: for testing
	return props.userRepository.users.find((user) => user.id === userId)!
}
