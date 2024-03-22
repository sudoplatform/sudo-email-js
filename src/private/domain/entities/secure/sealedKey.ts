/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EncryptionAlgorithm } from '@sudoplatform/sudo-common'

/**
 * A sealed symmetric key which is sealed by encrypting it with a public key.
 * It can be unsealed by decrypting it with the corresponding private key.
 *
 * @interface SealedKey
 * @property {string} publicKeyId Identifier associated with the public key.
 * @property {string} encryptedKey The symmetric key data.
 * @property {EncryptionAlgorithm} algorithm The algorithm used to encrypt the symmetric key.
 */
export interface SealedKey {
  publicKeyId: string
  encryptedKey: string
  algorithm: EncryptionAlgorithm
}
