/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Used to perform various email address parsing functions.
 *
 * @export
 * @interface EmailAddressParser
 */
export default interface EmailAddressParser {
  /**
   * Normalize email address per platform policy.
   *
   * @param {string} email Complete address `<localpart>@<domain>`
   *                       or `<localpart>`, `<domain>`
   * @returns {string} normalized email address
   * @memberof EmailAddressParser
   */
  normalize(email: string): string

  /**
   * Get the domain part of an email address.
   *
   * @param email Complete address `<localpart>@<domain>`
   * @returns {string} domain part of the email address
   * @memberof EmailAddressParser
   */
  getDomain(email: string): string

  /**
   * Validates an email address.
   *
   * @param {string} email
   */
  validate(email: string): boolean
}
