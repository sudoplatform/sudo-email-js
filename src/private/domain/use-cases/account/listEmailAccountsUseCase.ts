import { CachePolicy, DefaultLogger } from '@sudoplatform/sudo-common'
import { EmailAccountService } from '../../entities/account/emailAccountService'
import { FolderUseCaseOutput } from '../shared/folder'

/**
 * Input for `ListEmailAccountsUseCase` use case.
 *
 * @interface ListEmailAccountsUseCaseInput
 * @property {CachePolicy} cachePolicy Cache policy determines the strategy for accessing the email account records.
 * @property {number} limit Number of records to return. If omitted, the limit defaults to 10.
 * @property {string} nextToken A token generated by a previous call. This allows for pagination.
 */
interface ListEmailAccountsUseCaseInput {
  cachePolicy?: CachePolicy
  limit?: number | undefined
  nextToken?: string | undefined
}

/**
 * Output for `ListEmailAccountsUseCase` use case.
 *
 * @interface ListEmailAccountsUseCaseOutput
 * @property {Array} emailAccounts The list of email accounts retrieved in this use case.
 * @property {string} nextToken A token generated by a previous call. This allows for pagination.
 */
interface ListEmailAccountsUseCaseOutput {
  emailAccounts: Array<{
    id: string
    owner: string
    owners: Array<{ id: string; issuer: string }>
    identityId: string
    keyRingId: string
    emailAddress: { emailAddress: string; alias?: string }
    size: number
    version: number
    createdAt: Date
    updatedAt: Date
    lastReceivedAt: Date | undefined
    status: { type: 'Completed' } | { type: 'Failed'; cause: Error }
    folders: Array<FolderUseCaseOutput>
  }>
  nextToken?: string
}

/**
 * Application business logic for listing email accounts.
 */
export class ListEmailAccountsUseCase {
  private readonly log = new DefaultLogger(this.constructor.name)
  constructor(private readonly emailAccountService: EmailAccountService) {}

  async execute(
    input?: ListEmailAccountsUseCaseInput,
  ): Promise<ListEmailAccountsUseCaseOutput> {
    this.log.debug(this.constructor.name, {
      input,
    })
    return await this.emailAccountService.list(input)
  }
}
