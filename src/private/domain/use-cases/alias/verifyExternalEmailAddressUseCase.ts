/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import {
  EmailAliasService,
  VerifyExternalEmailAddressInput,
  VerifyExternalEmailAddressResult,
} from '../../entities/alias/emailAliasService'

/**
 * Application business logic for verifying an external email address.
 */
export class VerifyExternalEmailAddressUseCase {
  private readonly log: Logger

  constructor(private readonly emailAliasService: EmailAliasService) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute(
    input: VerifyExternalEmailAddressInput,
  ): Promise<VerifyExternalEmailAddressResult | undefined> {
    this.log.debug(this.constructor.name, { input })
    return await this.emailAliasService.verifyExternalEmailAddress(input)
  }
}
