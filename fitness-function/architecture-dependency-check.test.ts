import madge from 'madge'

// Defina as camadas e as regras de dependência
const layers: { [key: string]: string[] } = {
  domain: ['domain'],
  application: ['application', 'domain'],
  infra: ['infra', 'domain', 'application'],
}

describe('Fitness Function: Verificação de Estrutura Arquitetural', () => {
  it('deve seguir as regras de dependência do Clean Architecture', async () => {
    const result = await madge('src', {
      fileExtensions: ['ts'],
      includeNpm: false,
      tsConfig: './tsconfig.json',
      baseDir: 'src',
    })

    // Verifica se há dependências circulares
    const circularDependencies = result.circular()
    expect(
      circularDependencies.length,
      `Dependências circulares detectadas:\n` +
        circularDependencies.map((dep) => ` - ${dep.join(' -> ')}`).join('\n'),
    ).toBe(0)

    // Filtra dependências para ignorar arquivos de teste
    const dependencies = result.obj()
    const filteredDependencies = Object.fromEntries(
      Object.entries(dependencies).filter(([module]) => !isTestFile(module)),
    )

    for (const [module, dependents] of Object.entries(filteredDependencies)) {
      const moduleLayer = getLayer(module)

      if (!moduleLayer) continue

      dependents.forEach((dependent) => {
        // Ignora arquivos de teste nas dependências
        if (isTestFile(dependent)) return

        const dependentLayer = getLayer(dependent)
        if (!dependentLayer) return

        // Verifica se a camada dependente está permitida
        const isValidDependency = layers[moduleLayer].includes(dependentLayer)
        expect(
          isValidDependency,
          `Violação de dependência detectada:\n - Módulo '${module}' (camada '${moduleLayer}') ` +
            `está dependendo do módulo '${dependent}' (camada '${dependentLayer}'), ` +
            `o que não é permitido pelas regras do Clean Architecture.`,
        ).toBe(true)
      })
    }
  })
})

// Função para verificar se o arquivo é de teste
function isTestFile(filePath: string): boolean {
  return (
    /\.test\.ts$/.test(filePath) ||
    /\.spec\.ts$/.test(filePath) ||
    /-test\.ts$/.test(filePath)
  )
}

// Função auxiliar para obter a camada de um módulo com base no caminho
function getLayer(modulePath: string): string | undefined {
  if (modulePath.includes('domain/')) return 'domain'
  if (modulePath.includes('application/')) return 'application'
  if (modulePath.includes('infra/')) return 'infra'
  return undefined
}
