# Task 2: Adicionar dependências 3D e utilitários de coordenadas do globo [FR-003, FR-013]

**Status:** PENDING
**PRD:** `../prd/prd-weather-globe-clima.md`
**Spec:** `../specs/weather-globe-clima-design.md`
**Tier:** standard
**Depends on:** N/A

## Visão Geral

O globo 3D precisa converter `latitude`/`longitude` (graus) em um ponto no espaço 3D para posicionar o marcador sobre uma esfera, e em ângulos de rotação para que o globo "olhe" para esse ponto. Esta task adiciona as dependências `@react-three/fiber` e `three` ao frontend (sem `@react-three/drei`, conforme D1 da spec) e cria um utilitário puro e testável (`globe-coordinates.ts`) com essas duas conversões, sem depender de WebGL/Canvas — testável em Node/happy-dom.

## Arquivos

- Modify: `apps/frontend/package.json`
- Modify: `pnpm-lock.yaml`
- Create: `apps/frontend/src/features/weather/lib/globe-coordinates.ts`
- Test: `apps/frontend/src/features/weather/lib/globe-coordinates.test.ts`

### Conformidade com as Skills Padrão

- `no-workarounds`: as fórmulas de conversão devem ser reais (projeção esférica padrão), não valores fixos/mockados para passar nos testes.
- `test-antipatterns`: testar o comportamento observável das funções puras (valores retornados), não mockar `Math.sin`/`Math.cos` ou reimplementar a fórmula dentro do teste.
- `typescript-advanced`: tipos explícitos para os retornos (`Vector3Like`, `{ x: number; y: number }`), sem `any`.
- `vercel-react-best-practices`: manter o utilitário livre de imports de `react`/`three` em runtime — apenas `number`/objetos simples — para não acoplar o bundle 3D a um módulo que pode ser importado fora do componente client-only.
- `vitest`: testes unitários das funções puras com `toBeCloseTo` para tolerância de ponto flutuante.

## Passos

- **Step 1: Add the 3D dependencies**

Run: `pnpm --filter frontend add @react-three/fiber three`
Expected: `apps/frontend/package.json` ganha `@react-three/fiber` e `three` em `dependencies`; `pnpm-lock.yaml` é atualizado. Não adicione `@react-three/drei` — os controles de câmera desta feature são implementados manualmente na Task 5.

- **Step 2: Write the failing test**

```ts
// apps/frontend/src/features/weather/lib/globe-coordinates.test.ts
import { describe, expect, test } from "vitest"
import { latLonToVector3, rotationForCoordinate } from "./globe-coordinates"

describe("latLonToVector3", () => {
	test("converte lat/lon 0,0 para o ponto de referência do meridiano de Greenwich no equador", () => {
		const point = latLonToVector3(0, 0, 1)

		expect(point.x).toBeCloseTo(1, 5)
		expect(point.y).toBeCloseTo(0, 5)
		expect(point.z).toBeCloseTo(0, 5)
	})

	test("converte lat/lon do polo norte (90, 0) para o topo da esfera", () => {
		const point = latLonToVector3(90, 0, 1)

		expect(point.x).toBeCloseTo(0, 5)
		expect(point.y).toBeCloseTo(1, 5)
		expect(point.z).toBeCloseTo(0, 5)
	})

	test("converte lat/lon de São Paulo respeitando o raio informado", () => {
		const point = latLonToVector3(-23.5505, -46.6333, 1)

		expect(point.x).toBeCloseTo(0.6294715843131387, 5)
		expect(point.y).toBeCloseTo(-0.3995572026820798, 5)
		expect(point.z).toBeCloseTo(0.6664229635353052, 5)
	})
})

describe("rotationForCoordinate", () => {
	test("retorna rotação nula em x e 180 graus em y para lat/lon 0,0", () => {
		const rotation = rotationForCoordinate(0, 0)

		expect(rotation.x).toBeCloseTo(0, 5)
		expect(rotation.y).toBeCloseTo(-Math.PI, 5)
	})

	test("retorna rotação proporcional às coordenadas de São Paulo", () => {
		const rotation = rotationForCoordinate(-23.5505, -46.6333)

		expect(rotation.x).toBeCloseTo(-0.4110337654909245, 5)
		expect(rotation.y).toBeCloseTo(-2.3276880275195215, 5)
	})
})
```

- **Step 3: Run test to verify it fails**

Run: `cd apps/frontend && npx vitest run src/features/weather/lib/globe-coordinates.test.ts`
Expected: FAIL with "Failed to resolve import \"./globe-coordinates\"" (o módulo ainda não existe)

- **Step 4: Write minimal implementation**

```ts
// apps/frontend/src/features/weather/lib/globe-coordinates.ts
export interface Vector3Like {
	x: number
	y: number
	z: number
}

export interface GlobeRotation {
	x: number
	y: number
}

/**
 * Converte latitude/longitude (graus) em um ponto cartesiano sobre uma
 * esfera de raio `radius`, usando a projeção esférica padrão (mesma
 * convenção usada por globos 3D: longitude 0 aponta para +x no equador).
 */
export function latLonToVector3(
	latitude: number,
	longitude: number,
	radius: number,
): Vector3Like {
	const phi = ((90 - latitude) * Math.PI) / 180
	const theta = ((longitude + 180) * Math.PI) / 180

	return {
		x: -radius * Math.sin(phi) * Math.cos(theta),
		y: radius * Math.cos(phi),
		z: radius * Math.sin(phi) * Math.sin(theta),
	}
}

/**
 * Calcula a rotação (em radianos, eixos x/y) que um grupo Three.js precisa
 * aplicar para que o ponto lat/lon informado fique voltado para a câmera,
 * assumindo a câmera posicionada no eixo +z olhando para a origem.
 */
export function rotationForCoordinate(
	latitude: number,
	longitude: number,
): GlobeRotation {
	return {
		x: (latitude * Math.PI) / 180,
		y: -((longitude + 180) * Math.PI) / 180,
	}
}
```

- **Step 5: Run test to verify it passes**

Run: `cd apps/frontend && npx vitest run src/features/weather/lib/globe-coordinates.test.ts`
Expected: PASS (5 tests)

- **Step 6: Commit** *(sequential execution only — em wave paralela, pule este passo e reporte os arquivos alterados ao orquestrador.)*

```bash
git add apps/frontend/package.json pnpm-lock.yaml \
  apps/frontend/src/features/weather/lib/globe-coordinates.ts \
  apps/frontend/src/features/weather/lib/globe-coordinates.test.ts
git commit -m "feat(weather): add three/r3f deps and globe coordinate utilities"
```

## Critérios de Sucesso

- `@react-three/fiber` e `three` estão em `apps/frontend/package.json`; `@react-three/drei` não foi adicionado.
- `latLonToVector3` converte lat/lon/raio em `{x,y,z}` cartesiano correto para os pontos de referência testados.
- `rotationForCoordinate` converte lat/lon em radianos `{x,y}` sem depender de `three`/`react` em runtime.
- Os testes passam isoladamente com `npx vitest run src/features/weather/lib/globe-coordinates.test.ts`.
