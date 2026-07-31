import { describe, expect, test } from "vitest"
import { GymAlreadyActivatedError } from "../error/gym-already-activated-error"
import { GymAlreadyDeactivatedError } from "../error/gym-already-deactivated-error"
import { GymStatusFactory } from "./gym-status"

describe("GymStatus", () => {
	test("uma academia com status ativado tem type 'activated'", () => {
		const gym = { _changeStatus: () => undefined } as unknown as Parameters<
			typeof GymStatusFactory.create
		>[0]
		const status = GymStatusFactory.create(gym, "activated")
		expect(status.type).toBe("activated")
	})

	test("deactivate() em status ativado retorna sucesso e muda o gym para 'deactivated'", () => {
		let changedTo: string | undefined
		const gym = {
			_changeStatus(newStatus: { type: string }) {
				changedTo = newStatus.type
			},
		} as unknown as Parameters<typeof GymStatusFactory.create>[0]
		const status = GymStatusFactory.create(gym, "activated")
		const result = status.deactivate()
		expect(result.isSuccess()).toBe(true)
		expect(changedTo).toBe("deactivated")
	})

	test("deactivate() em status já desativado retorna failure(GymAlreadyDeactivatedError)", () => {
		const gym = { _changeStatus: () => undefined } as unknown as Parameters<
			typeof GymStatusFactory.create
		>[0]
		const status = GymStatusFactory.create(gym, "deactivated")
		const result = status.deactivate()
		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toBeInstanceOf(
			GymAlreadyDeactivatedError,
		)
	})

	test("activate() em status desativado retorna sucesso e muda o gym para 'activated'", () => {
		let changedTo: string | undefined
		const gym = {
			_changeStatus(newStatus: { type: string }) {
				changedTo = newStatus.type
			},
		} as unknown as Parameters<typeof GymStatusFactory.create>[0]
		const status = GymStatusFactory.create(gym, "deactivated")
		const result = status.activate()
		expect(result.isSuccess()).toBe(true)
		expect(changedTo).toBe("activated")
	})

	test("activate() em status já ativado retorna failure(GymAlreadyActivatedError)", () => {
		const gym = { _changeStatus: () => undefined } as unknown as Parameters<
			typeof GymStatusFactory.create
		>[0]
		const status = GymStatusFactory.create(gym, "activated")
		const result = status.activate()
		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toBeInstanceOf(GymAlreadyActivatedError)
	})
})
