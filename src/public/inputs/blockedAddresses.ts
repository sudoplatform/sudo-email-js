/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BlockedEmailAddressLevel,
  BlockedEmailAddressAction,
} from '../typings/blockedAddresses'

/**
 * Input for `SudoEmailClient.BlockEmailAddresses`
 *
 * @interface BlockEmailAddressesInput
 * @property {string[]} addresses List of addresses to be blocked in the [local-part]@[domain] format.
 * @property {BlockedEmailAddressLevel} blockLevel The level at which to block the sender.
 * @property {BlockedEmailAddressAction} action Action to take when receiving messages from blocked addresses.
 * @property {string} emailAddressId If included, the block will only affect the indicated email address.
 */
export interface BlockEmailAddressesInput {
  addressesToBlock: string[]
  blockLevel?: BlockedEmailAddressLevel
  action?: BlockedEmailAddressAction
  emailAddressId?: string
}

/**
 * Input for `SudoEmailClient.UnblockEmailAddresses`
 *
 * @interface UnblockEmailAddressesInput
 * @property {string[]} addresses List of addresses to be unblocked in the [local-part]@[domain] format
 */
export interface UnblockEmailAddressesInput {
  addresses: string[]
}

/**
 * Input for `SudoEmailClient.UnblockEmailAddressesByHashedValue`
 *
 * @interface UnblockEmailAddressesByHashedValueInput
 * @property {string[]} hashedValues List of hashedValues to be unblocked
 */
export interface UnblockEmailAddressesByHashedValueInput {
  hashedValues: string[]
}
