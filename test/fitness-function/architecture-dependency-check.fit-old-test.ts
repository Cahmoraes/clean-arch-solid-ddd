import { describe, expect, it } from "vitest"

import {
	type FitnessConfig,
	FitnessFunction,
} from "./fitness-function-architecture-dependency-check"

const config: FitnessConfig = {
	layers: {
		domain: ["domain"],
		application: ["application", "domain"],
		infra: ["infra", "domain", "application"],
	},
	ignoredFiles: ["infra/env/index.ts", "infra/ioc/types.ts"],
	sourceDir: "src",
	tsConfigPath: "./tsconfig.json",
}

describe("Fitness Function: Verificação de Estrutura Arquitetural", () => {
	it("deve seguir as regras de dependência do Clean Architecture", async () => {
		const fitnessFunction = new FitnessFunction(config)
		await fitnessFunction.evaluate()

		// Verificar dependências circulares
		expect(
			fitnessFunction.hasCircularDependencies(),
			`Dependências circulares detectadas:\n` +
				fitnessFunction
					.getCircularDependencies()
					.map((dep) => ` - ${dep.join(" -> ")}`)
					.join("\n"),
		).toBe(false)

		// Verificar dependências inválidas
		expect(
			fitnessFunction.hasInvalidDependencies(),
			`Violações detectadas:\n` +
				fitnessFunction
					.getInvalidDependencies()
					.map(
						(violation) =>
							` - Módulo '${violation.module}' (camada '${violation.moduleLayer}') ` +
							`dependendo do módulo '${violation.dependent}' (camada '${violation.dependentLayer}').`,
					)
					.join("\n"),
		).toBe(false)
	})
})
