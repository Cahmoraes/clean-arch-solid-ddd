import { User } from "@/user/domain/user"
import type { RoleTypes } from "@/user/domain/value-object/role"
import type { StatusTypes } from "@/user/domain/value-object/status"
import { UserManagementPolicy } from "./user-management-policy"

function makeUser(props: {
	id: string
	role: RoleTypes
	isSuperAdmin?: boolean
	status?: StatusTypes
}): User {
	return User.restore({
		id: props.id,
		name: "Test User",
		email: `${props.id}@test.com`,
		password: "hashed_password",
		role: props.role,
		status: props.status ?? "activated",
		createdAt: new Date(),
		isSuperAdmin: props.isSuperAdmin ?? false,
	})
}

const root = makeUser({ id: "root", role: "ADMIN", isSuperAdmin: true })
const admin = makeUser({ id: "admin", role: "ADMIN" })
const otherAdmin = makeUser({ id: "other-admin", role: "ADMIN" })
const member = makeUser({ id: "member", role: "MEMBER" })
const otherMember = makeUser({ id: "other-member", role: "MEMBER" })

describe("UserManagementPolicy.canEditProfile", () => {
	test("nega editar a si mesmo (usa-se o perfil próprio)", () => {
		expect(UserManagementPolicy.canEditProfile(admin, admin)).toBe(false)
		expect(UserManagementPolicy.canEditProfile(root, root)).toBe(false)
	})

	test("root edita qualquer um", () => {
		expect(UserManagementPolicy.canEditProfile(root, member)).toBe(true)
		expect(UserManagementPolicy.canEditProfile(root, otherAdmin)).toBe(true)
	})

	test("admin comum edita membro", () => {
		expect(UserManagementPolicy.canEditProfile(admin, member)).toBe(true)
	})

	test("admin comum não edita outro admin nem o root", () => {
		expect(UserManagementPolicy.canEditProfile(admin, otherAdmin)).toBe(false)
		expect(UserManagementPolicy.canEditProfile(admin, root)).toBe(false)
	})

	test("membro não edita ninguém pelo painel", () => {
		expect(UserManagementPolicy.canEditProfile(member, member)).toBe(false)
		expect(UserManagementPolicy.canEditProfile(member, otherMember)).toBe(false)
	})
})

describe("UserManagementPolicy.canChangeStatus", () => {
	test("nega alterar status do super admin", () => {
		expect(UserManagementPolicy.canChangeStatus(root, root)).toBe(false)
		expect(UserManagementPolicy.canChangeStatus(admin, root)).toBe(false)
	})

	test("root altera status de membro e de admin", () => {
		expect(UserManagementPolicy.canChangeStatus(root, member)).toBe(true)
		expect(UserManagementPolicy.canChangeStatus(root, otherAdmin)).toBe(true)
	})

	test("admin comum altera status de membro", () => {
		expect(UserManagementPolicy.canChangeStatus(admin, member)).toBe(true)
	})

	test("admin comum não altera status de outro admin", () => {
		expect(UserManagementPolicy.canChangeStatus(admin, otherAdmin)).toBe(false)
	})

	test("membro não altera status de ninguém", () => {
		expect(UserManagementPolicy.canChangeStatus(member, admin)).toBe(false)
		expect(UserManagementPolicy.canChangeStatus(member, otherMember)).toBe(
			false,
		)
	})

	test("nega alterar o próprio status", () => {
		expect(UserManagementPolicy.canChangeStatus(admin, admin)).toBe(false)
		expect(UserManagementPolicy.canChangeStatus(member, member)).toBe(false)
	})
})

describe("UserManagementPolicy.canChangeRole", () => {
	test("nega alterar role do super admin", () => {
		expect(UserManagementPolicy.canChangeRole(admin, root)).toBe(false)
	})

	test("root altera role de membro e de admin", () => {
		expect(UserManagementPolicy.canChangeRole(root, member)).toBe(true)
		expect(UserManagementPolicy.canChangeRole(root, otherAdmin)).toBe(true)
	})

	test("admin comum não altera role de ninguém", () => {
		expect(UserManagementPolicy.canChangeRole(admin, member)).toBe(false)
		expect(UserManagementPolicy.canChangeRole(admin, otherAdmin)).toBe(false)
	})

	test("root não altera o próprio role", () => {
		expect(UserManagementPolicy.canChangeRole(root, root)).toBe(false)
		const anotherRoot = makeUser({
			id: "root",
			role: "ADMIN",
			isSuperAdmin: true,
		})
		expect(UserManagementPolicy.canChangeRole(root, anotherRoot)).toBe(false)
	})
})
