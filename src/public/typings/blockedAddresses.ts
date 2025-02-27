/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
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
 * The Sudo Platform SDK representation of the action to take on a message received from
 * and address that has been blocked by a user.
 * 
 * DROP = Do nothing. Message will not appear in user's account (default)
 * SPAM = Message will appear in user's SPAM folder, if spam folders are enabled for the service.
 */
export enum BlockedEmailAddressAction {
  DROP = 'DROP',
  SPAM = 'SPAM',
}

  /**
   * The Sudo Platform SDK representation of an unsealed blocked address
   * 
   * @interface UnsealedBlockedAddress
   * @property {string} hashedBlockedValue The hashed value of the blocked address. This can be used to unblock the address in the event that unsealing fails
   * @property {string} address The plaintext address that has been blocked.
   * @property {BlockedEmailAddressAction} action The action to be taken on incoming messages from the blocked address.
   * @property {UnsealedBlockedAddressStatus} status The status of the unsealing operation. If 'Failed' the plaintext address will be empty but the hashed value will still available
   * @property {string} emailAddressId The id of the email address that the sender is blocked from. If undefined, the sender is blocked from all addresses of the owner.
   */
export interface UnsealedBlockedAddress {
  hashedBlockedValue: string
  address: string
  action: BlockedEmailAddressAction
  status: UnsealedBlockedAddressStatus
  emailAddressId?: string
}