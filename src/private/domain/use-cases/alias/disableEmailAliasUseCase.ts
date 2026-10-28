/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import { EmailAliasService } from '../../entities/alias/emailAliasService'
import { EmailAliasEntity } from '../../entities/alias/emailAliasEntity'

/**
 * Input for `DisableEmailAliasUseCase` use case.
 *
 * @interface DisableEmailAliasUseCaseInput
 * @property {string} emailAliasId The identifier of the email alias to disable.
 */
interface DisableEmailAliasUseCaseInput {
  emailAliasId: string
}

/**
 * Application business logic for disabling an email alias.
 */
export class DisableEmailAliasUseCase {
  private readonly log: Logger

  constructor(private readonly emailAliasService: EmailAliasService) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute({
    emailAliasId,
  }: DisableEmailAliasUseCaseInput): Promise<EmailAliasEntity> {
    this.log.debug(this.constructor.name, {
      emailAliasId,
    })

    return await this.emailAliasService.disableEmailAlias({
      emailAliasId,
    })
  }
}
