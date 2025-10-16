/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EmailMaskEntity,
  EmailMaskEntityRealAddressType,
  EmailMaskEntityStatus,
} from './emailMaskEntity'

/**
 * Input for `EmailMaskService.provisionEmailMask`
 *
 * @interface ProvisionEmailMaskInput
 * @property {string} maskAddress The email mask address to be provisioned in the [local-part]@[domain] format.
 * @property {string} realAddress The real email address that the mask will forward to in the [local-part]@[domain] format.
 * @property {string} ownershipProofToken The signed ownership proof of the Sudo to be associated with the provisioned email mask.
 *  The ownership proof must contain an audience of "sudoplatform".
 * @property {JSON} metadata Optional metadata to associate with the email mask.
 * @property {Date} expiresAt Optional expiration date for the email mask. If not provided, the mask will not expire.
 */
export interface ProvisionEmailMaskInput {
  maskAddress: string
  realAddress: string
  ownershipProofToken: string
  metadata?: Record<string, any>
  expiresAt?: Date
}

/**
 * Input for `EmailMaskService.deprovisionEmailMask`
 *
 * @interface DeprovisionEmailMaskInput
 * @property {string} emailMaskId The identifier of the email mask to deprovision.
 */
export interface DeprovisionEmailMaskInput {
  emailMaskId: string
}

/**
 * Input for `EmailMaskService.updateEmailMask`
 *
 * @interface UpdateEmailMaskInput
 * @property {string} emailMaskId The identifier of the email mask to update.
 * @property {JSON | null} metadata Optional metadata to associate with the email mask. To remove existing metadata, set to null.
 * @property {Date | null} expiresAt Optional expiration date for the email mask. To remove existing expiration, set to null.
 */
export interface UpdateEmailMaskInput {
  emailMaskId: string
  metadata?: Record<string, any> | null
  expiresAt?: Date | null
}

/**
 * Input for `EmailMaskService.enableEmailMask`
 *
 * @interface EnableEmailMaskInput
 * @property {string} emailMaskId The identifier of the email mask to enable.
 */
export interface EnableEmailMaskInput {
  emailMaskId: string
}

/**
 * Input for `EmailMaskService.disableEmailMask`
 *
 * @interface DisableEmailMaskInput
 * @property {string} emailMaskId The identifier of the email mask to disable.
 */
export interface DisableEmailMaskInput {
  emailMaskId: string
}

/**
 * @property {EmailMaskStatus} equal Return only results that match the given status.
 */
export interface EqualStatusFilter {
  equal: EmailMaskEntityStatus
  oneOf?: never
  notEqual?: never
  notOneOf?: never
}

/**
 * @property {EmailMaskStatus[]} oneOf Return only results that match one of the given statuses.
 */
export interface OneOfStatusFilter {
  oneOf: EmailMaskEntityStatus[]
  equal?: never
  notEqual?: never
  notOneOf?: never
}

/**
 * @property {EmailMaskStatus} notEqual Return only results that do not match the given status.
 */
export interface NotEqualStatusFilter {
  notEqual: EmailMaskEntityStatus
  equal?: never
  oneOf?: never
  notOneOf?: never
}

/**
 * @property {EmailMaskStatus[]} notOneOf Return only results that do not match any of the given statuses.
 */
export interface NotOneOfStatusFilter {
  notOneOf: EmailMaskEntityStatus[]
  equal?: never
  oneOf?: never
  notEqual?: never
}

/**
 * @property {EmailMaskRealAddressType} equal Return only results that match the given real address type.
 */
export interface EqualRealAddressTypeFilter {
  equal: EmailMaskEntityRealAddressType
  oneOf?: never
  notEqual?: never
  notOneOf?: never
}

/**
 * @property {EmailMaskRealAddressType[]} oneOf Return only results that match one of the given real address types.
 */
export interface OneOfRealAddressTypeFilter {
  oneOf: EmailMaskEntityRealAddressType[]
  equal?: never
  notEqual?: never
  notOneOf?: never
}

/**
 * @property {EmailMaskRealAddressType} notEqual Return only results that do not match the given real address type.
 */
export interface NotEqualRealAddressTypeFilter {
  notEqual: EmailMaskEntityRealAddressType
  equal?: never
  oneOf?: never
  notOneOf?: never
}

/**
 * @property {EmailMaskRealAddressType[]} notOneOf Return only results that do not match any of the given real address types.
 */
export interface NotOneOfRealAddressTypeFilter {
  notOneOf: EmailMaskEntityRealAddressType[]
  equal?: never
  oneOf?: never
  notEqual?: never
}

/**
 * @interface EmailMaskFilterInput
 * @property {EqualStatusFilter | OneOfStatusFilter | NotEqualStatusFilter | NotOneOfStatusFilter} status Used to filter results based on `status` property
 * @property {EqualRealAddressTypeFilter | OneOfRealAddressTypeFilter | NotEqualRealAddressTypeFilter | NotOneOfRealAddressTypeFilter} realAddressType Used to filter results based on `realAddressType` property
 */
export interface EmailMaskFilterInput {
  status?:
    | EqualStatusFilter
    | OneOfStatusFilter
    | NotEqualStatusFilter
    | NotOneOfStatusFilter
  realAddressType?:
    | EqualRealAddressTypeFilter
    | OneOfRealAddressTypeFilter
    | NotEqualRealAddressTypeFilter
    | NotOneOfRealAddressTypeFilter
}

/**
 * Input for `EmailMaskService.listEmailMasksForOwner` method.
 *
 * @interface ListEmailMasksForOwnerInput
 * @property {EmailMaskFilterInput} filter Used to filter results based on properties of the EmailMask
 */
export interface ListEmailMasksForOwnerInput {
  filter?: EmailMaskFilterInput
  limit?: number
  nextToken?: string
}
/**
 * Output for `EmailMaskService.listEmailMasksForOwner` method.
 *
 * @interface ListEmailMasksOutput
 * @property {EmailMaskEntity[]} emailMasks The list of email masks.
 * @property {string} [nextToken] A token to retrieve the next page of results, or undefined if there are no more results.
 */
export interface ListEmailMasksOutput {
  emailMasks: EmailMaskEntity[]
  nextToken?: string
}

/**
 * Core entity representation of an email mask service used in business logic
 *
 * @interface EmailMaskService
 */
export interface EmailMaskService {
  /**
   * Provisions a new email mask with the specified configuration.
   *
   * @param {ProvisionEmailMaskInput} input The input parameters for provisioning the email mask
   * @returns {Promise<EmailMaskEntity>} A promise that resolves to the newly created email mask entity
   */
  provisionEmailMask(input: ProvisionEmailMaskInput): Promise<EmailMaskEntity>

  /**
   * Deprovisions an existing email mask, permanently removing it from the system.
   *
   * @param {DeprovisionEmailMaskInput} input The input parameters for deprovisioning the email mask
   * @returns {Promise<EmailMaskEntity>} A promise that resolves to the deprovisioned email mask entity
   */
  deprovisionEmailMask(
    input: DeprovisionEmailMaskInput,
  ): Promise<EmailMaskEntity>

  /**
   * Updates the metadata or expiration date of an existing email mask.
   *
   * @param {UpdateEmailMaskInput} input The input parameters for updating the email mask
   * @returns {Promise<EmailMaskEntity>} A promise that resolves to the updated email mask entity
   */
  updateEmailMask(input: UpdateEmailMaskInput): Promise<EmailMaskEntity>

  /**
   * Enables a previously disabled email mask, allowing it to forward emails again.
   *
   * @param {EnableEmailMaskInput} input The input parameters for enabling the email mask
   * @returns {Promise<EmailMaskEntity>} A promise that resolves to the enabled email mask entity
   */
  enableEmailMask(input: EnableEmailMaskInput): Promise<EmailMaskEntity>

  /**
   * Disables an active email mask, preventing it from forwarding emails.
   *
   * @param {DisableEmailMaskInput} input The input parameters for disabling the email mask
   * @returns {Promise<EmailMaskEntity>} A promise that resolves to the disabled email mask entity
   */
  disableEmailMask(input: DisableEmailMaskInput): Promise<EmailMaskEntity>

  /**
   * Lists email masks owned by the current user, with optional filtering and pagination.
   *
   * @param {ListEmailMasksForOwnerInput} [input] Optional input parameters for filtering and pagination
   * @returns {Promise<ListEmailMasksOutput>} A promise that resolves to a list of email masks and pagination info
   */
  listEmailMasksForOwner(
    input?: ListEmailMasksForOwnerInput,
  ): Promise<ListEmailMasksOutput>
}
