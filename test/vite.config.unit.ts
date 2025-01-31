import { defineConfig, mergeConfig } from 'vite'

import setupShareConfig from './vite.config.shared'

export default mergeConfig(
  setupShareConfig,
  defineConfig({
    test: {
      include: ['**/**/*.test.ts'],
      coverage: {
        include: ['**/src/**'], // Mantém apenas os arquivos relevantes
        exclude: [
          '**/**/@types',
          '**/node_modules/**',
          '**/**/*.integration-test.ts', // Já está sendo excluído corretamente
          '**/**/*.controller.ts',
          '**/infra/**',
          '**/**/*.test.ts', // 🔥 Exclui testes unitários do relatório de cobertura
          '**/**/*.spec.ts', // 🔥 Exclui testes de spec
        ],
      },
    },
  }),
)
