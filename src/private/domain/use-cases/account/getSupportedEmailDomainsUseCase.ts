/*
 * Copyright © 2023 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { CachePolicy, DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import { EmailAccountService } from '../../entities/account/emailAccountService'
import { EmailDomainEntity } from '../../entities/account/emailDomainEntity'

/**
 * Application business logic for retrieving supported email domains.
 */
export class GetSupportedEmailDomainsUseCase {
  private readonly log: Logger

  constructor(private readonly emailAccountService: EmailAccountService) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute(cachePolicy: CachePolicy): Promise<EmailDomainEntity[]> {
    this.log.debug(this.constructor.name, {
      cachePolicy,
    })
    return await this.emailAccountService.getSupportedEmailDomains({
      cachePolicy,
    })
  }
}
