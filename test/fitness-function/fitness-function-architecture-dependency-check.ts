import madge from "madge"

export interface FitnessConfig {
	layers: { [key: string]: string[] }
	ignoredFiles: string[]
	sourceDir: string
	tsConfigPath: string
}

export interface FitnessResult {
	circularDependencies: string[][]
	invalidDependencies: {
		module: string
		dependent: string
		moduleLayer: string
		dependentLayer: string
	}[]
}

export class FitnessFunction {
	private config: FitnessConfig
	private result: FitnessResult | null = null

	constructor(config: FitnessConfig) {
		this.config = config
	}

	// Avalia a arquitetura e retorna os resultados
	async evaluate(): Promise<FitnessResult> {
		const { sourceDir, tsConfigPath, ignoredFiles, layers } = this.config

		const result = await madge(sourceDir, {
			fileExtensions: ["ts"],
			includeNpm: false,
			tsConfig: tsConfigPath,
			baseDir: sourceDir,
		})

		// Verificar dependências circulares
		const circularDependencies = result.circular()

		// Filtrar dependências para ignorar arquivos de teste e arquivos ignorados
		const dependencies = result.obj()
		const filteredDependencies = Object.fromEntries(
			Object.entries(dependencies).filter(
				([module]) =>
					!this.isTestFile(module) && !this.isIgnoredFile(module, ignoredFiles),
			),
		)

		const invalidDependencies: FitnessResult["invalidDependencies"] = []

		for (const [module, dependents] of Object.entries(filteredDependencies)) {
			const moduleLayer = this.getLayer(module)

			if (!moduleLayer) continue

			dependents.forEach((dependent) => {
				// Ignora arquivos de teste e arquivos explicitamente ignorados nas dependências
				if (
					this.isTestFile(dependent) ||
					this.isIgnoredFile(dependent, ignoredFiles)
				)
					return

				const dependentLayer = this.getLayer(dependent)
				if (!dependentLayer) return

				// Verifica se a camada dependente está permitida
				const isValidDependency = layers[moduleLayer].includes(dependentLayer)
				if (!isValidDependency) {
					invalidDependencies.push({
						module,
						dependent,
						moduleLayer,
						dependentLayer,
					})
				}
			})
		}

		this.result = { circularDependencies, invalidDependencies }
		return this.result
	}

	// Verifica se há dependências circulares
	hasCircularDependencies(): boolean {
		if (!this.result) {
			throw new Error(
				"Você precisa executar o método evaluate() antes de verificar dependências circulares.",
			)
		}
		return this.result.circularDependencies.length > 0
	}

	// Retorna as dependências circulares (se houver)
	getCircularDependencies(): string[][] {
		if (!this.result) {
			throw new Error(
				"Você precisa executar o método evaluate() antes de verificar dependências circulares.",
			)
		}
		return this.result.circularDependencies
	}

	// Verifica se há dependências inválidas
	hasInvalidDependencies(): boolean {
		if (!this.result) {
			throw new Error(
				"Você precisa executar o método evaluate() antes de verificar dependências inválidas.",
			)
		}
		return this.result.invalidDependencies.length > 0
	}

	// Retorna as dependências inválidas (se houver)
	getInvalidDependencies(): FitnessResult["invalidDependencies"] {
		if (!this.result) {
			throw new Error(
				"Você precisa executar o método evaluate() antes de verificar dependências inválidas.",
			)
		}
		return this.result.invalidDependencies
	}

	// Função para verificar se o arquivo é de teste
	private isTestFile(filePath: string): boolean {
		return (
			/\.test\.ts$/.test(filePath) ||
			/\.spec\.ts$/.test(filePath) ||
			/-test\.ts$/.test(filePath)
		)
	}

	// Função para verificar se o arquivo é explicitamente ignorado
	private isIgnoredFile(filePath: string, ignoredFiles: string[]): boolean {
		return ignoredFiles.includes(filePath)
	}

	// Função auxiliar para obter a camada de um módulo com base no caminho
	private getLayer(modulePath: string): string | undefined {
		if (modulePath.includes("domain/")) return "domain"
		if (modulePath.includes("application/")) return "application"
		if (modulePath.includes("infra/")) return "infra"
		return undefined
	}
}
