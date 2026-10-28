/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EmailAliasEntity,
  EmailAliasEntityRealAddressType,
  EmailAliasEntityStatus,
} from './emailAliasEntity'

/**
 * Input for `EmailAliasService.provisionEmailAlias`
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
 * Input for `EmailAliasService.deprovisionEmailAlias`
 *
 * @interface DeprovisionEmailAliasInput
 * @property {string} emailAliasId The identifier of the email alias to deprovision.
 */
export interface DeprovisionEmailAliasInput {
  emailAliasId: string
}

/**
 * Input for `EmailAliasService.updateEmailAlias`
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
 * Input for `EmailAliasService.enableEmailAlias`
 *
 * @interface EnableEmailAliasInput
 * @property {string} emailAliasId The identifier of the email alias to enable.
 */
export interface EnableEmailAliasInput {
  emailAliasId: string
}

/**
 * Input for `EmailAliasService.disableEmailAlias`
 *
 * @interface DisableEmailAliasInput
 * @property {string} emailAliasId The identifier of the email alias to disable.
 */
export interface DisableEmailAliasInput {
  emailAliasId: string
}

/**
 * Input for `EmailAliasService.verifyExternalEmailAddress`
 *
 * @interface VerifyExternalEmailAddressInput
 * @property {string} emailAddress The external email address to be verified.
 * @property {string} emailAliasId The id of the email alias associated with the email address.
 * @property {string} verificationCode The verification code to verify.
 */
export interface VerifyExternalEmailAddressInput {
  emailAddress: string
  emailAliasId: string
  verificationCode?: string
}

/**
 * @property {EmailAliasStatus} equal Return only results that match the given status.
 */
export interface EqualStatusFilter {
  equal: EmailAliasEntityStatus
  oneOf?: never
  notEqual?: never
  notOneOf?: never
}

/**
 * @property {EmailAliasStatus[]} oneOf Return only results that match one of the given statuses.
 */
export interface OneOfStatusFilter {
  oneOf: EmailAliasEntityStatus[]
  equal?: never
  notEqual?: never
  notOneOf?: never
}

/**
 * @property {EmailAliasStatus} notEqual Return only results that do not match the given status.
 */
export interface NotEqualStatusFilter {
  notEqual: EmailAliasEntityStatus
  equal?: never
  oneOf?: never
  notOneOf?: never
}

/**
 * @property {EmailAliasStatus[]} notOneOf Return only results that do not match any of the given statuses.
 */
export interface NotOneOfStatusFilter {
  notOneOf: EmailAliasEntityStatus[]
  equal?: never
  oneOf?: never
  notEqual?: never
}

/**
 * @property {EmailAliasRealAddressType} equal Return only results that match the given real address type.
 */
export interface EqualRealAddressTypeFilter {
  equal: EmailAliasEntityRealAddressType
  oneOf?: never
  notEqual?: never
  notOneOf?: never
}

/**
 * @property {EmailAliasRealAddressType[]} oneOf Return only results that match one of the given real address types.
 */
export interface OneOfRealAddressTypeFilter {
  oneOf: EmailAliasEntityRealAddressType[]
  equal?: never
  notEqual?: never
  notOneOf?: never
}

/**
 * @property {EmailAliasRealAddressType} notEqual Return only results that do not match the given real address type.
 */
export interface NotEqualRealAddressTypeFilter {
  notEqual: EmailAliasEntityRealAddressType
  equal?: never
  oneOf?: never
  notOneOf?: never
}

/**
 * @property {EmailAliasRealAddressType[]} notOneOf Return only results that do not match any of the given real address types.
 */
export interface NotOneOfRealAddressTypeFilter {
  notOneOf: EmailAliasEntityRealAddressType[]
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
 * Input for `EmailAliasService.listEmailAliasesForOwner` method.
 *
 * @interface ListEmailAliasesForOwnerInput
 * @property {EmailAliasFilterInput} filter Used to filter results based on properties of the EmailAlias
 */
export interface ListEmailAliasesForOwnerInput {
  filter?: EmailAliasFilterInput
  limit?: number
  nextToken?: string
}
/**
 * Output for `EmailAliasService.listEmailAliasesForOwner` method.
 *
 * @interface ListEmailAliasesOutput
 * @property {EmailAliasEntity[]} emailAliases The list of email aliases.
 * @property {string} [nextToken] A token to retrieve the next page of results, or undefined if there are no more results.
 */
export interface ListEmailAliasesOutput {
  emailAliases: EmailAliasEntity[]
  nextToken?: string
}

/**
 * Core entity reprentation for a result of verifying an external email address.
 *
 * @interface VerifyExternalEmailAddressResult
 * @property {boolean} isVerified True if verification passes, otherwise false.
 * @property {string} reason If not verified, the reason why.
 */
export interface VerifyExternalEmailAddressResult {
  isVerified: boolean
  reason?: string
}

/**
 * Core entity representation of an email alias service used in business logic
 *
 * @interface EmailAliasService
 */
export interface EmailAliasService {
  /**
   * Provisions a new email alias with the specified configuration.
   *
   * @param {ProvisionEmailAliasInput} input The input parameters for provisioning the email alias
   * @returns {Promise<EmailAliasEntity>} A promise that resolves to the newly created email alias entity
   */
  provisionEmailAlias(
    input: ProvisionEmailAliasInput,
  ): Promise<EmailAliasEntity>

  /**
   * Deprovisions an existing email alias, permanently removing it from the system.
   *
   * @param {DeprovisionEmailAliasInput} input The input parameters for deprovisioning the email alias
   * @returns {Promise<EmailAliasEntity>} A promise that resolves to the deprovisioned email alias entity
   */
  deprovisionEmailAlias(
    input: DeprovisionEmailAliasInput,
  ): Promise<EmailAliasEntity>

  /**
   * Updates the metadata or expiration date of an existing email alias.
   *
   * @param {UpdateEmailAliasInput} input The input parameters for updating the email alias
   * @returns {Promise<EmailAliasEntity>} A promise that resolves to the updated email alias entity
   */
  updateEmailAlias(input: UpdateEmailAliasInput): Promise<EmailAliasEntity>

  /**
   * Enables a previously disabled email alias, allowing it to forward emails again.
   *
   * @param {EnableEmailAliasInput} input The input parameters for enabling the email alias
   * @returns {Promise<EmailAliasEntity>} A promise that resolves to the enabled email alias entity
   */
  enableEmailAlias(input: EnableEmailAliasInput): Promise<EmailAliasEntity>

  /**
   * Disables an active email alias, preventing it from forwarding emails.
   *
   * @param {DisableEmailAliasInput} input The input parameters for disabling the email alias
   * @returns {Promise<EmailAliasEntity>} A promise that resolves to the disabled email alias entity
   */
  disableEmailAlias(input: DisableEmailAliasInput): Promise<EmailAliasEntity>

  /**
   * Lists email aliases owned by the current user, with optional filtering and pagination.
   *
   * @param {ListEmailAliasesForOwnerInput} [input] Optional input parameters for filtering and pagination
   * @returns {Promise<ListEmailAliasesOutput>} A promise that resolves to a list of email aliases and pagination info
   */
  listEmailAliasesForOwner(
    input?: ListEmailAliasesForOwnerInput,
  ): Promise<ListEmailAliasesOutput>

  /**
   * Sends an email verification code or verifies an external email address given a verification code.
   *
   * @param {VerifyExternalEmailAddressInput} input The input parameters for verifying an external email address
   * @returns {VerifyExternalEmailAddressResult | undefined} A promise that resolves to a verify external email address
   * result entity if a verification code was provided in the request or undefined if a verification code was sent.
   */
  verifyExternalEmailAddress(
    input: VerifyExternalEmailAddressInput,
  ): Promise<VerifyExternalEmailAddressResult | undefined>
}
