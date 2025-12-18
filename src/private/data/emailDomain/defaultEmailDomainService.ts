/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailDomainService } from '../../domain/entities/emailDomain/emailDomainService'
import { EmailDomainEntity } from '../../domain/entities/emailDomain/emailDomainEntity'
import { ApiClient } from '../common/apiClient'
import { EmailDomainEntityTransformer } from './transformer/emailDomainEntityTransformer'

export class DefaultEmailDomainService implements EmailDomainService {
  private readonly emailDomainTransformer: EmailDomainEntityTransformer

  constructor(private readonly appSync: ApiClient) {
    this.emailDomainTransformer = new EmailDomainEntityTransformer()
  }

  async getSupportedEmailDomains(): Promise<EmailDomainEntity[]> {
    const result = await this.appSync.getSupportedEmailDomains()
    return result.domains.map((domain) =>
      this.emailDomainTransformer.transformGraphQL(domain),
    )
  }

  async getConfiguredEmailDomains(): Promise<EmailDomainEntity[]> {
    const result = await this.appSync.getConfiguredEmailDomains()
    return result.domains.map((domain) =>
      this.emailDomainTransformer.transformGraphQL(domain),
    )
  }

  async getEmailMaskDomains(): Promise<EmailDomainEntity[]> {
    const result = await this.appSync.getEmailMaskDomains()
    return result.domains.map((domain) =>
      this.emailDomainTransformer.transformGraphQL(domain),
    )
  }
}
