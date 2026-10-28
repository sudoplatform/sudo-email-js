/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EmailAliasRealAddressType,
  EmailAliasStatus,
} from '../typings/emailAlias'
import { Pagination } from './common'

/**
 * Input for `SudoEmailClient.provisionEmailAlias`
 *
 * @interface ProvisionEmailAliasInput
 * @property {string} aliasAddress The email alias address to be provisioned in the [local-part]@[domain] format.
 * @property {string} realAddress The real email address that the alias will forward to in the [local-part]@[domain] format.
 * @property {string} ownershipProofToken The signed ownership proof of the Sudo to be associated with the provisioned email alias.
 *  The ownership proof must contain an audience of "sudoplatform".
 * @property {JSON} metadata Optional metadata to associate with the email alias.
 * @property {Date} expiresAt Optional expiration date for the email alias. If not provided, the alias will not expire.
 */
export interface ProvisionEmailAliasInput {
  aliasAddress: string
  realAddress: string
  ownershipProofToken: string
  metadata?: Record<string, any>
  expiresAt?: Date
}

/**
 * Input for `SudoEmailClient.deprovisionEmailAlias`
 *
 * @interface DeprovisionEmailAliasInput
 * @property {string} emailAliasId The identifier of the email alias to deprovision.
 */
export interface DeprovisionEmailAliasInput {
  emailAliasId: string
}

/**
 * Input for `SudoEmailClient.updateEmailAlias`
 *
 * @interface UpdateEmailAliasInput
 * @property {string} emailAliasId The identifier of the email alias to update.
 * @property {JSON | null} metadata Optional metadata to associate with the email alias. To remove existing metadata, set to null.
 * @property {Date | null} expiresAt Optional expiration date for the email alias. To remove existing expiration, set to null.
 * @property {string} realAddress Optional real email address for the email alias. Only valid for External aliases in PENDING state. Intended for the use case of accidentally inputing wrong external address
 */
export interface UpdateEmailAliasInput {
  emailAliasId: string
  metadata?: Record<string, any> | null
  expiresAt?: Date | null
  realAddress?: string
}

/**
 * Input for `SudoEmailClient.enableEmailAlias`
 *
 * @interface EnableEmailAliasInput
 * @property {string} emailAliasId The identifier of the email alias to enable.
 */
export interface EnableEmailAliasInput {
  emailAliasId: string
}

/**
 * Input for `SudoEmailClient.disableEmailAlias`
 *
 * @interface DisableEmailAliasInput
 * @property {string} emailAliasId The identifier of the email alias to disable.
 */
export interface DisableEmailAliasInput {
  emailAliasId: string
}

/**
 * @property {EmailAliasStatus} equal Return only results that match the given status.
 */
export interface EqualStatusFilter {
  equal: EmailAliasStatus
  oneOf?: never
  notEqual?: never
  notOneOf?: never
}

/**
 * @property {EmailAliasStatus[]} oneOf Return only results that match one of the given statuses.
 */
export interface OneOfStatusFilter {
  oneOf: EmailAliasStatus[]
  equal?: never
  notEqual?: never
  notOneOf?: never
}

/**
 * @property {EmailAliasStatus} notEqual Return only results that do not match the given status.
 */
export interface NotEqualStatusFilter {
  notEqual: EmailAliasStatus
  equal?: never
  oneOf?: never
  notOneOf?: never
}

/**
 * @property {EmailAliasStatus[]} notOneOf Return only results that do not match any of the given statuses.
 */
export interface NotOneOfStatusFilter {
  notOneOf: EmailAliasStatus[]
  equal?: never
  oneOf?: never
  notEqual?: never
}

/**
 * @property {EmailAliasRealAddressType} equal Return only results that match the given real address type.
 */
export interface EqualRealAddressTypeFilter {
  equal: EmailAliasRealAddressType
  oneOf?: never
  notEqual?: never
  notOneOf?: never
}

/**
 * @property {EmailAliasRealAddressType[]} oneOf Return only results that match one of the given real address types.
 */
export interface OneOfRealAddressTypeFilter {
  oneOf: EmailAliasRealAddressType[]
  equal?: never
  notEqual?: never
  notOneOf?: never
}

/**
 * @property {EmailAliasRealAddressType} notEqual Return only results that do not match the given real address type.
 */
export interface NotEqualRealAddressTypeFilter {
  notEqual: EmailAliasRealAddressType
  equal?: never
  oneOf?: never
  notOneOf?: never
}

/**
 * @property {EmailAliasRealAddressType[]} notOneOf Return only results that do not match any of the given real address types.
 */
export interface NotOneOfRealAddressTypeFilter {
  notOneOf: EmailAliasRealAddressType[]
  equal?: never
  oneOf?: never
  notEqual?: never
}

/**
 * @interface EmailAliasFilterInput
 * @property {EqualStatusFilter | OneOfStatusFilter | NotEqualStatusFilter | NotOneOfStatusFilter} status Used to filter results based on `status` property
 * @property {EqualRealAddressTypeFilter | OneOfRealAddressTypeFilter | NotEqualRealAddressTypeFilter | NotOneOfRealAddressTypeFilter} realAddressType Used to filter results based on `realAddressType` property
 */
export interface EmailAliasFilterInput {
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
 * Input for `SudoEmailClient.listEmailAliasesForOwner` method.
 *
 * @interface ListEmailAliasesForOwnerInput
 * @property {EmailAliasFilterInput} filter Used to filter results based on properties of the EmailAlias
 */
export interface ListEmailAliasesForOwnerInput extends Pagination {
  filter?: EmailAliasFilterInput
}
