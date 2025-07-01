import { serverBuild } from '@/bootstrap/server-build'
import { container } from '@/shared/infra/ioc/container'
import { SHARED_TYPES } from '@/shared/infra/ioc/types'
import { FastifyAdapter } from '@/shared/infra/server/fastify-adapter'

export async function serverBuildForTest(): Promise<FastifyAdapter> {
  container
    .rebindSync(SHARED_TYPES.Server.Fastify)
    .to(FastifyAdapter)
    .inSingletonScope()
  return serverBuild()
}
