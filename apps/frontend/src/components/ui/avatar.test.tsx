import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { Avatar } from "./avatar"

describe("Avatar", () => {
	test("exibe as iniciais derivadas do nome", () => {
		render(<Avatar name="Caique Moraes" />)
		expect(screen.getByText("CM")).toBeInTheDocument()
	})
	test("usa fallback quando não há nome", () => {
		render(<Avatar />)
		expect(screen.getByText("?")).toBeInTheDocument()
	})
})
