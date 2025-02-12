/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import { EmailAccountService } from '../../entities/account/emailAccountService'
import { EmailAddressPublicInfoEntity } from '../../entities/account/emailAddressPublicInfoEntity'

/**
 * Input for `LookupEmailAddressesPublicInfoInput` use case.
 *
 * @interface LookupEmailAddressesPublicInfoInput
 * @property {string[]} emailAddresses A list of email address strings in format 'local-part@domain'.
 */
interface LookupEmailAddressesPublicInfoInput {
  emailAddresses: string[]
}

/**
 * Application business logic for retrieving public info for email addresses.
 */
export class LookupEmailAddressesPublicInfoUseCase {
  private readonly log: Logger

  constructor(private readonly emailAccountService: EmailAccountService) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute({
    emailAddresses,
  }: LookupEmailAddressesPublicInfoInput): Promise<
    EmailAddressPublicInfoEntity[]
  > {
    this.log.debug(this.constructor.name, { emailAddresses })

    return await this.emailAccountService.lookupPublicInfo({ emailAddresses })
  }
}
