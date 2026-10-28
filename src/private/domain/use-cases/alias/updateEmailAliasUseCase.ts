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
 * Input for `UpdateEmailAliasUseCase` use case.
 *
 * @interface UpdateEmailAliasUseCaseInput
 * @property {string} emailAliasId The identifier of the email alias to update.
 * @property {JSON | null} metadata Optional metadata to associate with the email alias. To remove existing metadata, set to null.
 * @property {Date | null} expiresAt Optional expiration date for the email alias. To remove existing expiration, set to null.
 * @property {string} realAddress Optional real email address for the email alias. Only valid for External aliases in PENDING state. Intended for the use case of accidentally inputing wrong external address
 */
interface UpdateEmailAliasUseCaseInput {
  emailAliasId: string
  metadata?: Record<string, any> | null
  expiresAt?: Date | null
  realAddress?: string
}

/**
 * Application business logic for updating an email alias.
 */
export class UpdateEmailAliasUseCase {
  private readonly log: Logger

  constructor(private readonly emailAliasService: EmailAliasService) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute({
    emailAliasId,
    metadata,
    expiresAt,
    realAddress,
  }: UpdateEmailAliasUseCaseInput): Promise<EmailAliasEntity> {
    this.log.debug(this.constructor.name, {
      emailAliasId,
      metadata,
      expiresAt,
      realAddress,
    })

    // Make sure the expiration date is in the future
    if (expiresAt) {
      const now = new Date()
      if (expiresAt.getTime() <= now.getTime()) {
        throw new InvalidArgumentError('Expiration date must be in the future')
      }
    }

    return await this.emailAliasService.updateEmailAlias({
      emailAliasId,
      metadata,
      expiresAt,
      realAddress,
    })
  }
}
