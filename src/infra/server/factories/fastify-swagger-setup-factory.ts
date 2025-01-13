import type { FastifyDynamicSwaggerOptions } from '@fastify/swagger'

import { env } from '@/infra/env'

export class FastifySwaggerSetupFactory {
  public static create(): Pick<FastifyDynamicSwaggerOptions, 'openapi'> {
    return {
      openapi: {
        openapi: '3.0.0',
        info: {
          title: 'API Documentation',
          version: '1.0.0',
        },
        servers: [
          {
            url: `http://localhost:${env.PORT}`,
            description: 'Development server',
          },
        ],
        tags: [
          { name: 'users', description: 'User related end-points' },
          { name: 'gyms', description: 'Gym related end-points' },
        ],
      },
    }
  }
}
