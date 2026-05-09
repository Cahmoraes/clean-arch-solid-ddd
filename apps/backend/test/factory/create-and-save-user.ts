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
}

function resolvePassword(props: CreateAndSaveUserProps): string | undefined {
	if (props.password !== undefined) return props.password
	if (props.googleId !== undefined) return undefined
	return "any_password"
}

export async function createAndSaveUser(props: CreateAndSaveUserProps) {
	const userId = props.id ?? "any_user_id"
	const name = props.name ?? "any_name"
	const email = props.email ?? "john@doe.com.br"
	const user = (
		await User.create({
			id: userId,
			name,
			email,
			password: resolvePassword(props),
			googleId: props.googleId,
			role: props.role ?? "MEMBER",
		})
	).force.success().value
	await props.userRepository.save(user)
	// biome-ignore lint/style/noNonNullAssertion: for testing
	return props.userRepository.users.find((user) => user.id === userId)!
}
