import { CachePolicy, DefaultLogger } from '@sudoplatform/sudo-common'
import { AddressNotFoundError, MessageNotFoundError } from '../../../../public'
import { EmailAccountService } from '../../entities/account/emailAccountService'
import { EmailMessageService } from '../../entities/message/emailMessageService'

/**
 * Input for `UpdateDraftEmailMessageUseCase` use case.
 *
 * @interface UpdateDraftEmailMessageInput
 * @property {string} id The identifier of the draft email message to update.
 * @property {ArrayBuffer} rfc822Data RFC 822 formatted data of the draft email message. This will completely replace the existing data.
 * @property {string} senderEmailAddressId Identifier of the sender email address that is composing the draft email message.
 */
interface UpdateDraftEmailMessageUseCaseInput {
  id: string
  rfc822Data: ArrayBuffer
  senderEmailAddressId: string
}

/**
 * Application business logic for updating a draft email message.
 */
export class UpdateDraftEmailMessageUseCase {
  private readonly log = new DefaultLogger(this.constructor.name)

  constructor(
    private readonly emailAccountService: EmailAccountService,
    private readonly emailMessageService: EmailMessageService,
  ) {}

  async execute({
    id,
    rfc822Data,
    senderEmailAddressId,
  }: UpdateDraftEmailMessageUseCaseInput): Promise<string> {
    this.log.debug(this.constructor.name, {
      id,
      rfc822Data,
      senderEmailAddressId,
    })
    const account = await this.emailAccountService.get({
      id: senderEmailAddressId,
      cachePolicy: CachePolicy.RemoteOnly,
    })
    if (!account) {
      throw new AddressNotFoundError()
    }
    const draft = await this.emailMessageService.getDraft({
      id,
      emailAddressId: senderEmailAddressId,
    })
    if (!draft) {
      throw new MessageNotFoundError()
    }
    const draftId = await this.emailMessageService.saveDraft({
      rfc822Data,
      senderEmailAddressId,
      id,
    })
    return draftId
  }
}
