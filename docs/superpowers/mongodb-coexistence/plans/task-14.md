# Task 14: Regra de isolamento do driver e verificação cruzada dos contratos [FR-019, FR-020, FR-021]

**Status:** PENDING

**PRD:** `../prd/prd-mongodb-coexistence.md`

**Spec:** `../specs/mongodb-coexistence-design.md`

**Tier:** standard

## Visão Geral

Esta task fecha a tese do estudo com duas verificações automáticas. A primeira é uma regra do dependency-cruiser que proíbe `domain` e `application` de importarem o driver `mongodb`, mais um teste de fitness que roda a validação sobre o código real e sobre arquivos de fixture temporários (um positivo e três negativos). A segunda garante que cada suíte de contrato compartilhada é invocada nos três lados (in-memory, Prisma e Mongo), com um teste que lista os arquivos esperados e falha se faltar algum, e um script que roda os três lados juntos.

## Arquivos

- Modify: `apps/backend/.dependency-cruiser.js`
- Modify: `apps/backend/package.json`
- Test: `apps/backend/test/fitness-function/mongo-isolation.fit-test.ts`
- Test: `apps/backend/test/repository-contract/repository-contract-coverage.test.ts`

## Interfaces

- **Consome:**
  - `describeUserRepositoryContract(name, factory)` e `describeUserDaoContract(name, factory)` de `test/repository-contract/user-repository-contract` e `test/repository-contract/user-dao-contract` (task-04)
  - `describeGymRepositoryContract(name, factory)` de `test/repository-contract/gym-repository-contract` (task-05)
  - `describeCheckInRepositoryContract(name, factory)` de `test/repository-contract/check-in-repository-contract` (task-06)
  - `describePlanRepositoryContract`, `describeStripeWebhookEventRepositoryContract`, `describeSubscriptionRepositoryContract` de `test/repository-contract/plan-repository-contract`, `.../stripe-webhook-event-repository-contract`, `.../subscription-repository-contract` (task-07)
  - `describeNotificationRepositoryContract` e `describeActiveRecipientsProviderContract` de `test/repository-contract/notification-repository-contract` e `.../active-recipients-provider-contract` (task-08)
  - `describeUserActivityDaoContract` de `test/repository-contract/user-activity-dao-contract` (task-09)
  - Os 30 arquivos invocadores `*.contract.test.ts` (in-memory), `*.contract.integration-test.ts` (Prisma) e `mongo-*.integration-test.ts` (Mongo) listados em `ENTRIES`, criados nas tasks de usuário (task-04), academia (task-05), check-in (task-06), assinatura (task-07), notificação (task-08) e atividade (task-09)
  - `isMongoEnabled(): boolean` de `@/shared/infra/env` e a seleção dos adapters Mongo nos providers (task-11), que a verificação cruzada assume já ligados
- **Produz:**
  - Regra `no-domain-or-application-to-mongodb-driver` em `.dependency-cruiser.js` e `options.tsPreCompilationDeps: true` (imports só de tipo também contam)
  - `test/fitness-function/mongo-isolation.fit-test.ts` e `test/repository-contract/repository-contract-coverage.test.ts`
  - Script `test:repository-contracts` no `package.json`

### Skills a invocar

- `typescript-advanced`: o parse do JSON do dependency-cruiser e a tabela de contratos usam interfaces explícitas (`DepcruiseViolation`, `ContractEntry`), sem `any`.
- `no-workarounds`: a regra usa o layout real (`src/<contexto>/domain|application`) e enxerga `import type`; as falhas já existentes não são consertadas nem escondidas por esta task, só documentadas e deixadas fora da verificação.
- `test-antipatterns`: os testes negativos criam arquivos de fixture de verdade dentro de `src/` e os removem em `afterEach`, rodando o validador real; nada de mockar o dependency-cruiser.

## Passos

- **Step 1: Confirm the tool and the JSON shape**

1. Confirmar nos tipos do `archunit` instalado (`apps/backend/node_modules/archunit`) que ele analisa dependências entre arquivos do projeto e não expressa "este arquivo não importa o pacote `mongodb`" (pacotes de `node_modules` não são arquivos do projeto). Se expressar, a regra pode ser escrita nele; caso contrário vale a decisão do plano, a regra no dependency-cruiser executada por um teste `*.fit-test.ts`.
2. Rodar `cd apps/backend && npx depcruise --validate .dependency-cruiser.js --output-type json src/gym/domain` e confirmar a forma do JSON usada pelo teste: `summary.violations[]` com `rule.name`, `from` e `to`. Anotar que as três regras de camada já existentes usam caminhos `^src/domain` e `^src/infra` que não existem no layout real (`src/<contexto>/domain`), então hoje não casam nada; esta task não as altera.

- **Step 2: Write the failing tests**

`apps/backend/test/fitness-function/mongo-isolation.fit-test.ts`:

```ts
import { execFile } from "node:child_process"
import { rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { promisify } from "node:util"
import { afterEach, describe, expect, it } from "vitest"

// Known failures that exist before this feature and are out of scope here: two failing tests and one
// skipped test in the current fitness suite, and one failing test in test/contract/subscription.contract-test.ts
// (HTTP/OpenAPI contract, unrelated to the repository contracts). This file neither fixes nor hides them.

const execFileAsync = promisify(execFile)
const BACKEND_ROOT = path.resolve(import.meta.dirname, "..", "..")
const RULE_NAME = "no-domain-or-application-to-mongodb-driver"

interface DepcruiseViolation {
	rule: { name: string }
	from: string
	to: string
}

function parseViolations(stdout: string): DepcruiseViolation[] {
	const output: { summary: { violations: DepcruiseViolation[] } } = JSON.parse(stdout)
	return output.summary.violations
}

function hasStdout(error: unknown): error is Error & { stdout: string } {
	return (
		error instanceof Error &&
		"stdout" in error &&
		typeof error.stdout === "string" &&
		error.stdout.length > 0
	)
}

async function mongoViolations(targets: string[]): Promise<DepcruiseViolation[]> {
	const args = [
		"depcruise",
		"--validate",
		".dependency-cruiser.js",
		"--output-type",
		"json",
		...targets,
	]
	try {
		const { stdout } = await execFileAsync("npx", args, {
			cwd: BACKEND_ROOT,
			maxBuffer: 256 * 1024 * 1024,
		})
		return parseViolations(stdout).filter((v) => v.rule.name === RULE_NAME)
	} catch (error) {
		// depcruise exits non-zero when it finds error-level violations; the report is still on stdout.
		if (hasStdout(error)) {
			return parseViolations(error.stdout).filter((v) => v.rule.name === RULE_NAME)
		}
		throw error
	}
}

describe("mongodb driver isolation", () => {
	const fixtures: string[] = []

	async function writeFixture(relativePath: string, source: string): Promise<string> {
		await writeFile(path.join(BACKEND_ROOT, relativePath), source)
		fixtures.push(relativePath)
		return relativePath
	}

	afterEach(async () => {
		await Promise.all(
			fixtures
				.splice(0)
				.map((relativePath) => rm(path.join(BACKEND_ROOT, relativePath), { force: true })),
		)
	})

	it("AC-11: no domain or application file in src imports the mongodb driver", async () => {
		expect(await mongoViolations(["src"])).toEqual([])
	}, 180_000)

	it("AC-11: a domain file importing mongodb is reported", async () => {
		const fixture = await writeFixture(
			"src/gym/domain/mongo-isolation-fixture.ts",
			'import { MongoClient } from "mongodb"\nexport const driver = MongoClient\n',
		)

		const violations = await mongoViolations([fixture])

		expect(violations.map((violation) => violation.from)).toEqual([fixture])
	}, 60_000)

	it("AC-11: an application file importing only mongodb types is reported", async () => {
		const fixture = await writeFixture(
			"src/gym/application/mongo-isolation-fixture.ts",
			'import type { ClientSession } from "mongodb"\nexport type Session = ClientSession\n',
		)

		const violations = await mongoViolations([fixture])

		expect(violations.map((violation) => violation.from)).toEqual([fixture])
	}, 60_000)

	it("FR-021: an infra file may import mongodb", async () => {
		const fixture = await writeFixture(
			"src/gym/infra/mongo-isolation-fixture.ts",
			'import { MongoClient } from "mongodb"\nexport const driver = MongoClient\n',
		)

		expect(await mongoViolations([fixture])).toEqual([])
	}, 60_000)
})
```

`apps/backend/test/repository-contract/repository-contract-coverage.test.ts`:

```ts
import { existsSync, readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const BACKEND_ROOT = path.resolve(import.meta.dirname, "..", "..")
const REPOSITORY = "src/shared/infra/database/repository"
const DAO = "src/shared/infra/database/dao"
const NOTIFICATION_REPOSITORY = "src/notification/infra/repository"
const NOTIFICATION_PROVIDER = "src/notification/infra/provider"

interface ContractEntry {
	helper: string
	describeName: string
	inMemory: string
	prisma: string
	mongo: string
}

const ENTRIES: ContractEntry[] = [
	{
		helper: "user-repository-contract",
		describeName: "describeUserRepositoryContract",
		inMemory: `${REPOSITORY}/in-memory/in-memory-user-repository.contract.test.ts`,
		prisma: `${REPOSITORY}/prisma/prisma-user-repository.contract.integration-test.ts`,
		mongo: `${REPOSITORY}/mongo/mongo-user-repository.integration-test.ts`,
	},
	{
		helper: "user-dao-contract",
		describeName: "describeUserDaoContract",
		inMemory: `${DAO}/in-memory/user-dao-memory.contract.test.ts`,
		prisma: `${DAO}/prisma/prisma-user-dao.contract.integration-test.ts`,
		mongo: `${DAO}/mongo/mongo-user-dao.integration-test.ts`,
	},
	{
		helper: "gym-repository-contract",
		describeName: "describeGymRepositoryContract",
		inMemory: `${REPOSITORY}/in-memory/in-memory-gym-repository.contract.test.ts`,
		prisma: `${REPOSITORY}/prisma/prisma-gym-repository.contract.integration-test.ts`,
		mongo: `${REPOSITORY}/mongo/mongo-gym-repository.integration-test.ts`,
	},
	{
		helper: "check-in-repository-contract",
		describeName: "describeCheckInRepositoryContract",
		inMemory: `${REPOSITORY}/in-memory/in-memory-check-in-repository.contract.test.ts`,
		prisma: `${REPOSITORY}/prisma/prisma-check-in-repository.contract.integration-test.ts`,
		mongo: `${REPOSITORY}/mongo/mongo-check-in-repository.integration-test.ts`,
	},
	{
		helper: "plan-repository-contract",
		describeName: "describePlanRepositoryContract",
		inMemory: `${REPOSITORY}/in-memory/in-memory-plan-repository.contract.test.ts`,
		prisma: `${REPOSITORY}/prisma/prisma-plan-repository.contract.integration-test.ts`,
		mongo: `${REPOSITORY}/mongo/mongo-plan-repository.integration-test.ts`,
	},
	{
		helper: "stripe-webhook-event-repository-contract",
		describeName: "describeStripeWebhookEventRepositoryContract",
		inMemory: `${REPOSITORY}/in-memory/in-memory-stripe-webhook-event-repository.contract.test.ts`,
		prisma: `${REPOSITORY}/prisma/prisma-stripe-webhook-event-repository.contract.integration-test.ts`,
		mongo: `${REPOSITORY}/mongo/mongo-stripe-webhook-event-repository.integration-test.ts`,
	},
	{
		helper: "subscription-repository-contract",
		describeName: "describeSubscriptionRepositoryContract",
		inMemory: `${REPOSITORY}/in-memory/in-memory-subscription-repository.contract.test.ts`,
		prisma: `${REPOSITORY}/prisma/prisma-subscription-repository.contract.integration-test.ts`,
		mongo: `${REPOSITORY}/mongo/mongo-subscription-repository.integration-test.ts`,
	},
	{
		helper: "notification-repository-contract",
		describeName: "describeNotificationRepositoryContract",
		inMemory: `${NOTIFICATION_REPOSITORY}/in-memory/in-memory-notification.repository.contract.test.ts`,
		prisma: `${NOTIFICATION_REPOSITORY}/prisma/prisma-notification.repository.contract.integration-test.ts`,
		mongo: `${NOTIFICATION_REPOSITORY}/mongo/mongo-notification.repository.integration-test.ts`,
	},
	{
		helper: "active-recipients-provider-contract",
		describeName: "describeActiveRecipientsProviderContract",
		inMemory: `${NOTIFICATION_PROVIDER}/in-memory/in-memory-active-recipients.provider.contract.test.ts`,
		prisma: `${NOTIFICATION_PROVIDER}/prisma/prisma-active-recipients.provider.contract.integration-test.ts`,
		mongo: `${NOTIFICATION_PROVIDER}/mongo/mongo-active-recipients.provider.integration-test.ts`,
	},
	{
		helper: "user-activity-dao-contract",
		describeName: "describeUserActivityDaoContract",
		inMemory: `${DAO}/in-memory/user-activity-dao-memory.contract.test.ts`,
		prisma: `${DAO}/prisma/prisma-user-activity-dao.contract.integration-test.ts`,
		mongo: `${DAO}/mongo/mongo-user-activity-dao.integration-test.ts`,
	},
]

function read(relativePath: string): string {
	return readFileSync(path.join(BACKEND_ROOT, relativePath), "utf8")
}

describe("repository contract coverage", () => {
	it("AC-10: every contract helper in test/repository-contract is registered here", () => {
		const helpers = readdirSync(path.join(BACKEND_ROOT, "test/repository-contract"))
			.filter((file) => file.endsWith("-contract.ts"))
			.map((file) => file.replace(/\.ts$/, ""))
			.sort()

		expect(helpers).toEqual(ENTRIES.map((entry) => entry.helper).sort())
	})

	it.each(ENTRIES)(
		"AC-10: $describeName is invoked against in-memory, Prisma and Mongo",
		(entry) => {
			const helperImport = `test/repository-contract/${entry.helper}`
			const sides = [
				{ file: entry.inMemory, suffix: ".contract.test.ts" },
				{ file: entry.prisma, suffix: ".contract.integration-test.ts" },
				{ file: entry.mongo, suffix: ".integration-test.ts" },
			]

			for (const side of sides) {
				expect(side.file.endsWith(side.suffix), `${side.file} suffix`).toBe(true)
				expect(existsSync(path.join(BACKEND_ROOT, side.file)), `${side.file} exists`).toBe(true)
				const source = read(side.file)
				expect(source, `${side.file} imports the helper`).toContain(helperImport)
				expect(source, `${side.file} calls the helper`).toContain(`${entry.describeName}(`)
			}
		},
	)
})
```

- **Step 3: Run tests to verify they fail**

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.fitness.ts test/fitness-function/mongo-isolation.fit-test.ts`
Expected: FAIL nos dois testes de fixture negativa (`AC-11: a domain file importing mongodb is reported` e `AC-11: an application file importing only mongodb types is reported`): `expected [] to deeply equal ['src/gym/domain/mongo-isolation-fixture.ts']`, porque a regra ainda não existe; os testes positivo e de infra passam.

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts test/repository-contract/repository-contract-coverage.test.ts`
Expected: PASS (11 testes) se as tasks 04 a 09 criaram os 30 invocadores com os nomes acima; este teste é uma trava de regressão e, por isso, não nasce falhando. Qualquer falha aponta um invocador ausente, com nome diferente ou que não chama a suíte compartilhada, e se corrige no invocador.

- **Step 4: Write minimal implementation**

Em `apps/backend/.dependency-cruiser.js`, incluir a regra na lista `forbidden`, ativar a análise de imports só de tipo e acrescentar a função:

```js
	forbidden: [
		noDomainToApplicationExceptPermitted(),
		noDomainToInfraExceptPermitted(),
		noApplicationToInfraExceptPermitted(),
		noDomainOrApplicationToMongoDriver(),
		allowInfraCircularDependency(),
	],
	options: {
		tsConfig: {
			fileName: "tsconfig.json",
		},
		// Count `import type` too: a type-only import of the driver still couples the layer to it.
		tsPreCompilationDeps: true,
```

```js
/**
 * Impede que `domain` e `application` de qualquer contexto (src/<contexto>/domain|application,
 * inclusive src/shared) importem o driver `mongodb`, nem mesmo só pelos tipos.
 *
 * @returns {import('dependency-cruiser').IForbiddenRuleType}
 */
function noDomainOrApplicationToMongoDriver() {
	return {
		name: "no-domain-or-application-to-mongodb-driver",
		comment:
			"As camadas 'domain' e 'application' não podem importar o driver 'mongodb'; só 'infra'.",
		severity: "error",
		from: { path: "^src/[^/]+/(domain|application)/" },
		to: { path: "node_modules/mongodb(/|$)" },
	}
}
```

- **Step 5: Run tests to verify they pass**

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.fitness.ts test/fitness-function/mongo-isolation.fit-test.ts`
Expected: PASS (4 testes). Se o teste positivo apontar violações reais em `src`, a causa é um import de `mongodb` em `domain` ou `application` introduzido por uma task anterior e deve ser corrigido movendo o código para `infra`, nunca relaxando a regra.

- **Step 6: Add the cross-check script**

Em `apps/backend/package.json`, ao lado de `test:e2e:mongo`:

```json
"test:repository-contracts": "vitest --run --config ./test/vite.config.app-domain.ts .contract.test.ts && vitest run --config ./test/vite.config.integration.ts .contract.integration-test.ts mongo",
```

O script agrupa os contratos in-memory, Prisma e Mongo para uso manual do desenvolvedor; ele só é criado aqui e não faz parte dos passos de verificação desta task, que sempre nomeiam um arquivo. O filtro `.contract.test.ts` também casa o teste de enum `notification-type.contract.test.ts`, que é outro assunto.

- **Step 7: Commit** *(only when `workflow.auto_commit` is true — the implementer's prompt says so; otherwise skip this step and report the files instead.)*

```bash
git add apps/backend/.dependency-cruiser.js apps/backend/package.json apps/backend/test/fitness-function/mongo-isolation.fit-test.ts apps/backend/test/repository-contract/repository-contract-coverage.test.ts
git commit -m "test(backend): isolamento do driver mongodb e verificação cruzada dos contratos"
```

## Critérios de Sucesso

- AC-11 [unit]: WHEN `domain` ou `application` importam `mongodb` THEN o fitness test falha
- AC-10 [int]: WHEN os contract tests rodam THEN passam em in-memory, Prisma e Mongo
- Nesta task o AC-10 é garantido assim: cada uma das 10 suítes de contrato é invocada nos três lados, por arquivos com nome e sufixo esperados, e um helper novo sem registro falha. Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts test/repository-contract/repository-contract-coverage.test.ts`
- FR-019: os mesmos testes de contrato rodam contra in-memory, Prisma e Mongo.
- FR-020: os testes de integração de repositórios, DAOs e providers Mongo rodam contra um MongoDB real (`test:e2e:mongo` e `test:repository-contracts`).
- FR-021: a regra `no-domain-or-application-to-mongodb-driver` falha em `domain` e `application`, inclusive com `import type`, e permite `infra`.
- A verificação ignora as falhas preexistentes (duas falhas e um skip no fitness atual e uma falha em `test/contract/subscription.contract-test.ts`): estão fora de escopo, não foram consertadas nem escondidas e estão registradas em comentário no teste de fitness.
