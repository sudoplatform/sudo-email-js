/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * The Sudo Platform SDK representation of the status of the retrieval of a particular blocked address
 * 
 * If the status is 'Failed' there will be an error showing the cause.
 */
export type UnsealedBlockedAddressStatus =
  | { type: 'Completed' }
  | { type: 'Failed'; cause: Error }

  /**
   * The Sudo Platform SDK representation of an unsealed blocked address
   * 
   * @interface UnsealedBlockedAddress
   * @property {string} hashedBlockedValue The hashed value of the blocked address. This can be used to unblock the address in the event that unsealing fails
   * @property {string} address The plaintext address that has been blocked.
   * @property {UnsealedBlockedAddressStatus} status The status of the unsealing operation. If 'Failed' the plaintext address will be empty but the hashed value will still available
   */
export interface UnsealedBlockedAddress {
  hashedBlockedValue: string
  address: string
  status: UnsealedBlockedAddressStatus
}