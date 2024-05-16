/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import { LimitExceededError } from '../../../../public/errors'
import { EmailMessageService } from '../../entities/message/emailMessageService'
import { UpdateEmailMessagesStatus } from '../../entities/message/updateEmailMessagesStatus'
import {
  UpdatedEmailMessageFailure,
  UpdatedEmailMessageSuccess,
} from '../../../../public'

/**
 * Input for `UpdateEmailMessagesUseCase` use case.
 *
 * @interface UpdateEmailMessagesUseCaseInput
 * @property {Set<string>} id The identifiers of email messages to be updated.
 * @property values The new value(s) to set for each listed email message.
 */
interface UpdateEmailMessagesUseCaseInput {
  ids: Set<string>
  values: { folderId?: string; seen?: boolean }
}

/**
 * Output for `UpdateEmailMessagesUseCase` use case.
 *
 * @interface UpdateEmailMessagesUseCaseOutput
 * @property {UpdateEmailMessagesStatus} status Status of the email messages update operation.
 * @property {string[]} successIds Identifiers of email messages that were successfully updated.
 * @property {string[]} failureIds Identifiers of email messages that failed to update.
 */
export interface UpdateEmailMessagesUseCaseOutput {
  status: UpdateEmailMessagesStatus
  successMessages?: UpdatedEmailMessageSuccess[]
  failureMessages?: UpdatedEmailMessageFailure[]
}

/**
 * Application business logic for updating multiple email messages at once.
 */
export class UpdateEmailMessagesUseCase {
  private readonly log: Logger

  private readonly Defaults = {
    // Max limit of number of ids that can be updated per request.
    IdsSizeLimit: 100,
  }

  public constructor(
    private readonly emailMessageService: EmailMessageService,
  ) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute({
    ids,
    values,
  }: UpdateEmailMessagesUseCaseInput): Promise<UpdateEmailMessagesUseCaseOutput> {
    this.log.debug(this.constructor.name, { ids, values })
    if (!ids.size) {
      return {
        status: UpdateEmailMessagesStatus.Success,
      }
    }
    if (ids.size > this.Defaults.IdsSizeLimit) {
      throw new LimitExceededError(
        `Input cannot exceed ${this.Defaults.IdsSizeLimit}`,
      )
    }
    const res = await this.emailMessageService.updateMessages({
      ids: Array.from(ids),
      values,
    })
    return res
  }
}
