/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EmailDomainService,
  GetEmailDomainsInput,
} from '../../domain/entities/emailDomain/emailDomainService'
import { EmailDomainEntity } from '../../domain/entities/emailDomain/emailDomainEntity'
import { ApiClient } from '../common/apiClient'
import { FetchPolicyTransformer } from '../common/transformer/fetchPolicyTransformer'
import { EmailDomainEntityTransformer } from './transformer/emailDomainEntityTransformer'

export class DefaultEmailDomainService implements EmailDomainService {
  private readonly emailDomainTransformer: EmailDomainEntityTransformer

  constructor(private readonly appSync: ApiClient) {
    this.emailDomainTransformer = new EmailDomainEntityTransformer()
  }

  async getSupportedEmailDomains({
    cachePolicy,
  }: GetEmailDomainsInput): Promise<EmailDomainEntity[]> {
    const fetchPolicy = cachePolicy
      ? FetchPolicyTransformer.transformCachePolicy(cachePolicy)
      : undefined
    const result = await this.appSync.getSupportedEmailDomains(fetchPolicy)
    return result.domains.map((domain) =>
      this.emailDomainTransformer.transformGraphQL(domain),
    )
  }

  async getConfiguredEmailDomains({
    cachePolicy,
  }: GetEmailDomainsInput): Promise<EmailDomainEntity[]> {
    const fetchPolicy = cachePolicy
      ? FetchPolicyTransformer.transformCachePolicy(cachePolicy)
      : undefined
    const result = await this.appSync.getConfiguredEmailDomains(fetchPolicy)
    return result.domains.map((domain) =>
      this.emailDomainTransformer.transformGraphQL(domain),
    )
  }
}
