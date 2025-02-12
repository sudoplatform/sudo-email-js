/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { PublicKeyFormat } from '@sudoplatform/sudo-common'

/**
 * Core entity representation of a public key associated with an email address.
 *
 * @interface EmailAddressPublicKeyEntity
 * @property {string} publicKey The raw value of the public key containing the
 * actual cryptographic public key data.
 * @property {string} keyFormat The format of the public key. This property specifies
 * the structure of the key, such as `RSAPublicKey` for PKCS#1 RSA keys or `SPKI`
 * for X.509 Subject Public Key Info encoded keys.
 * @property {string} algorithm The encryption algorithm associated with this public key.
 */
export interface EmailAddressPublicKeyEntity {
  publicKey: string
  keyFormat: PublicKeyFormat
  algorithm: string
}
