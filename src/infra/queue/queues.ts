export const QUEUES = {
  SEND_WELCOME_EMAIL: 'sendWelcomeEmail',
  LOG: 'log',
} as const

export type Queues = (typeof QUEUES)[keyof typeof QUEUES]
