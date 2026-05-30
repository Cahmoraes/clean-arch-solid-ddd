"use client"

import { fetchEventSource } from "@microsoft/fetch-event-source"
import { useEffect, useRef } from "react"
import { getAuthSnapshot } from "@/lib/auth/auth-store"

export interface NotificationStreamPayload {
	notificationId: string
	userId: string
	type: string
	title: string
	message: string
}

export interface SseMessage {
	type: "notification" | "connected"
	payload?: NotificationStreamPayload
	userId?: string
}

export interface UseNotificationStreamOptions {
	enabled: boolean
	onMessage: (message: SseMessage) => void
}

const SSE_URL = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"}/api/v1/notifications/stream`

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null
}

function isNotificationStreamPayload(
	value: unknown,
): value is NotificationStreamPayload {
	if (!isRecord(value)) return false
	return (
		typeof value.notificationId === "string" &&
		typeof value.userId === "string" &&
		typeof value.type === "string" &&
		typeof value.title === "string" &&
		typeof value.message === "string"
	)
}

function hasOptionalUserId(value: Record<string, unknown>): boolean {
	return typeof value.userId === "undefined" || typeof value.userId === "string"
}

function hasOptionalPayload(value: Record<string, unknown>): boolean {
	return (
		typeof value.payload === "undefined" ||
		isNotificationStreamPayload(value.payload)
	)
}

function isConnectedMessage(value: Record<string, unknown>): boolean {
	return (
		value.type === "connected" &&
		typeof value.payload === "undefined" &&
		hasOptionalUserId(value)
	)
}

function isNotificationMessage(value: Record<string, unknown>): boolean {
	return (
		value.type === "notification" &&
		hasOptionalPayload(value) &&
		hasOptionalUserId(value)
	)
}

function isSseMessage(value: unknown): value is SseMessage {
	if (!isRecord(value)) return false
	return isConnectedMessage(value) || isNotificationMessage(value)
}

function parseSseMessage(data: string): SseMessage | null {
	try {
		const message: unknown = JSON.parse(data)
		if (!isSseMessage(message)) return null
		return message
	} catch {
		return null
	}
}

export function useNotificationStream({
	enabled,
	onMessage,
}: UseNotificationStreamOptions): void {
	const abortControllerRef = useRef<AbortController | null>(null)
	const onMessageRef = useRef(onMessage)
	useEffect(() => {
		onMessageRef.current = onMessage
	}, [onMessage])
	useEffect(() => {
		if (!enabled) return
		const controller = new AbortController()
		abortControllerRef.current = controller
		const { accessToken } = getAuthSnapshot()
		void fetchEventSource(SSE_URL, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${accessToken ?? ""}`,
				Accept: "text/event-stream",
			},
			signal: controller.signal,
			onmessage(event) {
				const message = parseSseMessage(event.data)
				if (!message) return
				onMessageRef.current(message)
			},
			onerror(error) {
				if (controller.signal.aborted) throw error
			},
		}).catch(() => {
			// Connection ended.
		})
		return () => {
			controller.abort()
			if (abortControllerRef.current === controller) {
				abortControllerRef.current = null
			}
		}
	}, [enabled])
}
