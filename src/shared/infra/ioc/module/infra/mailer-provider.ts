import type { ResolutionContext } from 'inversify'

import { isProduction } from '@/shared/infra/env'
import type { MailerGateway } from '@/shared/infra/gateway/mailer-gateway'
import { MailerGatewayMemory } from '@/shared/infra/gateway/mailer-gateway-memory'
import { NodeMailerAdapter } from '@/shared/infra/gateway/node-mailer-adapter'

export class MailerProvider {
  public static provide(context: ResolutionContext): MailerGateway {
    return isProduction()
      ? context.get(NodeMailerAdapter)
      : context.get(MailerGatewayMemory)
  }
}
