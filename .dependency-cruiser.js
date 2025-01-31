const permittedFileImports = [
  'src/infra/env/index.ts',
  'src/infra/ioc/types.ts',
]

// export function permittedFileImportsToString() {
//   return permittedFileImports.map((file) => `^${file.replace(/\//g, '\\/')}$`)
// }

/** @type {import('dependency-cruiser').IConfiguration} */
const rules = {
  forbidden: [
    noDomainToApplicationExceptPermitted(),
    noDomainToInfraExceptPermitted(),
    noApplicationToInfraExceptPermitted(),
  ],
  options: {
    tsConfig: {
      fileName: 'tsconfig.json',
    },
  },
}

/**
 * @return import('dependency-cruiser').IForbiddenRuleType
 */
/**
 * Retorna uma regra de dependência que impede que a camada 'application' dependa da camada 'infra',
 * exceto para arquivos permitidos.
 *
 * @returns {import('dependency-cruiser').IForbiddenRuleType} Regra de dependência com as seguintes propriedades:
 * - name: Nome da regra.
 * - comment: Comentário explicativo da regra.
 * - severity: Nível de severidade da regra.
 * - from: Objeto que define a origem das dependências.
 * - to: Objeto que define o destino das dependências.
 */
function noApplicationToInfraExceptPermitted() {
  return {
    name: 'no-application-to-infra',
    comment:
      "A camada 'application' não pode depender de 'infra', exceto arquivos permitidos.",
    severity: 'error',
    from: { path: '^src/application', pathNot: ['\\.test\\.ts$'] },
    to: {
      path: '^src/infra',
      pathNot: permittedFileImports,
    },
  }
}

/**
 * @return import('dependency-cruiser').IForbiddenRuleType
 */
/**
 * Retorna uma regra de dependência que impede que a camada 'domain' dependa da camada 'application',
 * exceto para arquivos permitidos.
 *
 * @returns {import('dependency-cruiser').IForbiddenRuleType} Regra de dependência com as seguintes propriedades:
 * - name: Nome da regra.
 * - comment: Comentário explicativo da regra.
 * - severity: Nível de severidade da regra.
 * - from: Objeto que define a origem das dependências.
 * - to: Objeto que define o destino das dependências.
 */
function noDomainToApplicationExceptPermitted() {
  return {
    name: 'no-domain-to-application',
    comment: "A camada 'domínio' não pode depender da camada de 'aplicação'",
    severity: 'error',
    from: { path: '^src/domain', pathNot: ['\\.test\\.ts$'] },
    to: {
      path: '^src/application',
      pathNot: permittedFileImports,
    },
  }
}

/**
 * @return import('dependency-cruiser').IForbiddenRuleType
 */
/**
 * Retorna uma regra de dependência que impede que a camada 'domain' dependa da camada 'infra',
 * exceto para arquivos permitidos.
 *
 * @returns {import('dependency-cruiser').IForbiddenRuleType} Regra de dependência com as seguintes propriedades:
 * - name: Nome da regra.
 * - comment: Comentário explicativo da regra.
 * - severity: Nível de severidade da regra.
 * - from: Objeto que define a origem das dependências.
 * - to: Objeto que define o destino das dependências.
 */
function noDomainToInfraExceptPermitted() {
  return {
    name: 'no-domain-to-infra',
    comment: "A camada 'domínio' não pode depender da camada de 'infra'",
    severity: 'error',
    from: { path: '^src/domain', pathNot: ['\\.test\\.ts$'] },
    to: {
      path: '^src/infra',
      pathNot: permittedFileImports,
    },
  }
}

export default rules
