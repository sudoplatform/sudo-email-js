/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { SealedKey } from '../../../domain/entities/secure/sealedKey'

// JSON element names
const PUBLIC_KEY_ID_JSON = 'publicKeyId'
const ENCRYPTED_KEY_JSON = 'encryptedKey'
const ALGORITHM_JSON = 'algorithm'

export class SealedKeyTransformer {
  static toJson(sealedKey: SealedKey): string {
    return JSON.stringify({
      [PUBLIC_KEY_ID_JSON]: sealedKey.publicKeyId,
      [ENCRYPTED_KEY_JSON]: sealedKey.encryptedKey,
      [ALGORITHM_JSON]: sealedKey.algorithm,
    })
  }

  static fromJson(json: string): SealedKey {
    return JSON.parse(json) as SealedKey
  }
}
