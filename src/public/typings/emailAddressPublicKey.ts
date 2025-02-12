/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { PublicKeyFormat } from '@sudoplatform/sudo-common'

/**
 * The Sudo Platform SDK representation of email address public information.
 * Depicts the email address and public key related to an email address resource.
 *
 * @interface EmailAddressPublicKey
 * @property {string} publicKey The raw value of the public key containing the
 * actual cryptographic public key data.
 * @property {PublicKeyFormat} keyFormat The format of the public key. This property specifies
 * the structure of the key, such as `RSAPublicKey` for PKCS#1 RSA keys or `SPKI`
 * for X.509 Subject Public Key Info encoded keys.
 * @property {string} algorithm The encryption algorithm associated with this public key.
 */
export interface EmailAddressPublicKey {
  publicKey: string
  keyFormat: PublicKeyFormat
  algorithm: string
}
