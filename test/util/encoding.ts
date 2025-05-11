/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { Base64 } from '@sudoplatform/sudo-common'
import { EncryptionStatus } from '../../src'

export const encodeWordIfRequired = (
  word: string | undefined,
  encryptionStatus: EncryptionStatus,
) => {
  return encryptionStatus == EncryptionStatus.UNENCRYPTED
    ? `=?utf-8?B?${Base64.encodeString(word ?? '')}?=`
    : (word ?? '')
}
export const expectedDisplayName = (
  displayName: string | undefined,
  encryptionStatus: EncryptionStatus,
) => {
  return encodeWordIfRequired(
    encryptionStatus == EncryptionStatus.ENCRYPTED
      ? `"${displayName}"`
      : displayName,
    encryptionStatus,
  )
}
