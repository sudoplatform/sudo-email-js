/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import { EmailAliasService } from '../../entities/alias/emailAliasService'
import { EmailAliasEntity } from '../../entities/alias/emailAliasEntity'
import { InvalidArgumentError } from '../../../../public'

/**
 * Input for `ProvisionEmailAliasUseCase` use case.
 *
 * @interface ProvisionEmailAliasUseCaseInput
 * @property {string} aliasAddress The email alias address to be provisioned in the [local-part]@[domain] format.
 * @property {string} realAddress The real email address that the alias will forward to in the [local-part]@[domain] format.
 * @property {string} ownershipProofToken The signed ownership proof of the Sudo to be associated with the provisioned email alias.
 *  The ownership proof must contain an audience of "sudoplatform".
 * @property {JSON} metadata Optional metadata to associate with the email alias.
 * @property {Date} expiresAt Optional expiration date for the email alias. If not provided, the alias will not expire.
 */
interface ProvisionEmailAliasUseCaseInput {
  aliasAddress: string
  realAddress: string
  ownershipProofToken: string
  metadata?: Record<string, any>
  expiresAt?: Date
}

/**
 * Application business logic for provisioning an email alias.
 */
export class ProvisionEmailAliasUseCase {
  private readonly log: Logger

  constructor(private readonly emailAliasService: EmailAliasService) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute({
    aliasAddress,
    realAddress,
    ownershipProofToken,
    metadata,
    expiresAt,
  }: ProvisionEmailAliasUseCaseInput): Promise<EmailAliasEntity> {
    this.log.debug(this.constructor.name, {
      aliasAddress,
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

    return await this.emailAliasService.provisionEmailAlias({
      aliasAddress,
      realAddress,
      ownershipProofToken,
      metadata,
      expiresAt,
    })
  }
}
