import { describe, expect, it } from "vitest"
import { escapeRegExp } from "./escape-regexp"

describe("escapeRegExp", () => {
	it("escapes every regular expression metacharacter", () => {
		expect(escapeRegExp("a.b*c")).toBe("a\\.b\\*c")
	})

	it("produces a pattern that matches the original text literally", () => {
		const text = "(x)+[y]?"
		expect(new RegExp(escapeRegExp(text)).test(text)).toBe(true)
		expect(new RegExp(escapeRegExp("a.b")).test("aXb")).toBe(false)
	})
})
