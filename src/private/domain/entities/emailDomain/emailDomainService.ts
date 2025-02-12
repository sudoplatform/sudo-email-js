/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { CachePolicy } from '@sudoplatform/sudo-common'
import { EmailDomainEntity } from '../emailDomain/emailDomainEntity'

/**
 * Input for `EmailDomainService.getSupportedEmailDomains` and `EmailDomainService.getConfiguredEmailDomains` method.
 *
 * @interface GetEmailDomainsInput
 * @property {CachePolicy} cachePolicy Cache policy determines the strategy for accessing the email domains.
 */
export interface GetEmailDomainsInput {
  cachePolicy?: CachePolicy
}

/**
 * Core entity representation of an email domain service used in business logic. Used to perfrom CRUD operations for email domains.
 *
 * @interface EmailDomainService
 */
export interface EmailDomainService {
  /**
   * Get a list of all of the email domains on which emails may be provisioned.
   *
   * @param {GetEmailDomainsInput} input Parameters used to retrieve the list of supported email domains.
   * @returns {EmailDomainEntity[]} The list of supported email domains.
   */
  getSupportedEmailDomains(
    input: GetEmailDomainsInput,
  ): Promise<EmailDomainEntity[]>

  /**
   * Get a list of all of the email domains for which end-to-end encryption is supported.
   *
   * @param {GetEmailDomainsInput} input Parameters used to retrieve the list of configured email domains.
   * @returns {EmailDomainEntity[]} The list of configured email domains.
   */
  getConfiguredEmailDomains(
    input: GetEmailDomainsInput,
  ): Promise<EmailDomainEntity[]>
}
