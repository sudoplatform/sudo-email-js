/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import { LimitExceededError } from '../../../../public/errors'
import { EmailMessageService } from '../../entities/message/emailMessageService'
import { UpdateEmailMessagesStatus } from '../../entities/message/updateEmailMessagesStatus'
import {
  EmailMessageOperationFailureResult,
  UpdatedEmailMessageSuccess,
} from '../../../../public'
import { EmailConfigurationDataService } from '../../entities/configuration/configurationDataService'

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
 * @property {UpdatedEmailMessageSuccess[]} successMessages Identifiers of email messages that were successfully updated.
 * @property {EmailMessageOperationFailureResult[]} failureMessages Identifiers of email messages that failed to update.
 */
export interface UpdateEmailMessagesUseCaseOutput {
  status: UpdateEmailMessagesStatus
  successMessages?: UpdatedEmailMessageSuccess[]
  failureMessages?: EmailMessageOperationFailureResult[]
}

/**
 * Application business logic for updating multiple email messages at once.
 */
export class UpdateEmailMessagesUseCase {
  private readonly log: Logger

  public constructor(
    private readonly emailMessageService: EmailMessageService,
    private readonly configurationDataService: EmailConfigurationDataService,
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

    const { updateEmailMessagesLimit } =
      await this.configurationDataService.getConfigurationData()
    if (ids.size > updateEmailMessagesLimit) {
      throw new LimitExceededError(
        `Input cannot exceed ${updateEmailMessagesLimit}`,
      )
    }
    const res = await this.emailMessageService.updateMessages({
      ids: Array.from(ids),
      values,
    })
    return res
  }
}
