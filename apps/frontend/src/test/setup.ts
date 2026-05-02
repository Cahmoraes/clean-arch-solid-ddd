import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterAll, afterEach, beforeAll } from "vitest"
import { useAuthStore } from "@/lib/auth/auth-store"
import { resetTokenRefreshSchedulerForTests } from "@/lib/auth/token-refresh"
import { server } from "./msw/server"

beforeAll(() => {
	server.listen({ onUnhandledRequest: "error" })
})

afterEach(() => {
	cleanup()
	server.resetHandlers()
	useAuthStore.getState().clear()
	resetTokenRefreshSchedulerForTests()
})

afterAll(() => {
	server.close()
})
