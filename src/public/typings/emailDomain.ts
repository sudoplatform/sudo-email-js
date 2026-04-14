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
 * @property {boolean} isMaskDomain Whether this domain can be used for email masks.
 * @property {JSON} metadata Domain metadata parsed from JSON.
 */
export interface EmailDomain {
  domain: string
  isMaskDomain: boolean
  metadata: Record<string, string>
}