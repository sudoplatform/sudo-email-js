/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { UpdateEmailMessagesStatus } from '../message/updateEmailMessagesStatus'
import {
  BlockedEmailAddressAction,
  BlockedEmailAddressLevel,
  UnsealedBlockedAddress,
} from './blockedEmailEntity'

/**
 * Input for `EmailAddressBlocklistService.blockEmailAddressesForOwner` method
 *
 * @interface BlockEmailAddressesForOwnerInput
 * @property {string} owner The id of the owner of the user creating the blocklist
 * @property {string[]} blockedAddresses List of the addresses to block
 * @property {BlockedEmailAddressAction} action Action to take on incoming emails
 * @property {BlockedEmailAddressLevel} blockLevel Level at which to block the sender
 */
export interface BlockEmailAddressesForOwnerInput {
  owner: string
  blockedAddresses: string[]
  action: BlockedEmailAddressAction
  blockLevel: BlockedEmailAddressLevel
}

/**
 * Input for `EmailAddressBlocklistService.blockEmailAddressesForEmailAddressId` method
 *
 * @interface BlockEmailAddressesForEmailAddressIdInput
 * @property {string} owner The id of the owner of the user creating the blocklist
 * @property {string} emailAddressId The id of the email address creating the blocklist
 * @property {string[]} blockedAddresses List of the addresses to block
 * @property {BlockedEmailAddressAction} action Action to take on incoming emails
 * @property {BlockedEmailAddressLevel} blockLevel Level at which to block the sender
 */
export interface BlockEmailAddressesForEmailAddressIdInput {
  owner: string
  emailAddressId: string
  blockedAddresses: string[]
  action: BlockedEmailAddressAction
  blockLevel: BlockedEmailAddressLevel
}

/**
 * Input for `EmailAddressBlocklistService.unblockEmailAddressesForOwner` method
 *
 * @interface UnblockEmailAddressesForOwnerInput
 * @property {string} owner The id of the owner of the user
 * @property {string[]} unblockedAddresses List of the addresses to unblock
 */
export interface UnblockEmailAddressesForOwnerInput {
  owner: string
  unblockedAddresses: string[]
}

/**
 * Input for `EmailAddressBlocklistService.unblockEmailAddressesByHashedValue` method
 *
 * @interface UnblockEmailAddressesByHashedValueInput
 * @property {string} owner The id of the owner of the blocklist
 * @property {string[]} hashedValues List of the hashed values to unblock
 */
export interface UnblockEmailAddressesByHashedValueInput {
  owner: string
  hashedValues: string[]
}

/**
 * Output for `EmailAddressBlocklistService` bulk update methods
 *
 * @interface BlockEmailAddressesBulkUpdateOutput
 * @property {UpdateEmailMessagesStatus} status The status of the update
 * @property {string[]} successAddresses List of addresses that were successfully blocked. Only populated if status is PARTIAL.
 * @property {string[]} failedAddresses List of addresses that were not successfully blocked. Only populated if status is PARTIAL.
 */
export interface BlockEmailAddressesBulkUpdateOutput {
  status: UpdateEmailMessagesStatus
  successAddresses?: string[]
  failedAddresses?: string[]
}

/**
 * Core entity representation of an email address blocklist service used in business logic
 *
 * @interface EmailAddressBlocklistService
 */
export interface EmailAddressBlocklistService {
  /**
   * Block email addresses for the given user
   *
   * @param {BlockEmailAddressesForOwnerInput} input Parameters used to block email addresses
   * @returns {BlockEmailAddressesBulkUpdateOutput} The response indicating if the address(es) were blocked successfully
   */
  blockEmailAddressesForOwner(
    input: BlockEmailAddressesForOwnerInput,
  ): Promise<BlockEmailAddressesBulkUpdateOutput>

  /**
   * Block email addresses for the give email address
   *
   * @param {BlockEmailAddressesForEmailAddressIdInput} input Parameters used to block email addresses
   * @returns {BlockEmailAddressesBulkUpdateOutput} The response indicating if the address(es) were blocked successfully
   */
  blockEmailAddressesForEmailAddressId(
    input: BlockEmailAddressesForEmailAddressIdInput,
  ): Promise<BlockEmailAddressesBulkUpdateOutput>

  /**
   * Unblock email addresses for the given user
   *
   * @param {UnblockEmailAddressesForOwnerInput} input Parameters used to unblock email addresses
   * @returns {BlockEmailAddressesBulkUpdateOutput} The response indicating if the address(es) were unblocked successfully
   */
  unblockEmailAddressesForOwner(
    input: UnblockEmailAddressesForOwnerInput,
  ): Promise<BlockEmailAddressesBulkUpdateOutput>

  /**
   * Unblock email addresses by hashed value for the given user
   *
   * @param {UnblockEmailAddressesByHashedValueInput} input Parameters used to unblock email addresses
   * @returns {BlockEmailAddressesBulkUpdateOutput} The response indicating if the address(es) were unblocked successfully
   */
  unblockEmailAddressesByHashedValue(
    input: UnblockEmailAddressesByHashedValueInput,
  ): Promise<BlockEmailAddressesBulkUpdateOutput>

  /**
   * Get list of blocked email addresses for a given user
   *
   * @param {string} owner The owner of the blocklist
   * @returns {UnsealedBlockedAddress[]} The list of unsealed blocked email addresses
   */
  getEmailAddressBlocklistForOwner(
    owner: string,
  ): Promise<UnsealedBlockedAddress[]>
}
