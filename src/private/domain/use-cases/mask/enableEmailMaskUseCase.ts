/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import { EmailMaskService } from '../../entities/mask/emailMaskService'
import { EmailMaskEntity } from '../../entities/mask/emailMaskEntity'

/**
 * Input for `EnableEmailMaskUseCase` use case.
 *
 * @interface EnableEmailMaskUseCaseInput
 * @property {string} emailMaskId The identifier of the email mask to enable.
 */
interface EnableEmailMaskUseCaseInput {
  emailMaskId: string
}

/**
 * Application business logic for enabling an email mask.
 */
export class EnableEmailMaskUseCase {
  private readonly log: Logger

  constructor(private readonly emailMaskService: EmailMaskService) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute({
    emailMaskId,
  }: EnableEmailMaskUseCaseInput): Promise<EmailMaskEntity> {
    this.log.debug(this.constructor.name, {
      emailMaskId,
    })

    return await this.emailMaskService.enableEmailMask({
      emailMaskId,
    })
  }
}
