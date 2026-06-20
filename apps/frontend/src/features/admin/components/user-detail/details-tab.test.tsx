import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import type { AdminUser } from "@/features/admin/api/use-users"
import { DetailsTab } from "./details-tab"
import type { UserDetailPermissions } from "./use-user-detail-actions"

const noPermissions: UserDetailPermissions = {
	canSuspend: false,
	canActivate: false,
	canPromoteToAdmin: false,
	canDemoteFromAdmin: false,
	canDelete: false,
	isLocked: false,
	canEditProfile: false,
	canChangeStatus: false,
	canChangeRole: false,
}

function buildUser(overrides: Partial<AdminUser> = {}): AdminUser {
	return {
		id: "usr_4821kx",
		name: "João Damasio",
		email: "joao@example.com",
		role: "ADMIN",
		status: "activated",
		createdAt: "2025-01-12T08:00:00.000Z",
		isSuperAdmin: false,
		...overrides,
	}
}

describe("DetailsTab", () => {
	test("exibe nome, e-mail e User ID", () => {
		render(
			<DetailsTab
				user={buildUser()}
				permissions={noPermissions}
				editing={false}
				onStopEdit={() => {}}
			/>,
		)
		expect(screen.getByText("João Damasio")).toBeInTheDocument()
		expect(screen.getByText("joao@example.com")).toBeInTheDocument()
		expect(screen.getByText("usr_4821kx")).toBeInTheDocument()
	})

	test("exibe o rótulo de status traduzido", () => {
		render(
			<DetailsTab
				user={buildUser({ status: "suspended" })}
				permissions={noPermissions}
				editing={false}
				onStopEdit={() => {}}
			/>,
		)
		expect(screen.getByText("Inativo")).toBeInTheDocument()
	})

	test("exibe fallback gracioso para último acesso ausente", () => {
		render(
			<DetailsTab
				user={buildUser()}
				permissions={noPermissions}
				editing={false}
				onStopEdit={() => {}}
			/>,
		)
		expect(screen.getByText("Sem registro")).toBeInTheDocument()
	})
})
