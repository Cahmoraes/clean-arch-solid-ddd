export const QUEUES = {
	SEND_WELCOME_EMAIL: "sendWelcomeEmail",
	NOTIFY_PASSWORD_CHANGED: "notifyPasswordChanged",
	LOG: "log",
	CHECK_IN: "checkIn",
} as const

export type Queues = (typeof QUEUES)[keyof typeof QUEUES]
