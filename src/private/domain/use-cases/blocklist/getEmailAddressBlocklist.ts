/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import { EmailAddressBlocklistService } from '../../entities/blocklist/emailAddressBlocklistService'

/**
 * Input for `GetEmailAddressBlocklistUseCase`
 *
 * @interface GetEmailAddressBlocklistUseCaseInput
 * @property {string} owner The id of the owner of the blocklist
 */
export interface GetEmailAddressBlocklistUseCaseInput {
  owner: string
}

/**
 * Application business logic for getting email address blocklist
 */
export class GetEmailAddressBlocklistUseCase {
  private readonly log: Logger
  constructor(
    private readonly emailBlocklistService: EmailAddressBlocklistService,
  ) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute({
    owner,
  }: GetEmailAddressBlocklistUseCaseInput): Promise<string[]> {
    this.log.debug(this.constructor.name, { owner })

    const result =
      await this.emailBlocklistService.getEmailAddressBlocklistForOwner({
        owner,
      })

    return result
  }
}
