/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Base64 } from '@sudoplatform/sudo-common'
import { SecureData } from '../../../domain/entities/secure/secureData'

// JSON element names
const ENCRYPTED_DATA_JSON = 'encryptedData'
const INIT_VECTOR_KEY_ID_JSON = 'initVectorKeyID'

export class SecureDataTransformer {
  static toJson(secureData: SecureData): string {
    return JSON.stringify({
      [ENCRYPTED_DATA_JSON]: Base64.encode(secureData.encryptedData),
      [INIT_VECTOR_KEY_ID_JSON]: Base64.encode(secureData.initVectorKeyID),
    })
  }

  static fromJson(json: string): SecureData {
    const encoded = JSON.parse(json)
    return {
      encryptedData: Base64.decode(encoded.encryptedData),
      initVectorKeyID: Base64.decode(encoded.initVectorKeyID),
    }
  }
}
