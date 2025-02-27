/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

export type UnsealedBlockedAddressStatus =
  | { type: 'Completed' }
  | { type: 'Failed'; cause: Error }

export enum BlockedAddressHashAlgorithm {
  SHA256 = 'SHA256',
}

export enum BlockedEmailAddressAction {
  DROP = 'DROP',
  SPAM = 'SPAM',
}

export interface UnsealedBlockedAddress {
  hashedBlockedValue: string
  address: string
  status: UnsealedBlockedAddressStatus
  action: BlockedEmailAddressAction
  emailAddressId?: string
}
