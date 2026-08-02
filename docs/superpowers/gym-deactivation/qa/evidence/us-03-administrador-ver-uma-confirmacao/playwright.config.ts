import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
	testDir: "/home/cahmoraes/projects/estudo/clean-arch-solid-ddd/docs/superpowers/gym-deactivation/qa/evidence/us-03-administrador-ver-uma-confirmacao",
	testMatch: /.*\.spec\.ts/,
	fullyParallel: false,
	timeout: 60_000,
	use: {
		baseURL: "http://localhost:3000",
		trace: "off",
		screenshot: "off",
	},
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
})
