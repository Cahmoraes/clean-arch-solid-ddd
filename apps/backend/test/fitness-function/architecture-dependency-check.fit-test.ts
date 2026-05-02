import { metrics, projectFiles } from "archunit"

describe("Architecture Fitness Function", () => {
	describe("Avalia a regra das dependências das camadas", () => {
		test("camada de domínio não deve depender da camada de aplicação", async () => {
			const rule = projectFiles()
				.inFolder("**/domain/**")
				.shouldNot()
				.dependOnFiles()
				.inFolder("**/application/**")
			await expect(rule).toPassAsync()
		})

		test("camada de domínio não deve depender da camada de infraestrutura", async () => {
			const rule = projectFiles()
				.inFolder("**/domain/**")
				.shouldNot()
				.dependOnFiles()
				.inFolder("**/infra/**")
				.inFolder("!src/shared/**")
			await expect(rule).toPassAsync()
		})

		test("camada de aplicação não deve depender da camada de infraestrutura", async () => {
			const rule = projectFiles()
				.inFolder("**/application/**")
				.shouldNot()
				.dependOnFiles()
				.inFolder("**/infra/**")
				.inFolder("!src/shared/**")
			await expect(rule).toPassAsync()
		})

		describe("Avalia dependências circulares", () => {
			test("não deve haver dependência circular", async () => {
				const rule = projectFiles()
					.inFolder("src/**")
					.inFolder("!src/shared/**")
					.inFolder("!src/bootstrap/**")
					.inFolder("!**/domain/**")
					.should()
					.haveNoCycles()
				await expect(rule).toPassAsync()
			})
		})

		describe("Avalia métrica LCOM", () => {
			test("UserEntity", async () => {
				const rule = metrics()
					.inPath("src/user/domain/user.ts")
					.lcom()
					.lcom96b()
					.shouldBeBelow(1)
				expect(rule).toPassAsync()
			})
		})
	})

	test.skip("Deve gerar relatórios HTML", async () => {
		const countMetrics = metrics().count()
		const lcomMetrics = metrics().lcom()
		await countMetrics.exportAsHTML()
		await lcomMetrics.exportAsHTML()
		expect(0).toBe(0)
	})
}, 60_000)
