import { defineConfig, devices } from "@playwright/test"

const FRONTEND_PORT = Number(process.env.FRONTEND_PORT ?? 3000)
const BACKEND_PORT = Number(process.env.BACKEND_PORT ?? 3333)
const FRONTEND_BASE_URL =
	process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${FRONTEND_PORT}`
const BACKEND_BASE_URL =
	process.env.NEXT_PUBLIC_API_URL ?? `http://localhost:${BACKEND_PORT}`
const SERVER_TIMEOUT_MS = 120_000

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
	use: {
		baseURL: FRONTEND_BASE_URL,
		trace: "on-first-retry",
		screenshot: "only-on-failure",
		video: "retain-on-failure",
	},
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
	webServer: [
		{
			command: "pnpm --filter backend dev",
			url: `${BACKEND_BASE_URL}/health-check`,
			reuseExistingServer: !process.env.CI,
			timeout: SERVER_TIMEOUT_MS,
			stdout: "pipe",
			stderr: "pipe",
		},
		{
			command: "pnpm --filter frontend dev",
			url: FRONTEND_BASE_URL,
			reuseExistingServer: !process.env.CI,
			timeout: SERVER_TIMEOUT_MS,
			stdout: "pipe",
			stderr: "pipe",
			env: { NEXT_PUBLIC_API_URL: BACKEND_BASE_URL },
		},
	],
})
