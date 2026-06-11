import { describe, expect, test } from "vitest"
import { cn } from "./cn"

describe("cn", () => {
	test("concatena class names em string", () => {
		expect(cn("a", "b", "c")).toBe("a b c")
	})

	test("filtra valores falsy", () => {
		expect(cn("a", false, null, undefined, 0, "b")).toBe("a b")
	})

	test("suporta sintaxe de objeto clsx", () => {
		expect(cn("base", { active: true, disabled: false })).toBe("base active")
	})

	test("resolve conflitos Tailwind via tailwind-merge", () => {
		expect(cn("p-2", "p-4")).toBe("p-4")
		expect(cn("text-sm text-muted-foreground", "text-foreground")).toBe(
			"text-sm text-foreground",
		)
	})

	test("mescla arrays de classes", () => {
		expect(cn(["a", "b"], ["c"])).toBe("a b c")
	})
})
