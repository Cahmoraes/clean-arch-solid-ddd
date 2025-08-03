import type { FastifyRequest } from 'fastify'
import { inject, injectable } from 'inversify'

import type { Controller } from '@/shared/infra/controller/controller'
import { Logger } from '@/shared/infra/decorator/logger'
import type { StripeSubscriptionGateway } from '@/shared/infra/gateway/stripe-subscription-gateway'
import { SUBSCRIPTION_TYPES } from '@/shared/infra/ioc/module/service-identifier/subscription-types'
import { SHARED_TYPES } from '@/shared/infra/ioc/types'
import type {
  HandleCallbackResponse,
  HttpServer,
} from '@/shared/infra/server/http-server'

@injectable()
export class StripeWebhookController implements Controller {
  constructor(
    @inject(SHARED_TYPES.Server.Fastify)
    private readonly httpServer: HttpServer,
    @inject(SUBSCRIPTION_TYPES.GATEWAYS.Stripe)
    private readonly subscriptionGateway: StripeSubscriptionGateway,
  ) {
    this.bindMethod()
  }

  private bindMethod(): void {
    this.handler = this.handler.bind(this)
  }

  @Logger({
    message: '✅',
  })
  public async init(): Promise<void> {
    await this.httpServer.register('post', '/webhook/stripe', {
      callback: this.handler,
    })
  }

  private async handler(req: FastifyRequest): Promise<HandleCallbackResponse> {
    const signature = this.signatureFromHeaders(req.headers)
    console.log({ signature })
    if (!signature || !req.rawBody)
      return {
        body: req.rawBody,
        status: 200,
      }
    const event = await this.subscriptionGateway.createEventWebhook(
      req.rawBody,
      signature,
    )
    console.log({ event })
    return {
      body: req.rawBody,
      status: 200,
    }
  }

  private signatureFromHeaders(headers: Record<string, any>): string {
    return headers['stripe-signature']
  }
}
