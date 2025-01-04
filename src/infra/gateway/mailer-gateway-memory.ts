import { injectable } from 'inversify'

import type { MailerGateway } from './mailer-gateway'

@injectable()
export class MailerGatewayMemory implements MailerGateway {
  public async sendMail(
    to: string,
    subject: string,
    body: string,
  ): Promise<void> {
    console.log('Sending email to', to)
    console.log('Subject:', subject)
    console.log('Body:', body)
  }
}
