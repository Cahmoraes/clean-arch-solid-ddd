import { injectable } from 'inversify'
import nodemailer, { Transporter } from 'nodemailer'

import { Logger } from '../decorator/logger'
import type { MailerGateway } from './mailer-gateway'
import { Retry } from './retry'

@injectable()
export class NodeMailerAdapter implements MailerGateway {
  private transporter?: Transporter

  constructor() {
    this.init()
  }

  @Logger({
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
    const info = await sendMailWithRetry.run(mailOptions)
    console.log('Email sent: %s', info.messageId)
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info))
  }
}
