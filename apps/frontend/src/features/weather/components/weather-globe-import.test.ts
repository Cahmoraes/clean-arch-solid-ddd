import { describe, expect, test } from "vitest"
import {
	findForbiddenStaticGlobeImports,
	hasForbiddenStaticGlobeImport,
} from "./weather-globe-static-import-guard"

describe("Fitness: módulos do globo não são importados estaticamente fora do next/dynamic", () => {
	test("nenhum arquivo além de weather-globe.tsx e weather-globe-error-boundary.tsx importa os módulos do globo estaticamente", () => {
		const violations = findForbiddenStaticGlobeImports()

		expect(violations).toEqual([])
	})

	test("detecta import estático de react-globe.gl", () => {
		const content = `import Globe from "react-globe.gl"`

		expect(hasForbiddenStaticGlobeImport(content)).toBe(true)
	})

	test("detecta import estático do próprio WeatherGlobe fora do next/dynamic", () => {
		const content = `import { WeatherGlobe } from "@/features/weather/components/weather-globe-error-boundary"`

		expect(hasForbiddenStaticGlobeImport(content)).toBe(true)
	})

	test("permite o carregamento via dynamic(() => import(...))", () => {
		const content = `const WeatherGlobe = dynamic(
	() =>
		import("@/features/weather/components/weather-globe-error-boundary").then(
			(mod) => ({ default: mod.WeatherGlobe }),
		),
	{ ssr: false },
)`

		expect(hasForbiddenStaticGlobeImport(content)).toBe(false)
	})

	test("detecta import estático com subpath: react-globe.gl/dist", () => {
		const content = `import Globe from "react-globe.gl/dist/react-globe.gl.min"`

		expect(hasForbiddenStaticGlobeImport(content)).toBe(true)
	})
})
