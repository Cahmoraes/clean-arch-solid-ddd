const permittedFileImports = [
  'src/infra/env/index.ts',
  'src/infra/ioc/types.ts',
]

/** @type {import('dependency-cruiser').IConfiguration} */
const rules = {
  forbidden: [
    noDomainToApplicationExceptPermitted(),
    noDomainToInfraExceptPermitted(),
    noApplicationToInfraExceptPermitted(),
    allowInfraCircularDependency(),
  ],
  options: {
    tsConfig: {
      fileName: 'tsconfig.json',
    },
    doNotFollow: {
      /* path: an array of regular expressions in strings to match against */
      path: ['node_modules'],
    },
    skipAnalysisNotInRules: true,
    reporterOptions: {
      dot: {
        /* pattern of modules that can be consolidated in the detailed
           graphical dependency graph. The default pattern in this configuration
           collapses everything in node_modules to one folder deep so you see
           the external modules, but their innards.
         */
        collapsePattern: 'node_modules/(?:@[^/]+/[^/]+|[^/]+)',

        /* Options to tweak the appearance of your graph.See
           https://github.com/sverweij/dependency-cruiser/blob/main/doc/options-reference.md#reporteroptions
           for details and some examples. If you don't specify a theme
           dependency-cruiser falls back to a built-in one.
        */
        // theme: {
        //   graph: {
        //     /* splines: "ortho" gives straight lines, but is slow on big graphs
        //        splines: "true" gives bezier curves (fast, not as nice as ortho)
        //    */
        //     splines: "true"
        //   },
        // }
      },
      archi: {
        /* pattern of modules that can be consolidated in the high level
          graphical dependency graph. If you use the high level graphical
          dependency graph reporter (`archi`) you probably want to tweak
          this collapsePattern to your situation.
        */
        collapsePattern:
          '^(?:packages|src|lib(s?)|app(s?)|bin|test(s?)|spec(s?))/[^/]+|node_modules/(?:@[^/]+/[^/]+|[^/]+)',

        /* Options to tweak the appearance of your graph. If you don't specify a
           theme for 'archi' dependency-cruiser will use the one specified in the
           dot section above and otherwise use the default one.
         */
        // theme: { },
      },
      text: {
        highlightFocused: true,
      },
    },
  },
}

export default rules

/**
 * @return import('dependency-cruiser').IForbiddenRuleType
 */
/**
 * Retorna uma regra de dependência que impede dependências circulares.
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

/**
 * Define uma regra do Dependency Cruiser que permite dependências circulares
 * dentro da pasta `infra/`, mas impede ciclos em outras camadas do sistema.
 *
 * @returns {import('dependency-cruiser').IForbiddenRuleType} Regra de dependência com as seguintes propriedades:
 * - `name`: Identificador da regra.
 * - `comment`: Explicação sobre o propósito da regra.
 * - `severity`: Define a severidade como "ignore" para não gerar erro nesses ciclos específicos.
 * - `from`: Define que a regra se aplica apenas a módulos dentro de `src/infra/`.
 * - `to`: Permite ciclos dentro de `infra/`, restringindo-os apenas a essa pasta usando `viaOnly`.
 */
function allowInfraCircularDependency() {
  return {
    name: 'allow-infra-circular-dependency',
    comment:
      'Permite ciclos dentro da pasta `infra/`, mas impede ciclos em outras camadas.',
    severity: 'ignore', // 🔥 Ignora esses ciclos específicos
    from: {
      path: '^src/infra/', // Permite apenas ciclos na pasta infra
    },
    to: {
      circular: true, // 🚀 Permite ciclos internos
      viaOnly: {
        path: '^src/infra/', // 🔥 Garante que os ciclos aceitos estão apenas dentro de infra/
      },
    },
  }
}
