import type { interfaces } from 'inversify'

import { isDevelopment } from '@/infra/env'
import { MailerGatewayMemory } from '@/infra/gateway/mailer-gateway-memory'
import { NodeMailerAdapter } from '@/infra/gateway/node-mailer-adapter'

export class MailerProvider {
  public static provide(context: interfaces.Context) {
    return isDevelopment()
      ? context.container.get(NodeMailerAdapter)
      : context.container.get(MailerGatewayMemory)
  }
}