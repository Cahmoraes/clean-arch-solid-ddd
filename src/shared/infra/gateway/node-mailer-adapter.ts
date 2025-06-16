import { inject, injectable } from 'inversify'
import nodemailer, { Transporter } from 'nodemailer'

import { Logger as LoggerDecorate } from '../decorator/logger'
import { TYPES } from '../ioc/types'
import type { Logger } from '../logger/logger'
import type { MailerGateway } from './mailer-gateway'
import { Retry } from './retry'

@injectable()
export class NodeMailerAdapter implements MailerGateway {
  private transporter?: Transporter

  constructor(@inject(TYPES.Logger) private readonly logger: Logger) {
    this.init()
  }

  @LoggerDecorate({
    message: '✅',
  })
  private async init(): Promise<void> {
    const testAccount = await nodemailer.createTestAccount()
    this.transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    })
  }

  public async sendMail(
    to: string,
    subject: string,
    text: string,
  ): Promise<void> {
    if (!this.transporter) await this.init()
    if (!this.transporter) throw new Error('Transporter not initialized')
    const mailOptions = {
      from: '"No Reply" <no-reply@test.com>',
      to,
      subject,
      text,
    }
    const sendMailWithRetry = Retry.wrap({
      callback: this.transporter.sendMail.bind(this.transporter),
      maxAttempts: 3,
      time: 1000,
    })
    sendMailWithRetry
      .run(mailOptions)
      .then((mailResponse) => {
        this.fireAndForgetSendMail(mailResponse)
      })
      .catch((e) => {
        this.logger.error(this, `Failed to send email: ${e}`)
      })
  }

  private async fireAndForgetSendMail(mailResponse: any): Promise<void> {
    this.logger.info(this, `Email sent ${mailResponse.messageId}`)
    const testMessageURL = nodemailer.getTestMessageUrl(mailResponse)
    this.logger.info(this, `Preview URL: ${testMessageURL}`)
  }
}
