/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DefaultLogger,
  Logger,
  NotSignedInError,
} from '@sudoplatform/sudo-common'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import { EmailMessageSubscriber } from '../../../../public'
import { EmailMessageService } from '../../entities/message/emailMessageService'

export interface SubscribeToEmailMessagesUseCaseInput {
  subscriptionId: string
  subscriber: EmailMessageSubscriber
}

/**
 * Application business logic for subscribing to email message events.
 */
export class SubscribeToEmailMessagesUseCase {
  private readonly log: Logger

  public constructor(
    private readonly emailMessageService: EmailMessageService,
    private readonly sudoUserClient: SudoUserClient,
  ) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute(input: SubscribeToEmailMessagesUseCaseInput): Promise<void> {
    this.log.debug(this.constructor.name, {
      input,
    })
    const owner = await this.sudoUserClient.getSubject()
    if (!owner) {
      throw new NotSignedInError()
    }
    this.emailMessageService.subscribeToEmailMessages({
      subscriptionId: input.subscriptionId,
      ownerId: owner,
      subscriber: input.subscriber,
    })
  }
}
