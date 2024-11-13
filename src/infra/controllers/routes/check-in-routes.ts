export const CheckInRoutes = {
  CREATE: '/check-ins',
  METRICS: '/check-ins/metrics/:userId',
  VALIDATE: '/check-ins/validate',
} as const

export type CheckInRoutesType =
  (typeof CheckInRoutes)[keyof typeof CheckInRoutes]
