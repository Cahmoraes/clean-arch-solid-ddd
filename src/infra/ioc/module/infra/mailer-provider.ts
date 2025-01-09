import type { interfaces } from 'inversify'

import { isDevelopment } from '@/infra/env'
import type { MailerGateway } from '@/infra/gateway/mailer-gateway'
import { MailerGatewayMemory } from '@/infra/gateway/mailer-gateway-memory'
import { NodeMailerAdapter } from '@/infra/gateway/node-mailer-adapter'

export class MailerProvider {
  public static provide(context: interfaces.Context): MailerGateway {
    return isDevelopment()
      ? context.container.get(MailerGatewayMemory)
      : context.container.get(NodeMailerAdapter)
  }
}
