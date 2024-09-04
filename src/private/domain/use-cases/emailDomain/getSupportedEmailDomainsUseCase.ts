/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { CachePolicy, DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import { EmailDomainEntity } from '../../entities/emailDomain/emailDomainEntity'
import { EmailDomainService } from '../../entities/emailDomain/emailDomainService'

/**
 * Application business logic for retrieving supported email domains.
 */
export class GetSupportedEmailDomainsUseCase {
  private readonly log: Logger

  constructor(private readonly emailDomainService: EmailDomainService) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute(cachePolicy: CachePolicy): Promise<EmailDomainEntity[]> {
    this.log.debug(this.constructor.name, {
      cachePolicy,
    })
    return await this.emailDomainService.getSupportedEmailDomains({
      cachePolicy,
    })
  }
}
