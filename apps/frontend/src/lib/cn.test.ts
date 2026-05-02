import { describe, expect, it } from "vitest"
import { cn } from "./cn"

describe("cn", () => {
	it("concatenates string class names", () => {
		expect(cn("a", "b", "c")).toBe("a b c")
	})

	it("filters falsy values", () => {
		expect(cn("a", false, null, undefined, 0, "b")).toBe("a b")
	})

	it("supports clsx object syntax", () => {
		expect(cn("base", { active: true, disabled: false })).toBe("base active")
	})

	it("resolves Tailwind conflicts via tailwind-merge", () => {
		expect(cn("p-2", "p-4")).toBe("p-4")
		expect(cn("text-sm text-stone", "text-near-black")).toBe(
			"text-sm text-near-black",
		)
	})

	it("merges arrays", () => {
		expect(cn(["a", "b"], ["c"])).toBe("a b c")
	})
})
