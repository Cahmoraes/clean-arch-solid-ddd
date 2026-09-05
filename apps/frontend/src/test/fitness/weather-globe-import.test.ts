import { describe, expect, test } from "vitest"
import {
	findForbiddenStaticGlobeImports,
	hasForbiddenStaticGlobeImport,
} from "./weather-globe-static-import-guard"

describe("Fitness: módulos do globo não são importados estaticamente fora do next/dynamic", () => {
	test("nenhum arquivo além de weather-globe.tsx importa os módulos do globo estaticamente", () => {
		const violations = findForbiddenStaticGlobeImports()

		expect(violations).toEqual([])
	})

	test("detecta import estático de react-globe.gl", () => {
		const content = `import Globe from "react-globe.gl"`

		expect(hasForbiddenStaticGlobeImport(content)).toBe(true)
	})

	test("detecta import estático do módulo real do globo fora do next/dynamic", () => {
		const content = `import { WeatherGlobe } from "@/features/weather/components/weather-globe"`

		expect(hasForbiddenStaticGlobeImport(content)).toBe(true)
	})

	test("permite o carregamento via dynamic(() => import(...))", () => {
		const content = `const WeatherGlobeImpl = dynamic(
	() => import("./weather-globe").then((mod) => ({ default: mod.WeatherGlobe })),
	{ ssr: false },
)`

		expect(hasForbiddenStaticGlobeImport(content)).toBe(false)
	})

	test("detecta import estático com subpath: react-globe.gl/dist", () => {
		const content = `import Globe from "react-globe.gl/dist/react-globe.gl.min"`

		expect(hasForbiddenStaticGlobeImport(content)).toBe(true)
	})

	test("detecta import estático de three", () => {
		const content = `import { MeshPhongMaterial } from "three"`

		expect(hasForbiddenStaticGlobeImport(content)).toBe(true)
	})

	test("detecta import estático de subpath de three", () => {
		const content = `import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"`

		expect(hasForbiddenStaticGlobeImport(content)).toBe(true)
	})

	test("detecta import estático de three-globe e globe.gl", () => {
		expect(
			hasForbiddenStaticGlobeImport(`import ThreeGlobe from "three-globe"`),
		).toBe(true)
		expect(hasForbiddenStaticGlobeImport(`import Globe from "globe.gl"`)).toBe(
			true,
		)
	})

	test("detecta import estático sem `from` (side-effect only)", () => {
		expect(hasForbiddenStaticGlobeImport(`import "react-globe.gl"`)).toBe(true)
		expect(hasForbiddenStaticGlobeImport(`import 'three'`)).toBe(true)
	})

	test("detecta require do módulo do globo", () => {
		const content = `const Globe = require("react-globe.gl")`

		expect(hasForbiddenStaticGlobeImport(content)).toBe(true)
	})

	test("permite import estático dos módulos leves do globo", () => {
		const content = `import { GLOBE_SIZE_PX } from "@/features/weather/components/weather-globe-constants"
import { WeatherGlobeFallback } from "./weather-globe-fallback"
import { WeatherGlobe } from "@/features/weather/components/weather-globe-error-boundary"`

		expect(hasForbiddenStaticGlobeImport(content)).toBe(false)
	})
})
