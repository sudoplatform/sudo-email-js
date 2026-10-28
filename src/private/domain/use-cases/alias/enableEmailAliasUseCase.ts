/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import { EmailAliasService } from '../../entities/alias/emailAliasService'
import { EmailAliasEntity } from '../../entities/alias/emailAliasEntity'

/**
 * Input for `EnableEmailAliasUseCase` use case.
 *
 * @interface EnableEmailAliasUseCaseInput
 * @property {string} emailAliasId The identifier of the email alias to enable.
 */
interface EnableEmailAliasUseCaseInput {
  emailAliasId: string
}

/**
 * Application business logic for enabling an email alias.
 */
export class EnableEmailAliasUseCase {
  private readonly log: Logger

  constructor(private readonly emailAliasService: EmailAliasService) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute({
    emailAliasId,
  }: EnableEmailAliasUseCaseInput): Promise<EmailAliasEntity> {
    this.log.debug(this.constructor.name, {
      emailAliasId,
    })

    return await this.emailAliasService.enableEmailAlias({
      emailAliasId,
    })
  }
}
