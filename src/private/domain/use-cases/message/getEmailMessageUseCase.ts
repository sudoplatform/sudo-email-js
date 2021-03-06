import { CachePolicy, DefaultLogger } from '@sudoplatform/sudo-common'
import { Direction, State } from '../../../../public/typings/emailMessage'
import { EmailMessageService } from '../../entities/message/emailMessageService'

/**
 * Input for `GetEmailMessageUseCase` use case.
 *
 * @interface GetEmailMessageInput
 * @property {string} id The identifier of the email message to attempt to retrieve.
 * @property {string} keyId The identifier of the key used to seal the email message.
 * @property {CachePolicy} cachePolicy Cache policy determines the strategy for accessing the email message record.
 */
interface GetEmailMessageUseCaseInput {
  id: string
  cachePolicy?: CachePolicy
}
interface GetEmailMessageUseCaseOutput {
  id: string
  owner: string
  owners: Array<{ id: string; issuer: string }>
  emailAddressId: string
  keyId: string
  algorithm: string
  folderId: string
  previousFolderId?: string
  seen: boolean
  direction: Direction
  state: State
  clientRefId?: string
  from: Array<{ emailAddress: string; displayName?: string }>
  to: Array<{ emailAddress: string; displayName?: string }>
  cc: Array<{ emailAddress: string; displayName?: string }>
  bcc: Array<{ emailAddress: string; displayName?: string }>
  replyTo: Array<{ emailAddress: string; displayName?: string }>
  subject?: string
  hasAttachments: boolean
  version: number
  sortDate: Date
  createdAt: Date
  updatedAt: Date
  status: { type: 'Completed' } | { type: 'Failed'; cause: Error }
  size: number
}

/**
 * Application business logic for retrieving an email message.
 */
export class GetEmailMessageUseCase {
  private readonly log = new DefaultLogger(this.constructor.name)
  constructor(private readonly emailMessageService: EmailMessageService) {}

  async execute({
    id,
    cachePolicy,
  }: GetEmailMessageUseCaseInput): Promise<
    GetEmailMessageUseCaseOutput | undefined
  > {
    this.log.debug(this.constructor.name, {
      id,
      cachePolicy,
    })
    return await this.emailMessageService.getMessage({
      id,
      cachePolicy,
    })
  }
}
