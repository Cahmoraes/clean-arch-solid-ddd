import { injectable } from 'inversify'
import nodemailer, { Transporter } from 'nodemailer'

import { Logger } from '../decorators/logger'
import type { MailerGateway } from './mailer-gateway'

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
      secure: false, // false para TLS
      auth: {
        user: testAccount.user, // Usuário gerado
        pass: testAccount.pass, // Senha gerada
      },
    })
  }

  public async sendMail(
    to: string,
    subject: string,
    text: string,
  ): Promise<void> {
    if (!this.transporter) {
      throw new Error('Transporter not initialized yet.')
    }
    const mailOptions = {
      from: '"No Reply" <no-reply@test.com>', // Remetente fictício
      to, // Destinatário
      subject, // Assunto
      text, // Corpo em texto
    }
    const info = await this.transporter.sendMail(mailOptions)
    // Visualizar o e-mail em URL de pré-visualização
    console.log('Email sent: %s', info.messageId)
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info))
  }
}
