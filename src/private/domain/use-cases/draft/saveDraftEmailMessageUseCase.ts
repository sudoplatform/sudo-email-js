import { CachePolicy, DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import { AddressNotFoundError } from '../../../../public/errors'
import { EmailAccountService } from '../../entities/account/emailAccountService'
import { EmailMessageService } from '../../entities/message/emailMessageService'

/**
 * Input for `SaveDraftEmailMessageUseCase` use case.
 *
 * @interface SaveDraftEmailMessageUseCaseInput
 * @property {ArrayBuffer} rfc822Data RFC 822 formatted data of the draft email message to save.
 * @property {string} senderEmailAddressId Identifier of the sender email address that is composing the draft email message.
 */
interface SaveDraftEmailMessageUseCaseInput {
  rfc822Data: ArrayBuffer
  senderEmailAddressId: string
}

interface SaveDraftEmailMessageUseCaseOutput {
  id: string
  updatedAt: Date
}
/**
 * Application business logic for saving a draft email message.
 */
export class SaveDraftEmailMessageUseCase {
  private readonly log: Logger

  constructor(
    private readonly emailAccountService: EmailAccountService,
    private readonly emailMessageService: EmailMessageService,
  ) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute({
    rfc822Data,
    senderEmailAddressId,
  }: SaveDraftEmailMessageUseCaseInput): Promise<SaveDraftEmailMessageUseCaseOutput> {
    this.log.debug(this.constructor.name, { rfc822Data, senderEmailAddressId })
    const account = await this.emailAccountService.get({
      id: senderEmailAddressId,
      cachePolicy: CachePolicy.RemoteOnly,
    })
    if (!account) {
      throw new AddressNotFoundError()
    }
    const metadata = await this.emailMessageService.saveDraft({
      rfc822Data,
      senderEmailAddressId,
    })
    return metadata
  }
}
