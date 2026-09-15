import { describe, expect, test } from "vitest"
import { Gym } from "../gym.js"
import { InvalidOperatingHoursError } from "./errors/invalid-operating-hours-error.js"
import { OperatingHours, TimeInterval } from "./spec-gym-dates.js"

describe("OperatingHours", () => {
	test("deve rejeitar open >= close", () => {
		const result = OperatingHours.create([
			{ weekday: 1, intervals: [{ open: "10:00", close: "09:00" }] },
		])
		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(InvalidOperatingHoursError)
	})

	test("deve rejeitar sobreposição intra-dia", () => {
		const result = OperatingHours.create([
			{
				weekday: 1,
				intervals: [
					{ open: "08:00", close: "12:00" },
					{ open: "11:00", close: "14:00" },
				],
			},
		])
		expect(result.isFailure()).toBe(true)
	})

	test("deve aceitar múltiplos intervalos não sobrepostos e calcular isOpenAt", () => {
		const hours = OperatingHours.create([
			{
				weekday: 1,
				intervals: [
					{ open: "08:00", close: "12:00" },
					{ open: "14:00", close: "18:00" },
				],
			},
		]).forceSuccess().value
		const date = new Date("2026-09-14T13:00:00.000Z")
		expect(hours.isOpenAt(date, "America/Sao_Paulo")).toBe(true)
	})

	test("deve rejeitar HH:mm inválido", () => {
		const cases = [
			{ open: "24:00", close: "25:00" },
			{ open: "8:00", close: "12:00" },
			{ open: "08:60", close: "12:00" },
			{ open: "ab:cd", close: "12:00" },
		]
		for (const interval of cases) {
			const result = TimeInterval.create(interval)
			expect(result.isFailure()).toBe(true)
		}
		const result = OperatingHours.create([
			{ weekday: 1, intervals: [{ open: "08:60", close: "12:00" }] },
		])
		expect(result.isFailure()).toBe(true)
	})

	test("deve rejeitar weekday fora de 0-6", () => {
		expect(
			OperatingHours.create([
				{ weekday: -1, intervals: [{ open: "08:00", close: "12:00" }] },
			]).isFailure(),
		).toBe(true)
		expect(
			OperatingHours.create([
				{ weekday: 7, intervals: [{ open: "08:00", close: "12:00" }] },
			]).isFailure(),
		).toBe(true)
		expect(
			OperatingHours.create([
				{ weekday: 1.5, intervals: [{ open: "08:00", close: "12:00" }] },
			]).isFailure(),
		).toBe(true)
	})

	test("deve rejeitar weekday duplicado", () => {
		const result = OperatingHours.create([
			{ weekday: 1, intervals: [{ open: "08:00", close: "12:00" }] },
			{ weekday: 1, intervals: [{ open: "14:00", close: "18:00" }] },
		])
		expect(result.isFailure()).toBe(true)
	})

	test("deve rejeitar mais de 7 DaySchedule", () => {
		const dto = Array.from({ length: 8 }, (_, i) => ({
			weekday: i % 7,
			intervals: [{ open: "08:00", close: "12:00" }],
		}))
		expect(OperatingHours.create(dto).isFailure()).toBe(true)
	})

	test("deve aceitar intervalos adjacentes prev.close == next.open", () => {
		const result = OperatingHours.create([
			{
				weekday: 2,
				intervals: [
					{ open: "08:00", close: "12:00" },
					{ open: "12:00", close: "14:00" },
				],
			},
		])
		expect(result.isSuccess()).toBe(true)
	})

	test("deve ordenar intervalos automaticamente e validar sobreposição após ordenação", () => {
		const result = OperatingHours.create([
			{
				weekday: 3,
				intervals: [
					{ open: "14:00", close: "18:00" },
					{ open: "08:00", close: "12:00" },
				],
			},
		])
		expect(result.isSuccess()).toBe(true)
		expect(result.forceSuccess().value.toJSON()[0].intervals[0].open).toBe(
			"08:00",
		)
	})

	test("deve rejeitar open == close", () => {
		const result = TimeInterval.create({ open: "08:00", close: "08:00" })
		expect(result.isFailure()).toBe(true)
	})

	test("isOpenAt deve retornar false quando fechado", () => {
		const hours = OperatingHours.create([
			{ weekday: 1, intervals: [{ open: "08:00", close: "12:00" }] },
		]).forceSuccess().value
		// Segunda 13:00 Sao Paulo = 16:00 UTC -> fora do intervalo 08-12
		const date = new Date("2026-09-14T16:00:00.000Z")
		expect(hours.isOpenAt(date, "America/Sao_Paulo")).toBe(false)
	})

	test("isOpenAt deve respeitar múltiplos intervalos e bordas", () => {
		const hours = OperatingHours.create([
			{
				weekday: 1,
				intervals: [
					{ open: "08:00", close: "12:00" },
					{ open: "14:00", close: "18:00" },
				],
			},
		]).forceSuccess().value
		// 08:00 inclusive deve estar aberto
		expect(
			hours.isOpenAt(new Date("2026-09-14T11:00:00.000Z"), "America/Sao_Paulo"),
		).toBe(true) // 08:00 SP
		// 12:00 exclusive deve estar fechado
		expect(
			hours.isOpenAt(new Date("2026-09-14T15:00:00.000Z"), "America/Sao_Paulo"),
		).toBe(false) // 12:00 SP
		// 14:00 inclusive
		expect(
			hours.isOpenAt(new Date("2026-09-14T17:00:00.000Z"), "America/Sao_Paulo"),
		).toBe(true) // 14:00 SP
		// 18:00 exclusive
		expect(
			hours.isOpenAt(new Date("2026-09-14T21:00:00.000Z"), "America/Sao_Paulo"),
		).toBe(false) // 18:00 SP
	})

	test("isOpenAt deve retornar false para dia sem schedule", () => {
		const hours = OperatingHours.create([
			{ weekday: 1, intervals: [{ open: "08:00", close: "12:00" }] },
		]).forceSuccess().value
		// Terça 10:00 SP = 2026-09-15T13:00:00Z
		expect(
			hours.isOpenAt(new Date("2026-09-15T13:00:00.000Z"), "America/Sao_Paulo"),
		).toBe(false)
	})

	test("isOpenAt deve retornar false quando isEmpty", () => {
		const hours = OperatingHours.create([]).forceSuccess().value
		expect(hours.isEmpty()).toBe(true)
		expect(hours.isOpenAt(new Date(), "America/Sao_Paulo")).toBe(false)
	})

	test("toJSON e restore devem fazer round-trip", () => {
		const dto = [
			{ weekday: 1, intervals: [{ open: "08:00", close: "12:00" }] },
			{ weekday: 3, intervals: [{ open: "09:00", close: "17:00" }] },
		]
		const hours = OperatingHours.create(dto).forceSuccess().value
		const json = hours.toJSON()
		const restored = OperatingHours.restore(json)
		expect(restored?.toJSON()).toEqual(json)
		expect(hours.equals(restored)).toBe(true)
	})

	test("restore null deve retornar null", () => {
		expect(OperatingHours.restore(null)).toBeNull()
		expect(OperatingHours.restore([])?.isEmpty()).toBe(true)
	})

	test("equals deve comparar corretamente", () => {
		const a = OperatingHours.create([
			{ weekday: 1, intervals: [{ open: "08:00", close: "12:00" }] },
		]).forceSuccess().value
		const b = OperatingHours.create([
			{ weekday: 1, intervals: [{ open: "08:00", close: "12:00" }] },
		]).forceSuccess().value
		const c = OperatingHours.create([
			{ weekday: 2, intervals: [{ open: "08:00", close: "12:00" }] },
		]).forceSuccess().value
		expect(a.equals(b)).toBe(true)
		expect(a.equals(c)).toBe(false)
		expect(a.equals(null)).toBe(false)
	})

	test("toCompactString deve agrupar dias consecutivos com mesmo horário", () => {
		const hours = OperatingHours.create([
			{ weekday: 1, intervals: [{ open: "06:00", close: "22:00" }] },
			{ weekday: 2, intervals: [{ open: "06:00", close: "22:00" }] },
			{ weekday: 3, intervals: [{ open: "06:00", close: "22:00" }] },
			{ weekday: 4, intervals: [{ open: "06:00", close: "22:00" }] },
			{ weekday: 5, intervals: [{ open: "06:00", close: "22:00" }] },
			{ weekday: 6, intervals: [{ open: "08:00", close: "14:00" }] },
		]).forceSuccess().value
		const compact = hours.toCompactString()
		// Dom fechado, Seg–Sex mesmo horário, Sáb diferente
		expect(compact).toBe("Dom fechado · Seg–Sex 06:00–22:00 · Sáb 08:00–14:00")
	})

	test("toCompactString deve agrupar dias fechados consecutivos", () => {
		const hours = OperatingHours.create([
			{ weekday: 1, intervals: [{ open: "08:00", close: "12:00" }] },
		]).forceSuccess().value
		const compact = hours.toCompactString()
		expect(compact).toContain("Seg 08:00–12:00")
		expect(compact).toContain("fechado")
	})

	test("toCompactString deve retornar string vazia quando isEmpty", () => {
		const hours = OperatingHours.create([]).forceSuccess().value
		expect(hours.toCompactString()).toBe("")
	})

	test("toCompactString deve formatar múltiplos intervalos por dia", () => {
		const hours = OperatingHours.create([
			{
				weekday: 1,
				intervals: [
					{ open: "08:00", close: "12:00" },
					{ open: "14:00", close: "18:00" },
				],
			},
		]).forceSuccess().value
		expect(hours.toCompactString()).toContain("08:00–12:00, 14:00–18:00")
	})

	test("Gym.create deve integrar VO via Either sem throw", () => {
		const hours = OperatingHours.create([
			{ weekday: 1, intervals: [{ open: "08:00", close: "12:00" }] },
		]).forceSuccess().value
		const result = Gym.create({
			title: "Academia Teste",
			latitude: 0,
			longitude: 0,
			cnpj: "11.222.333/0001-81",
			address: "Rua Padrão, 1",
			operatingHours: hours,
		})
		expect(result.isSuccess()).toBe(true)
		expect(result.forceSuccess().value.operatingHours?.equals(hours)).toBe(true)
	})

	test("Gym.create sem operatingHours deve ter null", () => {
		const result = Gym.create({
			title: "Academia Teste",
			latitude: 0,
			longitude: 0,
			cnpj: "11.222.333/0001-81",
			address: "Rua Padrão, 1",
		})
		expect(result.isSuccess()).toBe(true)
		expect(result.forceSuccess().value.operatingHours).toBeNull()
	})

	test("Gym.restore deve hidratar VO ou null", () => {
		const hours = OperatingHours.create([
			{ weekday: 1, intervals: [{ open: "08:00", close: "12:00" }] },
		]).forceSuccess().value
		const gym = Gym.restore({
			id: "gym-1",
			title: "Academia Teste",
			latitude: 0,
			longitude: 0,
			cnpj: "11.222.333/0001-81",
			address: "Rua Padrão, 1",
			status: "activated",
			operatingHours: hours,
		})
		expect(gym.operatingHours?.equals(hours)).toBe(true)
		const gymNull = Gym.restore({
			id: "gym-2",
			title: "Academia Teste",
			latitude: 0,
			longitude: 0,
			cnpj: "11.222.333/0001-81",
			address: "Rua Padrão, 1",
			status: "activated",
			operatingHours: null,
		})
		expect(gymNull.operatingHours).toBeNull()
	})

	test("TimeInterval restore e equals", () => {
		const a = TimeInterval.restore({ open: "08:00", close: "12:00" })
		const b = TimeInterval.restore({ open: "08:00", close: "12:00" })
		const c = TimeInterval.restore({ open: "09:00", close: "12:00" })
		expect(a.equals(b)).toBe(true)
		expect(a.equals(c)).toBe(false)
		expect(a.toJSON()).toEqual({ open: "08:00", close: "12:00" })
	})
})
