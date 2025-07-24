/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { CachePolicy, DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import { AddressNotFoundError } from '../../../../public/errors'
import { EmailAccountService } from '../../entities/account/emailAccountService'
import { EmailMessageService } from '../../entities/message/emailMessageService'
import { EmailMessageOperationFailureResult } from '../../../../public'

/**
 * Input for `DeleteDraftEmailMessagesUseCase` use case.
 *
 * @interface DeleteDraftEmailMessageUseCaseInput
 * @property {Set<string>} ids Identifiers of draft email messages to be deleted.
 * @property {string} emailAddressId Identifier of the email address associated with the
 *  draft email messages.
 */
interface DeleteDraftEmailMessagesUseCaseInput {
  ids: Set<string>
  emailAddressId: string
}

/**
 * Output for `DeleteDraftEmailMessagesUseCase` use case.
 *
 * @interface DeleteDraftEmailMessagesUseCaseOutput
 * @property {string[]} successIds Result list of identifiers of draft email messages
 *  that were successfully deleted.
 * @property {EmailMessageOperationFailureResult[]} failureMessages Result of list of draft
 *  email messages that failed to delete.
 */
interface DeleteDraftEmailMessagesUseCaseOutput {
  successIds: string[]
  failureMessages: EmailMessageOperationFailureResult[]
}

/**
 * Application business logic for deleting multiple draft email messages at once.
 */
export class DeleteDraftEmailMessagesUseCase {
  private readonly log: Logger

  constructor(
    private readonly emailAccountService: EmailAccountService,
    private readonly emailMessageService: EmailMessageService,
  ) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute({
    ids,
    emailAddressId,
  }: DeleteDraftEmailMessagesUseCaseInput): Promise<DeleteDraftEmailMessagesUseCaseOutput> {
    this.log.debug(this.constructor.name, { ids, emailAddressId })
    const account = await this.emailAccountService.get({
      id: emailAddressId,
      cachePolicy: CachePolicy.RemoteOnly,
    })
    if (!account) {
      throw new AddressNotFoundError()
    }
    if (!ids.size) {
      return { successIds: [], failureMessages: [] }
    }

    const successIds: string[] = []
    const failureIds: EmailMessageOperationFailureResult[] = []
    const results = await this.emailMessageService.deleteDrafts({
      emailAddressId,
      ids: [...ids],
    })
    const errorMap: Map<string, string> = new Map()
    results.forEach((result) => errorMap.set(result.id, result.reason))
    ids.forEach((id) => {
      const errorType = errorMap.get(id)
      if (errorType) {
        failureIds.push({
          id,
          errorType,
        })
      } else {
        successIds.push(id)
      }
    })
    successIds.forEach((id) => {
      void (async () => {
        try {
          await this.emailMessageService.cancelScheduledDraftMessage({
            id,
            emailAddressId,
          })
        } catch (e) {
          this.log.warn(`Failed to cancel scheduled draft ${id}: ${e}`)
        }
      })()
    })
    return {
      failureMessages: failureIds,
      successIds,
    }
  }
}
