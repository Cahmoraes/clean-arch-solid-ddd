import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import type { AdminUser } from "@/features/admin/api/use-users"
import { DetailsTab } from "./details-tab"

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
		render(<DetailsTab user={buildUser()} />)
		expect(screen.getByText("João Damasio")).toBeInTheDocument()
		expect(screen.getByText("joao@example.com")).toBeInTheDocument()
		expect(screen.getByText("usr_4821kx")).toBeInTheDocument()
	})

	test("exibe o rótulo de status traduzido", () => {
		render(<DetailsTab user={buildUser({ status: "suspended" })} />)
		expect(screen.getByText("Inativo")).toBeInTheDocument()
	})

	test("exibe fallback gracioso para último acesso ausente", () => {
		render(<DetailsTab user={buildUser()} />)
		expect(screen.getByText("Sem registro")).toBeInTheDocument()
	})
})
