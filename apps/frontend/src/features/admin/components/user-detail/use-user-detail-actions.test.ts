import { describe, expect, test } from "vitest"
import type { AdminUser } from "@/features/admin/api/use-users"
import { resolvePermissions } from "./use-user-detail-actions"

type Current = { id: string; role: "ADMIN" | "MEMBER"; isSuperAdmin?: boolean }

function target(overrides: Partial<AdminUser> = {}): AdminUser {
	return {
		id: "target",
		name: "Target",
		email: "target@test.com",
		role: "MEMBER",
		status: "activated",
		isSuperAdmin: false,
		createdAt: "2025-01-01T00:00:00.000Z",
		...overrides,
	}
}

const root: Current = { id: "root", role: "ADMIN", isSuperAdmin: true }
const admin: Current = { id: "admin", role: "ADMIN", isSuperAdmin: false }

describe("resolvePermissions — canEditProfile", () => {
	test("admin comum pode editar perfil de membro", () => {
		expect(resolvePermissions(target(), admin).canEditProfile).toBe(true)
	})

	test("admin comum não pode editar perfil de outro admin", () => {
		expect(
			resolvePermissions(target({ id: "a2", role: "ADMIN" }), admin)
				.canEditProfile,
		).toBe(false)
	})

	test("root pode editar perfil de admin", () => {
		expect(
			resolvePermissions(target({ id: "a2", role: "ADMIN" }), root)
				.canEditProfile,
		).toBe(true)
	})

	test("ninguém edita a si mesmo pelo painel", () => {
		expect(
			resolvePermissions(target({ id: "admin" }), admin).canEditProfile,
		).toBe(false)
	})

	test("admin comum não pode editar perfil de super admin", () => {
		expect(
			resolvePermissions(
				target({ id: "root2", role: "ADMIN", isSuperAdmin: true }),
				admin,
			).canEditProfile,
		).toBe(false)
	})

	test("sem currentUser retorna false", () => {
		expect(resolvePermissions(target(), null).canEditProfile).toBe(false)
	})
})

describe("resolvePermissions — canChangeStatus", () => {
	test("admin comum altera status de membro", () => {
		expect(resolvePermissions(target(), admin).canChangeStatus).toBe(true)
	})

	test("admin comum não altera status de outro admin", () => {
		expect(
			resolvePermissions(target({ id: "a2", role: "ADMIN" }), admin)
				.canChangeStatus,
		).toBe(false)
	})

	test("root altera status de qualquer usuário não-root", () => {
		expect(
			resolvePermissions(target({ id: "a2", role: "ADMIN" }), root)
				.canChangeStatus,
		).toBe(true)
	})

	test("status do super admin é imune", () => {
		expect(
			resolvePermissions(
				target({ id: "root2", role: "ADMIN", isSuperAdmin: true }),
				root,
			).canChangeStatus,
		).toBe(false)
	})

	test("ninguém altera o próprio status pelo painel", () => {
		expect(
			resolvePermissions(target({ id: "admin" }), admin).canChangeStatus,
		).toBe(false)
	})
})

describe("resolvePermissions — canChangeRole", () => {
	test("admin comum não pode alterar role", () => {
		expect(resolvePermissions(target(), admin).canChangeRole).toBe(false)
	})

	test("root pode alterar role de membro", () => {
		expect(resolvePermissions(target(), root).canChangeRole).toBe(true)
	})

	test("role do super admin é imune mesmo para root", () => {
		expect(
			resolvePermissions(
				target({ id: "root2", role: "ADMIN", isSuperAdmin: true }),
				root,
			).canChangeRole,
		).toBe(false)
	})

	test("root não altera a própria role pelo painel", () => {
		expect(
			resolvePermissions(target({ id: "root", isSuperAdmin: true }), root)
				.canChangeRole,
		).toBe(false)
	})
})

describe("resolvePermissions — tolerância a isSuperAdmin ausente", () => {
	test("isSuperAdmin ausente no currentUser é tratado como false", () => {
		const adminWithoutFlag: Current = { id: "admin2", role: "ADMIN" }
		expect(resolvePermissions(target(), adminWithoutFlag).canEditProfile).toBe(
			true,
		)
	})

	test("isSuperAdmin ausente no target é tratado como false", () => {
		const targetWithoutFlag = target({ isSuperAdmin: undefined })
		expect(resolvePermissions(targetWithoutFlag, root).canEditProfile).toBe(
			true,
		)
	})
})
