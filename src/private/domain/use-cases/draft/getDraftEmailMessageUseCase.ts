import { DefaultLogger } from '@sudoplatform/sudo-common'
import { EmailMessageService } from '../../entities/message/emailMessageService'

/**
 * Input for `GetDraftEmailMessageUseCase` use case.
 *
 * @interface GetDraftEmailMessageUseCaseInput
 * @property {string} id Identifier of the draft email message to be retrieved.
 * @property {string} emailAddressId Identifier of the email address associated with the draft email message.
 */
interface GetDraftEmailMessageUseCaseInput {
  id: string
  emailAddressId: string
}

/**
 * Output for `GetDraftEmailMessageUseCase` use case.
 *
 * @interface GetDraftEmailMessageUseCaseOutput
 * @property {string} id Identifier of the draft email message.
 * @property {ArrayBuffer} rfc822Data RFC 822 formatted data of the draft email message.
 */
interface GetDraftEmailMessageUseCaseOutput {
  id: string
  rfc822Data: ArrayBuffer
}

/**
 * Application business logic for retrieving a draft email message.
 */
export class GetDraftEmailMessageUseCase {
  private readonly log = new DefaultLogger(this.constructor.name)

  constructor(private readonly emailMessageService: EmailMessageService) {}

  async execute({
    id,
    emailAddressId,
  }: GetDraftEmailMessageUseCaseInput): Promise<
    GetDraftEmailMessageUseCaseOutput | undefined
  > {
    this.log.debug(this.constructor.name, { id, emailAddressId })
    const message = await this.emailMessageService.getDraft({
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
