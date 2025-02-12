/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailAddressPublicKeyEntity } from './emailAddressPublicKeyEntity'

/**
 * Core entity representation of email address public information.
 * Depicts the email address and public key related to an email address resource.
 *
 * @interface EmailAddressPublicInfoEntity
 * @property {string} emailAddress The email address in format 'local-part@domain'.
 * @property {string} keyId The identifier associated with the public key.
 * @property {EmailAddressPublicKey} publicKeyDetails Contains the public key associated
 * with the email address, along with additional format and algorithm details.
 */
export interface EmailAddressPublicInfoEntity {
  emailAddress: string
  keyId: string
  publicKeyDetails: EmailAddressPublicKeyEntity
}
