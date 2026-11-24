/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * The outcome for one key in `CreateSingletonKeysIfAbsentResult`.
 *
 * @interface CreateSingletonKeysIfAbsentKeyResult
 * @property {boolean} created Whether the key had to be created. `true` means the key store changed, so a key backup
 *  made before the call doesn't contain it.
 * @property {string} keyId The key's identifier.
 */
export interface CreateSingletonKeysIfAbsentKeyResult {
  created: boolean
  keyId: string
}

/**
 * The result of `SudoEmailClient.createSingletonKeysIfAbsent`.
 *
 * @interface CreateSingletonKeysIfAbsentResult
 * @property {CreateSingletonKeysIfAbsentKeyResult} keyPair The singleton key pair every email address and email alias
 *  is registered with.
 */
export interface CreateSingletonKeysIfAbsentResult {
  keyPair: CreateSingletonKeysIfAbsentKeyResult
}
