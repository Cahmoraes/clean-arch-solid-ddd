import { serverBuild } from '@/bootstrap/server-build'
import { container } from '@/infra/ioc/container'
import { TYPES } from '@/infra/ioc/types'
import { FastifyAdapter } from '@/infra/server/fastify-adapter'

export async function serverBuildForTest(): Promise<FastifyAdapter> {
  container
    .rebindSync(TYPES.Server.Fastify)
    .to(FastifyAdapter)
    .inSingletonScope()
  return serverBuild()
}
