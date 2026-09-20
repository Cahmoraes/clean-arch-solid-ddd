import { describe, expect, test } from "vitest"
import {
	DEFAULT_ACTIVITY_PAGE_SIZE,
	getActivityPageSizeFromParam,
	isValidActivityPageSizeParam,
} from "./activity-pagination"

describe("activity-pagination pageSize helpers", () => {
	test.each([
		["10", 10],
		["20", 20],
		["50", 50],
	])("aceita pageSize válido %s", (param, expected) => {
		expect(isValidActivityPageSizeParam(param)).toBe(true)
		expect(getActivityPageSizeFromParam(param)).toBe(expected)
	})

	test.each([
		null,
		"",
		"5",
		"100",
		"abc",
		"20.5",
	])("usa 20 para pageSize ausente ou inválido %s", (param) => {
		expect(isValidActivityPageSizeParam(param)).toBe(false)
		expect(getActivityPageSizeFromParam(param)).toBe(DEFAULT_ACTIVITY_PAGE_SIZE)
	})
})
