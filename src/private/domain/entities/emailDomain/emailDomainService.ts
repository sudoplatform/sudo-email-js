/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailDomainEntity } from './emailDomainEntity'

/**
 * Core entity representation of an email domain service used in business logic. Used to perfrom CRUD operations for email domains.
 *
 * @interface EmailDomainService
 */
export interface EmailDomainService {
  /**
   * Get a list of all of the email domains on which emails may be provisioned.
   *
   * @returns {EmailDomainEntity[]} The list of supported email domains.
   */
  getSupportedEmailDomains(): Promise<EmailDomainEntity[]>

  /**
   * Get a list of all of the email domains for which end-to-end encryption is supported.
   *
   * @returns {EmailDomainEntity[]} The list of configured email domains.
   */
  getConfiguredEmailDomains(): Promise<EmailDomainEntity[]>

  /**
   * Get a list of all of the email domains on which email masks may be provisioned.
   *
   * @returns {EmailDomainEntity[]} The list of email mask domains.
   */
  getEmailMaskDomains(): Promise<EmailDomainEntity[]>
}
