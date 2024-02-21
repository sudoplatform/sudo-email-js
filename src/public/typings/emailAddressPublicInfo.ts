/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * The Sudo Platform SDK representation of email address public information.
 * Depicts the email address and public key related to an email address resource.
 *
 * @interface EmailAddressPublicInfo
 * @property {string} emailAddress The email address in format 'local-part@domain'.
 * @property {string} keyId The identifier associated with the public key.
 * @property {string} publicKey The raw value of the public key for the email address.
 */
export interface EmailAddressPublicInfo {
  emailAddress: string
  keyId: string
  publicKey: string
}
