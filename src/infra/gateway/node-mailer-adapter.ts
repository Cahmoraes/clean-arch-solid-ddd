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
  private async init() {
    const testAccount = await nodemailer.createTestAccount()
    this.transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
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
    console.log('****** sendMail ******')
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
    console.log('****** email ******')
    sendMailWithRetry
      .run(mailOptions)
      .then((mailResponse) => {
        console.log('aqui')
        this.fireAndForgetSendMail(mailResponse)
      })
      .catch(() => {
        this.logger.error(this, 'Failed to send email:')
      })
  }

  private async fireAndForgetSendMail(mailResponse: any): Promise<void> {
    console.log(`Email sent ${mailResponse.messageId}`)
    const testMessageURL = nodemailer.getTestMessageUrl(mailResponse)
    this.logger.info(this, `Preview URL: ${testMessageURL}`)
  }
}
