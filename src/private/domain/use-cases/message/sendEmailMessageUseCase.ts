import { DefaultLogger } from '@sudoplatform/sudo-common'
import { EmailMessageService } from '../../entities/message/emailMessageService'

/**
 * Input for `SendEmailMessageUseCase` use case.
 *
 * @interface SendEmailMessageUseCaseInput
 * @property {ArrayBuffer} rfc822Data RFC 822 formatted email message data.
 * @property {string} senderEmailAddressId The identifier of the email address used to send the email.
 */
interface SendEmailMessageUseCaseInput {
  rfc822Data: ArrayBuffer
  senderEmailAddressId: string
}

/**
 * Application business logic for sending an email message.
 */
export class SendEmailMessageUseCase {
  private readonly log = new DefaultLogger(this.constructor.name)

  constructor(private readonly messageService: EmailMessageService) {}

  async execute({
    rfc822Data,
    senderEmailAddressId,
  }: SendEmailMessageUseCaseInput): Promise<string> {
    this.log.debug(this.constructor.name, { rfc822Data, senderEmailAddressId })
    return await this.messageService.sendMessage({
      rfc822Data,
      senderEmailAddressId,
    })
  }
}
