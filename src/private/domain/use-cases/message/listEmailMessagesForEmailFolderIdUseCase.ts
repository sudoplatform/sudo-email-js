import { CachePolicy, DefaultLogger } from '@sudoplatform/sudo-common'
import { DateRange } from '../../../../public/typings/dateRange'
import { Direction, State } from '../../../../public/typings/emailMessage'
import { SortOrder } from '../../../../public/typings/sortOrder'
import { EmailMessageService } from '../../entities/message/emailMessageService'

/**
 * Input for `ListEmailMessagesForEmailFolderIdUseCase` use case.
 *
 * @interface ListEmailMessagesForEmailFolderIdUseCaseInput
 * @property {string} folderId The identifier of the email folder associated with the email messages.
 * @property {CachePolicy} cachePolicy Cache policy determines the strategy for accessing the email message records.
 * @property {DateRange} dateRange Email messages created within the date range inclusive will be fetched.
 * @property {number} limit Number of records to return. If omitted, the limit defaults to 10.
 * @property {SortOrder} sortOrder The direction in which the email messages are sorted. Defaults to descending.
 * @property {string} nextToken A token generated by a previous call. This allows for pagination.
 */
interface ListEmailMessagesForEmailFolderIdUseCaseInput {
  folderId: string
  cachePolicy?: CachePolicy
  dateRange?: DateRange | undefined
  limit?: number | undefined
  sortOrder?: SortOrder | undefined
  nextToken?: string | undefined
}

/**
 * Output for `ListEmailMessagesForEmailFolderIdUseCase` use case.
 *
 * @property {Array} emailMessages The list of email messages retrieved in this use case.
 * @property {string} nextToken A token generated by a previous call. This allows for pagination.
 */
interface ListEmailMessagesForEmailFolderIdUseCaseOutput {
  emailMessages: Array<{
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
  }>
  nextToken?: string
}

/**
 * Application business logic for listing email messages for an email folder id.
 */
export class ListEmailMessagesForEmailFolderIdUseCase {
  private readonly log = new DefaultLogger(this.constructor.name)
  constructor(private readonly emailMessageService: EmailMessageService) {}

  async execute({
    folderId,
    cachePolicy,
    dateRange,
    limit,
    sortOrder,
    nextToken,
  }: ListEmailMessagesForEmailFolderIdUseCaseInput): Promise<ListEmailMessagesForEmailFolderIdUseCaseOutput> {
    this.log.debug(this.constructor.name, {
      folderId,
      cachePolicy,
      dateRange,
      limit,
      sortOrder,
      nextToken,
    })
    return await this.emailMessageService.listMessagesForEmailFolderId({
      folderId,
      cachePolicy,
      dateRange,
      limit,
      sortOrder,
      nextToken,
    })
  }
}
