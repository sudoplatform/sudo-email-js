/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import { EmailAliasService } from '../../entities/alias/emailAliasService'
import { EmailAliasEntity } from '../../entities/alias/emailAliasEntity'

/**
 * Input for `GetEmailAliasByIdUseCase` use case.
 *
 * @interface GetEmailAliasInput
 * @property {string} id The identifier of the email alias to attempt to retrieve.
 */
interface GetEmailAliasByIdUseCaseInput {
  id: string
}

/**
 * Application business logic for retrieving an email alias.
 */
export class GetEmailAliasByIdUseCase {
  private readonly log: Logger

  constructor(private readonly emailAliasService: EmailAliasService) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute({
    id,
  }: GetEmailAliasByIdUseCaseInput): Promise<EmailAliasEntity> {
    this.log.debug(this.constructor.name, {
      id,
    })
    return await this.emailAliasService.getEmailAliasById({
      id,
    })
  }
}
