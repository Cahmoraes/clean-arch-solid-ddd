import { describe, expect, it } from "vitest"
import { EXCHANGES } from "./exchanges"

describe("EXCHANGES", () => {
	it("should include NOTIFICATION_BROADCAST", () => {
		expect(EXCHANGES.NOTIFICATION_BROADCAST).toBe("notificationBroadcast")
	})
})
