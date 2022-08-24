import { DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import { LimitExceededError } from '../../../../public/errors'
import { EmailMessageService } from '../../entities/message/emailMessageService'

/**
 * Output for `DeleteEmailMessagesUseCase` use case.
 *
 * @property {string[]} successIds Identifiers of email messages that were successfully deleted.
 * @property {string[]} failureIds dentifiers of email messages that failed to delete.
 */
interface DeleteEmailMessagesUseCaseOutput {
  successIds: string[]
  failureIds: string[]
}

/**
 * Application business logic for deleting multiple email messages at once.
 */
export class DeleteEmailMessagesUseCase {
  private readonly log: Logger

  private readonly Configuration = {
    // Max limit of number of ids that can be deleted per request.
    IdsSizeLimit: 100,
  }

  constructor(private readonly emailMessageService: EmailMessageService) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute(ids: Set<string>): Promise<DeleteEmailMessagesUseCaseOutput> {
    this.log.debug(this.constructor.name, {
      limit: this.Configuration.IdsSizeLimit,
    })
    if (!ids.size) {
      return {
        successIds: [],
        failureIds: [],
      }
    }
    if (ids.size > this.Configuration.IdsSizeLimit) {
      throw new LimitExceededError(
        `Input cannot exceed ${this.Configuration.IdsSizeLimit}`,
      )
    }
    const failureIds = await this.emailMessageService.deleteMessages({
      ids: [...ids],
    })
    const successIds = [...ids].filter((id) => !failureIds.includes(id))
    return { successIds, failureIds }
  }
}
