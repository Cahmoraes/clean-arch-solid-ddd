import { CNPJ } from "./CNPJ"

describe("CNPJ", () => {
	const validCNPJs = [
		"11.222.333/0001-81",
		"11222333000181",
		"12.345.678/0001-95",
		"11.444.777/0001-61",
		"03.545.720/2859-66",
		"97.430.318/8995-38",
		"98.258.105/8907-49",
		"98.852.452/4388-60",
	]

	const invalidCNPJs = [
		"11.111.111/1111-11", // Todos os dígitos iguais com formatação
		"11111111111111", // Todos os dígitos iguais sem formatação
		"00.000.000/0000-00", // Zeros
		"12.345.678/0001-00", // Dígito verificador inválido
		"123.456.789-01", // Formato de CPF
		"12345", // Muito curto
		"123456789012345", // Muito longo
		"", // Vazio
		"abc.def.ghi/jklm-no", // Não numérico
		"11.222.333/0001-82", // Último dígito verificador incorreto
		"11.222.333/0002-81", // Penúltimo dígito verificador incorreto
		"11.222.334/0001-81", // Sequência alterada
	]

	describe("create", () => {
		test.each(validCNPJs)("Deve criar CNPJ válido: %s", (cnpjValue: string) => {
			const result = CNPJ.create(cnpjValue)
			expect(result.isSuccess()).toBe(true)

			const cnpj = result.forceSuccess().value
			expect(cnpj).toBeInstanceOf(CNPJ)
			expect(cnpj.value).toBe(cnpjValue)
		})

		test.each(
			invalidCNPJs,
		)("Deve retornar erro para CNPJ inválido: %s", (cnpjValue: string) => {
			const result = CNPJ.create(cnpjValue)
			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(Error)
			expect((result.value as Error).message).toBe("Invalid CNPJ")
		})
	})

	describe("restore", () => {
		test("Deve restaurar um CNPJ sem validação", () => {
			const cnpjValue = "11.222.333/0001-81"
			const cnpj = CNPJ.restore(cnpjValue)

			expect(cnpj).toBeInstanceOf(CNPJ)
			expect(cnpj.value).toBe(cnpjValue)
		})

		test("Deve restaurar um CNPJ inválido sem validação", () => {
			const cnpjValue = "invalid-cnpj"
			const cnpj = CNPJ.restore(cnpjValue)

			expect(cnpj).toBeInstanceOf(CNPJ)
			expect(cnpj.value).toBe(cnpjValue)
		})

		test("Deve restaurar um CNPJ vazio", () => {
			const cnpjValue = ""
			const cnpj = CNPJ.restore(cnpjValue)

			expect(cnpj).toBeInstanceOf(CNPJ)
			expect(cnpj.value).toBe(cnpjValue)
		})
	})

	describe("value", () => {
		test("Deve retornar o valor do CNPJ", () => {
			const cnpjValue = "11.222.333/0001-81"
			const cnpj = CNPJ.restore(cnpjValue)

			expect(cnpj.value).toBe(cnpjValue)
		})

		test("Deve preservar a formatação original", () => {
			const formattedCNPJ = "11.222.333/0001-81"
			const unformattedCNPJ = "11222333000181"

			const cnpjFormatted = CNPJ.restore(formattedCNPJ)
			const cnpjUnformatted = CNPJ.restore(unformattedCNPJ)

			expect(cnpjFormatted.value).toBe(formattedCNPJ)
			expect(cnpjUnformatted.value).toBe(unformattedCNPJ)
		})
	})

	describe("format", () => {
		test.each([
			{ input: "11222333000181", expected: "11.222.333/0001-81" },
			{ input: "32593371000117", expected: "32.593.371/0001-17" },
			{ input: "98765432000110", expected: "98.765.432/0001-10" },
			{ input: "12345678000195", expected: "12.345.678/0001-95" },
		])("Deve formatar CNPJ $input para $expected", ({ input, expected }) => {
			expect(CNPJ.format(input)).toBe(expected)
		})

		test.each([
			"12345",
			"123456789012345",
			"",
		])("Deve lançar erro para CNPJ com tamanho incorreto: %s", (invalidCNPJ) => {
			expect(() => CNPJ.format(invalidCNPJ)).toThrow(
				"CNPJ deve conter exatamente 14 dígitos",
			)
		})
	})

	describe("clean", () => {
		test.each([
			{ input: "11.222.333/0001-81", expected: "11222333000181" },
			{ input: "32-593-371/0001.17", expected: "32593371000117" },
			{ input: "98 765 432 0001 10", expected: "98765432000110" },
			{ input: "abc11def222ghi333jkl0001mno81", expected: "11222333000181" },
			{ input: "", expected: "" },
			{ input: "abc.def/ghi-jkl", expected: "" },
		])('Deve limpar "$input" para "$expected"', ({ input, expected }) => {
			expect(CNPJ.clean(input)).toBe(expected)
		})
	})

	describe("equals", () => {
		test("Deve retornar true para CNPJs iguais", () => {
			const cnpjValue = "11.222.333/0001-81"
			const cnpjOne = CNPJ.restore(cnpjValue)
			const cnpjTwo = CNPJ.restore(cnpjValue)
			expect(cnpjOne.equals(cnpjTwo)).toBe(true)
		})

		test("Deve retornar false para CNPJs diferentes", () => {
			const cnpjOne = CNPJ.restore("11.222.333/0001-81")
			const cnpjTwo = CNPJ.restore("32.593.371/0001-17")

			expect(cnpjOne.equals(cnpjTwo)).toBe(false)
		})

		test("Deve retornar false para diferentes formatações do mesmo CNPJ", () => {
			const cnpjFormatted = CNPJ.restore("11.222.333/0001-81")
			const cnpjUnformatted = CNPJ.restore("11222333000181")

			expect(cnpjFormatted.equals(cnpjUnformatted)).toBe(false)
		})

		test("Deve retornar false para objeto que não é CNPJ", () => {
			const cnpj = CNPJ.restore("11.222.333/0001-81")
			const notCNPJ = { value: "11.222.333/0001-81" }

			expect(cnpj.equals(notCNPJ)).toBe(false)
		})

		test("Deve retornar false para null", () => {
			const cnpj = CNPJ.restore("11.222.333/0001-81")

			expect(cnpj.equals(null)).toBe(false)
		})

		test("Deve retornar false para undefined", () => {
			const cnpj = CNPJ.restore("11.222.333/0001-81")

			expect(cnpj.equals(undefined)).toBe(false)
		})

		test("Deve retornar false para string", () => {
			const cnpj = CNPJ.restore("11.222.333/0001-81")

			expect(cnpj.equals("11.222.333/0001-81")).toBe(false)
		})
	})
})
