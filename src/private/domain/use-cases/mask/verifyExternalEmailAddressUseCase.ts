/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import {
  EmailMaskService,
  VerifyExternalEmailAddressInput,
  VerifyExternalEmailAddressResult,
} from '../../entities/mask/emailMaskService'

/**
 * Application business logic for verifying an external email address.
 */
export class VerifyExternalEmailAddressUseCase {
  private readonly log: Logger

  constructor(private readonly emailMaskService: EmailMaskService) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute(
    input: VerifyExternalEmailAddressInput,
  ): Promise<VerifyExternalEmailAddressResult | undefined> {
    this.log.debug(this.constructor.name, { input })
    return await this.emailMaskService.verifyExternalEmailAddress(input)
  }
}
