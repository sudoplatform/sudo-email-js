/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { CachePolicy, DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import { EmailAccountService } from '../../entities/account/emailAccountService'
import { EmailMessageService } from '../../entities/message/emailMessageService'
import { AddressNotFoundError } from '../../../../public'

/**
 * Input for `CancelScheduledDraftMessageUseCase`
 *
 * @interface CancelScheduledDraftMessageUseCaseInput
 * @property {string} id The identifier of the draft message to cancel
 * @property {string} emailAddressId The identifier of the email address that owns the message.
 */
interface CancelScheduledDraftMessageUseCaseInput {
  id: string
  emailAddressId: string
}

export class CancelScheduledDraftMessageUseCase {
  private readonly log: Logger

  constructor(
    private readonly emailAccountService: EmailAccountService,
    private readonly emailMessageService: EmailMessageService,
  ) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute({
    id,
    emailAddressId,
  }: CancelScheduledDraftMessageUseCaseInput): Promise<string> {
    this.log.debug(this.execute.name, { id, emailAddressId })
    const account = await this.emailAccountService.get({
      id: emailAddressId,
      cachePolicy: CachePolicy.RemoteOnly,
    })
    if (!account) {
      throw new AddressNotFoundError()
    }

    return await this.emailMessageService.cancelScheduledDraftMessage({
      id,
      emailAddressId,
    })
  }
}
