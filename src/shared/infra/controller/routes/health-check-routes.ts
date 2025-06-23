const PREFIX = '/health-check'

export const HealthCheckRoutes = {
  check: `${PREFIX}`,
} as const

export type HealthCheckRoutes =
  (typeof HealthCheckRoutes)[keyof typeof HealthCheckRoutes]
