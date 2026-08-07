import {
	Check,
	CircleCheck,
	CircleSlash,
	MoreHorizontal,
	Pencil,
	TriangleAlert,
	X,
} from "lucide-react"
import { describe, expect, test } from "vitest"
import { ACTION_ICON, STATUS_ICON } from "./status-icon"

describe("STATUS_ICON", () => {
	test("mapeia cada tom de status ao ícone lucide correspondente", () => {
		expect(STATUS_ICON.success).toBe(CircleCheck)
		expect(STATUS_ICON.warning).toBe(TriangleAlert)
		expect(STATUS_ICON.danger).toBe(CircleSlash)
	})
})

describe("ACTION_ICON", () => {
	test("mapeia cada ação ao ícone lucide correspondente", () => {
		expect(ACTION_ICON.edit).toBe(Pencil)
		expect(ACTION_ICON.moreActions).toBe(MoreHorizontal)
		expect(ACTION_ICON.approve).toBe(Check)
		expect(ACTION_ICON.reject).toBe(X)
	})
})
