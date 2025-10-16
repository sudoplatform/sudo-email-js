/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import { EmailMaskService } from '../../entities/mask/emailMaskService'
import { EmailMaskEntity } from '../../entities/mask/emailMaskEntity'

/**
 * Input for `DeprovisionEmailMaskUseCase` use case.
 *
 * @interface DeprovisionEmailMaskUseCaseInput
 * @property {string} emailMaskId The identifier of the email mask to deprovision.
 */
interface DeprovisionEmailMaskUseCaseInput {
  emailMaskId: string
}

/**
 * Application business logic for deprovisioning an email mask.
 */
export class DeprovisionEmailMaskUseCase {
  private readonly log: Logger

  constructor(private readonly emailMaskService: EmailMaskService) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute({
    emailMaskId,
  }: DeprovisionEmailMaskUseCaseInput): Promise<EmailMaskEntity> {
    this.log.debug(this.constructor.name, {
      emailMaskId,
    })

    return await this.emailMaskService.deprovisionEmailMask({
      emailMaskId,
    })
  }
}
