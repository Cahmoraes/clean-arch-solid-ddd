import { beforeEach, describe, expect, test, vi } from "vitest"

import { SseManager } from "./sse-manager.js"

function makeReply() {
	return {
		raw: {
			write: vi.fn().mockReturnValue(true),
		},
	}
}

describe("SseManager", () => {
	let sut: SseManager

	beforeEach(() => {
		sut = new SseManager()
	})

	test("add() should register a client", () => {
		const reply = makeReply()

		sut.add("user-1", reply)

		expect(sut.clientCount("user-1")).toBe(1)
	})

	test("remove() should unregister a client", () => {
		const reply = makeReply()

		sut.add("user-1", reply)
		sut.remove("user-1", reply)

		expect(sut.clientCount("user-1")).toBe(0)
	})

	test("send() should write SSE message to all clients of a user", () => {
		const reply1 = makeReply()
		const reply2 = makeReply()

		sut.add("user-1", reply1)
		sut.add("user-1", reply2)

		sut.send("user-1", { type: "notification", id: "n-1" })

		const expected = `data: ${JSON.stringify({ type: "notification", id: "n-1" })}\n\n`

		expect(reply1.raw.write).toHaveBeenCalledWith(expected)
		expect(reply2.raw.write).toHaveBeenCalledWith(expected)
	})

	test("send() should remove dead clients that throw on write()", () => {
		const alive = makeReply()
		const dead = {
			raw: {
				write: vi.fn().mockImplementation(() => {
					throw new Error("socket closed")
				}),
			},
		}

		sut.add("user-1", alive)
		sut.add("user-1", dead)

		sut.send("user-1", { type: "ping" })

		expect(sut.clientCount("user-1")).toBe(1)
		expect(alive.raw.write).toHaveBeenCalledOnce()
	})

	test("send() should be a no-op when user has no clients", () => {
		expect(() => {
			sut.send("user-without-clients", { type: "ping" })
		}).not.toThrow()
	})

	test("clientCount() should return 0 for unknown user", () => {
		expect(sut.clientCount("unknown")).toBe(0)
	})
})
