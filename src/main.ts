import 'reflect-metadata'

import { serverBuild } from '@/bootstrap/server-build'

import type { HttpServer } from './shared/infra/server/http-server'

async function main(): Promise<HttpServer> {
  const server = await serverBuild()
  await server.listen()
  return server
}

async function setupGracefulShutdown(server: HttpServer): Promise<void> {
  await server.close()
}

const server = await main()

process.on('SIGINT', () => setupGracefulShutdown(server))
process.on('SIGTERM', () => setupGracefulShutdown(server))
