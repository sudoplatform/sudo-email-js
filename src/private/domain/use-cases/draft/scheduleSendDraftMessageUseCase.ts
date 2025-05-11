/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CachePolicy,
  DefaultLogger,
  Logger,
  Owner,
} from '@sudoplatform/sudo-common'
import {
  AddressNotFoundError,
  InvalidArgumentError,
  ScheduledDraftMessageState,
} from '../../../../public'
import { EmailAccountService } from '../../entities/account/emailAccountService'
import { EmailMessageService } from '../../entities/message/emailMessageService'

/**
 * Input for `ScheduleSendDraftMessageUseCase`
 *
 * @interface ScheduleSendDraftMessageUseCaseInput
 * @property {string} id The identifier of the draft message to schedule send
 * @property {string} emailAddressId The identifier of the email address to send the draft message from.
 * @property {Date} sendAt Timestamp of when to send the message.
 */
interface ScheduleSendDraftMessageUseCaseInput {
  id: string
  emailAddressId: string
  sendAt: Date
}

interface ScheduleSendDraftMessageOutput {
  id: string
  emailAddressId: string
  sendAt: Date
  state: ScheduledDraftMessageState
  createdAt: Date
  updatedAt: Date
  owner: string
  owners: Owner[]
}

/**
 * Application business logic for schedule sending a draft message.
 */
export class ScheduleSendDraftMessageUseCase {
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
    sendAt,
  }: ScheduleSendDraftMessageUseCaseInput): Promise<ScheduleSendDraftMessageOutput> {
    this.log.debug(this.execute.name, { id, emailAddressId, sendAt })
    const account = await this.emailAccountService.get({
      id: emailAddressId,
      cachePolicy: CachePolicy.RemoteOnly,
    })
    if (!account) {
      throw new AddressNotFoundError()
    }

    if (sendAt.getTime() <= new Date().getTime()) {
      throw new InvalidArgumentError('sendAt must be in the future.')
    }

    return await this.emailMessageService.scheduleSendDraftMessage({
      id,
      emailAddressId,
      sendAt,
    })
  }
}
