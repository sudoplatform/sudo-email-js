/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import { EmailDomainEntity } from '../../entities/emailDomain/emailDomainEntity'
import { EmailDomainService } from '../../entities/emailDomain/emailDomainService'

/**
 * Application business logic for retrieving the list of all email mask domains.
 */
export class GetEmailMaskDomainsUseCase {
  private readonly log: Logger

  constructor(private readonly emailDomainService: EmailDomainService) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute(): Promise<EmailDomainEntity[]> {
    this.log.debug(this.constructor.name)
    return await this.emailDomainService.getEmailMaskDomains()
  }
}
