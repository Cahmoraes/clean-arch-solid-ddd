import { metrics, projectFiles } from "archunit"

describe("Architecture Fitness Function", () => {
	it("não deve haver dependência circular", async () => {
		const rule = projectFiles()
			.inFolder("src/**")
			.inFolder("!src/shared/**")
			.inFolder("!src/bootstrap/**")
			.inFolder("!**/domain/**")
			.should()
			.haveNoCycles()
		await expect(rule).toPassAsync()
	})

	it("camada de domínio não deve depender da camada de aplicação", async () => {
		const rule = projectFiles()
			.inFolder("**/domain/**")
			.shouldNot()
			.dependOnFiles()
			.inFolder("**/application/**")
		await expect(rule).toPassAsync()
	})

	it("camada de domínio não deve depender da camada de infraestrutura", async () => {
		const rule = projectFiles()
			.inFolder("**/domain/**")
			.shouldNot()
			.dependOnFiles()
			.inFolder("**/infra/**")
			.inFolder("!src/shared/**")
		await expect(rule).toPassAsync()
	})

	it("camada de aplicação não deve depender da camada de infraestrutura", async () => {
		const rule = projectFiles()
			.inFolder("**/application/**")
			.shouldNot()
			.dependOnFiles()
			.inFolder("**/infra/**")
			.inFolder("!src/shared/**")
		await expect(rule).toPassAsync()
	})

	it.skip("Deve gerar relatórios HTML", async () => {
		const countMetrics = metrics().count()
		const lcomMetrics = metrics().lcom()
		await countMetrics.exportAsHTML()
		await lcomMetrics.exportAsHTML()
		expect(0).toBe(0)
	})
}, 15_000)
