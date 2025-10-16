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
 * Input for `ProvisionEmailMaskUseCase` use case.
 *
 * @interface ProvisionEmailMaskUseCaseInput
 * @property {string} maskAddress The email mask address to be provisioned in the [local-part]@[domain] format.
 * @property {string} realAddress The real email address that the mask will forward to in the [local-part]@[domain] format.
 * @property {string} ownershipProofToken The signed ownership proof of the Sudo to be associated with the provisioned email mask.
 *  The ownership proof must contain an audience of "sudoplatform".
 * @property {JSON} metadata Optional metadata to associate with the email mask.
 * @property {Date} expiresAt Optional expiration date for the email mask. If not provided, the mask will not expire.
 */
interface ProvisionEmailMaskUseCaseInput {
  maskAddress: string
  realAddress: string
  ownershipProofToken: string
  metadata?: Record<string, any>
  expiresAt?: Date
}

/**
 * Application business logic for provisioning an email mask.
 */
export class ProvisionEmailMaskUseCase {
  private readonly log: Logger

  constructor(private readonly emailMaskService: EmailMaskService) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute({
    maskAddress,
    realAddress,
    ownershipProofToken,
    metadata,
    expiresAt,
  }: ProvisionEmailMaskUseCaseInput): Promise<EmailMaskEntity> {
    this.log.debug(this.constructor.name, {
      maskAddress,
      realAddress,
      ownershipProofToken,
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

    return await this.emailMaskService.provisionEmailMask({
      maskAddress,
      realAddress,
      ownershipProofToken,
      metadata,
      expiresAt,
    })
  }
}
