import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  HookHandlerDoneFunction,
} from 'fastify'

import type { FastifyAdapter } from '../server/fastify-adapter'

export type Constructor = new (...args: any[]) => object

export function WithAuth(constructor: Constructor): any {
  return class extends constructor {
    constructor(...args: any[]) {
      super(...args)
      rewriteMethod(this, 'handle')
    }
  }
}

function rewriteMethod(context: any, method: string) {
  const originalMethod = context[method]
  if (typeof originalMethod === 'function') {
    context[method] = async function (httpServer: FastifyAdapter) {
      const server = httpServer.fastifyInstance
      server.addHook(
        'preHandler',
        (
          request: FastifyRequest,
          reply: FastifyReply,
          done: HookHandlerDoneFunction,
        ) => {
          console.log(request)
          done()
        },
      )
      return originalMethod.call(this, httpServer)
    }
  }
}
