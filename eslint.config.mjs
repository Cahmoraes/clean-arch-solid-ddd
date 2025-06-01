import pluginJs from '@eslint/js'
import importPlugin from 'eslint-plugin-import'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default [
  {
    files: ['**/*.{js,mjs,cjs,ts}'],
  },
  importPlugin.flatConfigs.recommended,
  importPlugin.flatConfigs.typescript,
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },

  {
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
      },
    },
    rules: {
      complexity: ['error', 5],
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-this-alias': 'off',
    },
  },
  {
    // Override para arquivos de teste
    files: ['**/*.test.ts'],
    rules: {
      complexity: 'off', // Desativa a regra de complexidade para testes
    },
  },
  {
    rules: {
      'import/no-unresolved': 'off',
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './src/domain',
              from: './src/application',
              message:
                'A camada domain não pode importar da camada application',
            },
          ],
        },
      ],
    },
  },
]
