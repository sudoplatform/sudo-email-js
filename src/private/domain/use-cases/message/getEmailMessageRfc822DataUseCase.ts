import { DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import { EmailMessageService } from '../../entities/message/emailMessageService'

/**
 * Input for `GetEmailMessageRfc822DataUseCase` use case.
 *
 * @interface GetEmailMessageRfc822DataUseCaseInput
 * @property {string} id The identifier of the email message to be retrieved to access RFC 822 data.
 * @property {string} emailAddressId The identifier of the email address associated with the email message.
 */
interface GetEmailMessageRfc822DataUseCaseInput {
  id: string
  emailAddressId: string
}

/**
 * Output for `GetEmailMessageRfc822DataUseCase` use case.
 *
 * @interface GetEmailMessageRfc822DataUseCaseOutput
 * @property {string} id The identifier of the email message in which the RFC 822 data has been retrieved.
 * @property {ArrayBuffer} rfc822Data The RFC 822 data associated with the email message.
 */
interface GetEmailMessageRfc822DataUseCaseOutput {
  id: string
  rfc822Data: ArrayBuffer
}

/**
 * Application business logic for retrieving an email message RFC 822 data.
 */
export class GetEmailMessageRfc822DataUseCase {
  private readonly log: Logger

  constructor(private emailMessageService: EmailMessageService) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute({
    id,
    emailAddressId,
  }: GetEmailMessageRfc822DataUseCaseInput): Promise<
    GetEmailMessageRfc822DataUseCaseOutput | undefined
  > {
    this.log.debug(this.execute.name, { id, emailAddressId })

    const message = await this.emailMessageService.getEmailMessageRfc822Data({
      id,
      emailAddressId,
    })
    if (message) {
      return { id, rfc822Data: message }
    } else {
      return undefined
    }
  }
}
