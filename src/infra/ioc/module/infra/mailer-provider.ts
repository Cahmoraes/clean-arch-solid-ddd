import type { ResolutionContext } from 'inversify'

import { isProduction } from '@/infra/env'
import type { MailerGateway } from '@/infra/gateway/mailer-gateway'
import { MailerGatewayMemory } from '@/infra/gateway/mailer-gateway-memory'
import { NodeMailerAdapter } from '@/infra/gateway/node-mailer-adapter'

export class MailerProvider {
  public static provide(context: ResolutionContext): MailerGateway {
    return isProduction()
      ? context.get(NodeMailerAdapter)
      : context.get(MailerGatewayMemory)
  }
}
