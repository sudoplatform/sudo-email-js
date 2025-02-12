/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import {
  InvalidArgumentError,
  LimitExceededError,
} from '../../../../public/errors'
import { EmailMessageService } from '../../entities/message/emailMessageService'
import { EmailMessageOperationFailureResult } from '../../../../public'
import { EmailConfigurationDataService } from '../../entities/configuration/configurationDataService'

/**
 * Output for `DeleteEmailMessagesUseCase` use case.
 *
 * @interface DeleteEmailMessagesUseCaseOutput
 * @property {string[]} successIds Result list of identifiers of draft email messages
 *  that were successfully deleted.
 * @property {EmailMessageOperationFailureResult[]} failureMessages Result of list of email
 *  messages that failed to delete.
 */
interface DeleteEmailMessagesUseCaseOutput {
  successIds: string[]
  failureMessages: EmailMessageOperationFailureResult[]
}

/**
 * Application business logic for deleting multiple email messages at once.
 */
export class DeleteEmailMessagesUseCase {
  private readonly log: Logger

  constructor(
    private readonly emailMessageService: EmailMessageService,
    private readonly configurationDataService: EmailConfigurationDataService,
  ) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute(ids: Set<string>): Promise<DeleteEmailMessagesUseCaseOutput> {
    this.log.debug(this.constructor.name, {
      ids,
    })

    if (ids.size === 0) {
      throw new InvalidArgumentError()
    }
    const { deleteEmailMessagesLimit } =
      await this.configurationDataService.getConfigurationData()
    if (ids.size > deleteEmailMessagesLimit) {
      throw new LimitExceededError(
        `Input cannot exceed ${deleteEmailMessagesLimit}`,
      )
    }

    const failureIds = await this.emailMessageService.deleteMessages({
      ids: [...ids],
    })
    const successIds = [...ids].filter((id) => !failureIds.includes(id))
    const emailMessageFailureResults: EmailMessageOperationFailureResult[] =
      failureIds.map((id) => ({
        id,
        // We can't explicitly describe the reason for individual delete op failures
        // without reworking how the service handles message deletions.
        // So just provide a generic failure reason for all failed ids.
        errorType: 'Failed to delete email message',
      }))

    return {
      successIds,
      failureMessages: emailMessageFailureResults,
    }
  }
}
