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
