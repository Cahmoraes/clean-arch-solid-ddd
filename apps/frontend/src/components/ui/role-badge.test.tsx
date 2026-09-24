import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { RoleBadge } from "./role-badge"

const ADMIN = "ADMIN" as const
const MEMBER = "MEMBER" as const

describe("RoleBadge", () => {
	test("exibe Admin para role ADMIN", () => {
		render(<RoleBadge role={ADMIN} />)
		expect(screen.getByText("Admin")).toBeInTheDocument()
	})
	test("exibe Membro para role MEMBER", () => {
		render(<RoleBadge role={MEMBER} />)
		expect(screen.getByText("Membro")).toBeInTheDocument()
	})
})

describe("RoleBadge — direção Noite neon", () => {
	test("Admin usa magenta suave (primary translúcido)", () => {
		render(<RoleBadge role={ADMIN} />)
		expect(screen.getByText("Admin")).toHaveClass(
			"border-primary/40",
			"bg-primary/15",
		)
	})

	test("Membro permanece neutro", () => {
		render(<RoleBadge role={MEMBER} />)
		expect(screen.getByText("Membro")).toHaveClass(
			"bg-surface-2",
			"border-border",
		)
	})
})
