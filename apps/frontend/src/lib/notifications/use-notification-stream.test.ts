import {
	type EventSourceMessage,
	type FetchEventSourceInit,
	fetchEventSource,
} from "@microsoft/fetch-event-source"
import { renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { useNotificationStream } from "./use-notification-stream"

vi.mock("@microsoft/fetch-event-source", () => ({
	fetchEventSource: vi.fn(),
}))

const { mockUseAuthStore } = vi.hoisted(() => ({
	mockUseAuthStore: vi.fn(),
}))

vi.mock("@/lib/auth/auth-store", () => ({
	useAuthStore: (
		selector: (state: { accessToken: string | null }) => unknown,
	) => mockUseAuthStore(selector),
}))

let authState: { accessToken: string | null } = { accessToken: "mock-token" }

function setAccessToken(accessToken: string | null): void {
	authState = { accessToken }
}

const notificationEvent: EventSourceMessage = {
	id: "event-1",
	event: "message",
	data: JSON.stringify({
		type: "notification",
		payload: {
			notificationId: "n-1",
			userId: "u-1",
			type: "CHECK_IN_APPROVED",
			title: "Aprovado",
			message: "Aprovado",
		},
	}),
}

describe("useNotificationStream", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		setAccessToken("mock-token")
		mockUseAuthStore.mockImplementation(
			(selector: (state: { accessToken: string | null }) => unknown) =>
				selector(authState),
		)
		vi.mocked(fetchEventSource).mockImplementation(
			async (_url: RequestInfo, options: FetchEventSourceInit) => {
				options.onmessage?.(notificationEvent)
				return new Promise<void>((_resolve, reject) => {
					options.signal?.addEventListener("abort", () => {
						reject(new Error("AbortError"))
					})
				})
			},
		)
	})

	test("deve chamar onMessage quando receber evento SSE", async () => {
		const onMessage = vi.fn()
		renderHook(() =>
			useNotificationStream({
				enabled: true,
				onMessage,
			}),
		)
		await waitFor(() =>
			expect(onMessage).toHaveBeenCalledWith(
				expect.objectContaining({ type: "notification" }),
			),
		)
	})

	test("deve enviar o Bearer token no header Authorization", async () => {
		renderHook(() =>
			useNotificationStream({
				enabled: true,
				onMessage: vi.fn(),
			}),
		)
		await waitFor(() => expect(fetchEventSource).toHaveBeenCalledOnce())
		expect(fetchEventSource).toHaveBeenCalledWith(
			"http://localhost:3333/api/v1/notifications/stream",
			expect.objectContaining({
				headers: {
					Accept: "text/event-stream",
					Authorization: "Bearer mock-token",
				},
			}),
		)
	})

	test("não deve conectar quando enabled=false", () => {
		renderHook(() =>
			useNotificationStream({
				enabled: false,
				onMessage: vi.fn(),
			}),
		)
		expect(fetchEventSource).not.toHaveBeenCalled()
	})

	test("deve abortar a conexão ao desmontar", async () => {
		const { unmount } = renderHook(() =>
			useNotificationStream({
				enabled: true,
				onMessage: vi.fn(),
			}),
		)
		await waitFor(() => expect(fetchEventSource).toHaveBeenCalledOnce())
		const options = vi.mocked(fetchEventSource).mock.calls[0]?.[1]
		unmount()
		expect(options?.signal?.aborted).toBe(true)
	})

	test("deve reconectar com o novo token quando o accessToken for atualizado no store", async () => {
		const { rerender } = renderHook(() =>
			useNotificationStream({
				enabled: true,
				onMessage: vi.fn(),
			}),
		)
		await waitFor(() => expect(fetchEventSource).toHaveBeenCalledOnce())
		const firstOptions = vi.mocked(fetchEventSource).mock.calls[0]?.[1]

		setAccessToken("refreshed-token")
		rerender()

		await waitFor(() => expect(fetchEventSource).toHaveBeenCalledTimes(2))
		expect(firstOptions?.signal?.aborted).toBe(true)
		expect(fetchEventSource).toHaveBeenNthCalledWith(
			2,
			"http://localhost:3333/api/v1/notifications/stream",
			expect.objectContaining({
				headers: {
					Accept: "text/event-stream",
					Authorization: "Bearer refreshed-token",
				},
			}),
		)
	})
})
