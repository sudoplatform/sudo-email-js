/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import { EmailMaskService } from '../../entities/mask/emailMaskService'
import { EmailMaskEntity } from '../../entities/mask/emailMaskEntity'
import { InvalidArgumentError } from '../../../../public'

/**
 * Input for `UpdateEmailMaskUseCase` use case.
 *
 * @interface UpdateEmailMaskUseCaseInput
 * @property {string} emailMaskId The identifier of the email mask to update.
 * @property {JSON | null} metadata Optional metadata to associate with the email mask. To remove existing metadata, set to null.
 * @property {Date | null} expiresAt Optional expiration date for the email mask. To remove existing expiration, set to null.
 */
interface UpdateEmailMaskUseCaseInput {
  emailMaskId: string
  metadata?: Record<string, any> | null
  expiresAt?: Date | null
}

/**
 * Application business logic for updating an email mask.
 */
export class UpdateEmailMaskUseCase {
  private readonly log: Logger

  constructor(private readonly emailMaskService: EmailMaskService) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute({
    emailMaskId,
    metadata,
    expiresAt,
  }: UpdateEmailMaskUseCaseInput): Promise<EmailMaskEntity> {
    this.log.debug(this.constructor.name, {
      emailMaskId,
      metadata,
      expiresAt,
    })

    // Make sure the expiration date is in the future
    if (expiresAt) {
      const now = new Date()
      if (expiresAt.getTime() <= now.getTime()) {
        throw new InvalidArgumentError('Expiration date must be in the future')
      }
    }

    return await this.emailMaskService.updateEmailMask({
      emailMaskId,
      metadata,
      expiresAt,
    })
  }
}
