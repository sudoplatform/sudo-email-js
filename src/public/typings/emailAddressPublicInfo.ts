/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailAddressPublicKey } from './emailAddressPublicKey'

/**
 * The Sudo Platform SDK representation of email address public information.
 * Depicts the email address and public key related to an email address resource.
 *
 * @interface EmailAddressPublicInfo
 * @property {string} emailAddress The email address in format 'local-part@domain'.
 * @property {string} keyId The identifier associated with the public key.
 * @property {string} publicKey The raw value of the public key for the email address.
 * @property {EmailAddressPublicKey} publicKeyDetails Contains the public key associated
 * with the email address, along with additional format and algorithm details.
 */
export interface EmailAddressPublicInfo {
  emailAddress: string
  keyId: string
  /** 
   * @deprecated The publicKey property is deprecated. Use publicKeyDetails for more detailed information. 
   */
  publicKey: string
  publicKeyDetails: EmailAddressPublicKey
}
