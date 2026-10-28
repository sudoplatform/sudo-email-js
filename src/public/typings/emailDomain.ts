/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * The Sudo Platform SDK representation of an email domain.
 *
 * @interface EmailDomain
 * @property {string} domain Domain name.
 * @property {boolean} isAliasDomain Whether this domain is used for email aliases.
 * @property {JSON} metadata Domain metadata parsed from JSON.
 */
export interface EmailDomain {
  domain: string
  isAliasDomain: boolean
  metadata: Record<string, string>
}