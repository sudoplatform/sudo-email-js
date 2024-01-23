/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import { EmailMessageService } from '../../entities/message/emailMessageService'

export interface UnsubscribeFromEmailMessagesUseCaseInput {
  subscriptionId: string
}

/**
 * Application business logic for unsubscribing from email message events.
 */
export class UnsubscribeFromEmailMessagesUseCase {
  private readonly log: Logger

  public constructor(
    private readonly emailMessageService: EmailMessageService,
  ) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  execute(input: UnsubscribeFromEmailMessagesUseCaseInput): void {
    this.log.debug(this.constructor.name, {
      input,
    })
    this.emailMessageService.unsubscribeFromEmailMessages(input)
  }
}
