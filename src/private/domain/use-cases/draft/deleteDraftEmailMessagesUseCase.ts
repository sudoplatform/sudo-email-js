/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { CachePolicy, DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import { AddressNotFoundError } from '../../../../public/errors'
import { EmailAccountService } from '../../entities/account/emailAccountService'
import {
  EmailMessageService,
  EmailMessageServiceDeleteDraftError,
} from '../../entities/message/emailMessageService'
import { EmailMessageOperationFailureResult } from '../../../../public'
import { divideArray } from '../../../util/array'

/**
 * Input for `DeleteDraftEmailMessagesUseCase` use case.
 *
 * @interface DeleteDraftEmailMessageUseCaseInput
 * @property {Set<string>} ids Identifiers of draft email messages to be deleted.
 * @property {string} emailAddressId Identifier of the email address associated with the draft email messages.
 */
interface DeleteDraftEmailMessagesUseCaseInput {
  ids: Set<string>
  emailAddressId: string
}

/**
 * Output for `DeleteDraftEmailMessagesUseCase` use case.
 *
 * @interface DeleteDraftEmailMessageUseCaseOutput
 * @property {string[]} successIds Identifiers of draft email messages that were successfully deleted.
 * @property {EmailMessageOperationFailureResult[]} failureIds Identifiers of draft email messages that failed to delete.
 */
interface DeleteDraftEmailMessagesUseCaseOutput {
  successIds: string[]
  failureIds: EmailMessageOperationFailureResult[]
}

/**
 * Application business logic for deleting multiple draft email messages at once.
 */
export class DeleteDraftEmailMessagesUseCase {
  private readonly log: Logger
  private readonly Configuration = {
    // Max limit of number of ids that can be deleted per request.
    IdsSizeLimit: 10,
  }

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
    this.log.debug(this.constructor.name, { ids })
    const account = await this.emailAccountService.get({
      id: emailAddressId,
      cachePolicy: CachePolicy.RemoteOnly,
    })
    if (!account) {
      throw new AddressNotFoundError()
    }
    if (!ids.size) {
      return { successIds: [], failureIds: [] }
    }
    const batches = divideArray([...ids], 10)

    const successIds: string[] = []
    const failureIds: EmailMessageOperationFailureResult[] = []
    while (batches.length > 0) {
      const batch = batches.pop()
      if (batch && batch.length) {
        const results = await Promise.allSettled(
          batch?.map((id) =>
            this.emailMessageService.deleteDraft({ id, emailAddressId }),
          ),
        )
        results.forEach((r) => {
          if (r.status === 'fulfilled') {
            successIds.push(r.value)
          } else {
            if (r.reason instanceof EmailMessageServiceDeleteDraftError) {
              failureIds.push({ id: r.reason.id, errorType: r.reason.message })
            } else {
              this.log.error(
                'Unexpected error received while deleting draft message',
                { error: r.reason },
              )
            }
          }
        })
      }
    }

    return { failureIds, successIds }
  }
}
