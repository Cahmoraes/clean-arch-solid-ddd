export const QUEUES = {
  SEND_WELCOME_EMAIL: 'sendWelcomeEmail',
  NOTIFY_PASSWORD_CHANGED: 'notifyPasswordChanged',
  LOG: 'log',
} as const

export type Queues = (typeof QUEUES)[keyof typeof QUEUES]
