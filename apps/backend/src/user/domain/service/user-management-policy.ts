import type { User } from "@/user/domain/user"

/**
 * Regra de autorização para gestão de usuários por administradores.
 * Pura: depende apenas das entidades; sem I/O. Fail-closed por padrão.
 *
 * - Root (isSuperAdmin) pode gerenciar todos.
 * - Admin comum gerencia apenas membros (MEMBER), nunca outros admins.
 * - Alteração de role é exclusiva do root.
 * - O super admin é imune a alteração de status/role.
 * - Ninguém gerencia a si mesmo pelo painel (auto-edição é via perfil próprio).
 */
export class UserManagementPolicy {
	private static isSelf(requester: User, target: User): boolean {
		return requester.id === target.id
	}

	private static isRoot(user: User): boolean {
		return user.isSuperAdmin
	}

	private static canManageMember(requester: User, target: User): boolean {
		return requester.role === "ADMIN" && target.role === "MEMBER"
	}

	public static canEditProfile(requester: User, target: User): boolean {
		if (UserManagementPolicy.isSelf(requester, target)) return false
		if (UserManagementPolicy.isRoot(requester)) return true
		if (UserManagementPolicy.isRoot(target)) return false
		return UserManagementPolicy.canManageMember(requester, target)
	}

	public static canChangeStatus(requester: User, target: User): boolean {
		if (UserManagementPolicy.isRoot(target)) return false
		if (UserManagementPolicy.isSelf(requester, target)) return false
		if (UserManagementPolicy.isRoot(requester)) return true
		return UserManagementPolicy.canManageMember(requester, target)
	}

	public static canChangeRole(requester: User, target: User): boolean {
		if (UserManagementPolicy.isRoot(target)) return false
		if (UserManagementPolicy.isSelf(requester, target)) return false
		return UserManagementPolicy.isRoot(requester)
	}
}
