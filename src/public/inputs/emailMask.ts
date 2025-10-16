/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailMaskRealAddressType, EmailMaskStatus } from '../typings/emailMask'
import { Pagination } from './common'

/**
 * Input for `SudoEmailClient.provisionEmailMask`
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
 * Input for `SudoEmailClient.deprovisionEmailMask`
 *
 * @interface DeprovisionEmailMaskInput
 * @property {string} emailMaskId The identifier of the email mask to deprovision.
 */
export interface DeprovisionEmailMaskInput {
  emailMaskId: string
}

/**
 * Input for `SudoEmailClient.updateEmailMask`
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
 * Input for `SudoEmailClient.enableEmailMask`
 *
 * @interface EnableEmailMaskInput
 * @property {string} emailMaskId The identifier of the email mask to enable.
 */
export interface EnableEmailMaskInput {
  emailMaskId: string
}

/**
 * Input for `SudoEmailClient.disableEmailMask`
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
  equal: EmailMaskStatus
  oneOf?: never
  notEqual?: never
  notOneOf?: never
}

/**
 * @property {EmailMaskStatus[]} oneOf Return only results that match one of the given statuses.
 */
export interface OneOfStatusFilter {
  oneOf: EmailMaskStatus[]
  equal?: never
  notEqual?: never
  notOneOf?: never
}

/**
 * @property {EmailMaskStatus} notEqual Return only results that do not match the given status.
 */
export interface NotEqualStatusFilter {
  notEqual: EmailMaskStatus
  equal?: never
  oneOf?: never
  notOneOf?: never
}

/**
 * @property {EmailMaskStatus[]} notOneOf Return only results that do not match any of the given statuses.
 */
export interface NotOneOfStatusFilter {
  notOneOf: EmailMaskStatus[]
  equal?: never
  oneOf?: never
  notEqual?: never
}

/**
 * @property {EmailMaskRealAddressType} equal Return only results that match the given real address type.
 */
export interface EqualRealAddressTypeFilter {
  equal: EmailMaskRealAddressType
  oneOf?: never
  notEqual?: never
  notOneOf?: never
}

/**
 * @property {EmailMaskRealAddressType[]} oneOf Return only results that match one of the given real address types.
 */
export interface OneOfRealAddressTypeFilter {
  oneOf: EmailMaskRealAddressType[]
  equal?: never
  notEqual?: never
  notOneOf?: never
}

/**
 * @property {EmailMaskRealAddressType} notEqual Return only results that do not match the given real address type.
 */
export interface NotEqualRealAddressTypeFilter {
  notEqual: EmailMaskRealAddressType
  equal?: never
  oneOf?: never
  notOneOf?: never
}

/**
 * @property {EmailMaskRealAddressType[]} notOneOf Return only results that do not match any of the given real address types.
 */
export interface NotOneOfRealAddressTypeFilter {
  notOneOf: EmailMaskRealAddressType[]
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
 * Input for `SudoEmailClient.listEmailMasksForOwner` method.
 *
 * @interface ListEmailMasksForOwnerInput
 * @property {EmailMaskFilterInput} filter Used to filter results based on properties of the EmailMask
 */
export interface ListEmailMasksForOwnerInput extends Pagination {
  filter?: EmailMaskFilterInput
}
