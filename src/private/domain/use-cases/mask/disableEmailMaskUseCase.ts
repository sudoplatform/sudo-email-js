/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import { EmailMaskService } from '../../entities/mask/emailMaskService'
import { EmailMaskEntity } from '../../entities/mask/emailMaskEntity'

/**
 * Input for `DisableEmailMaskUseCase` use case.
 *
 * @interface DisableEmailMaskUseCaseInput
 * @property {string} emailMaskId The identifier of the email mask to disable.
 */
interface DisableEmailMaskUseCaseInput {
  emailMaskId: string
}

/**
 * Application business logic for disabling an email mask.
 */
export class DisableEmailMaskUseCase {
  private readonly log: Logger

  constructor(private readonly emailMaskService: EmailMaskService) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute({
    emailMaskId,
  }: DisableEmailMaskUseCaseInput): Promise<EmailMaskEntity> {
    this.log.debug(this.constructor.name, {
      emailMaskId,
    })

    return await this.emailMaskService.disableEmailMask({
      emailMaskId,
    })
  }
}
