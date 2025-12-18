/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Pagination } from './common'

/**
 * Input for `SudoEmailClient.getEmailAddress`.
 *
 * @interface GetEmailAddressInput
 * @property {string} id The identifier of the email address to be retrieved.
 */
export interface GetEmailAddressInput {
  id: string
}

/**
 * Input for `SudoEmailClient.listEmailAddresses`.
 *
 * @interface ListEmailAddressesInput
 */
export type ListEmailAddressesInput = Pagination

/**
 * Input for `SudoEmailClient.listEmailAddressesForSudoId`.
 *
 * @interface ListEmailAddressesForSudoIdInput
 * @property {string} sudoId The identifier of the Sudo that owns the email address.
 */
export interface ListEmailAddressesForSudoIdInput extends Pagination {
  sudoId: string
}

/**
 * Input for `SudoEmailClient.lookupEmailAddressesPublicInfoInput`.
 *
 * @interface LookupEmailAddressesPublicInfoInput
 * @property {string[]} emailAddresses A list of email address strings in format 'local-part@domain'.
 */
export interface LookupEmailAddressesPublicInfoInput {
  emailAddresses: string[]
}

/**
 * Input for `SudoEmailClient.provisionEmailAddress`.
 *
 * @interface ProvisionEmailAddressInput
 * @property {string} emailAddress The email address to provision, in the form `${localPart}@${domain}`.
 * @property {string} ownershipProofToken The signed ownership proof of the Sudo to be associated with the provisioned email address.
 *  The ownership proof must contain an audience of "sudoplatform".
 * @property {string} alias An alias for the email address.
 * @property {boolean} allowSymmetricKeyGeneration (optional) If false and no symmetric key is found, a KeyNotFoundError will be thrown. Defaults to true.
 */
export interface ProvisionEmailAddressInput {
  emailAddress: string
  ownershipProofToken: string
  alias?: string
  allowSymmetricKeyGeneration?: boolean
}

/**
 * Input for `SudoEmailClient.updateEmailAddressMetadata`.
 *
 * @interface UpdateEmailAddressMetadataInput
 * @property {string} id The id of the email address to update.
 * @property values The new value(s) to set for each listed email address.
 */
export interface UpdateEmailAddressMetadataInput {
  id: string
  values: {
    alias?: string
  }
}

/**
 * Input for `SudoEmailClient.checkEmailAddressAvailability`.
 *
 * @interface CheckEmailAddressAvailabilityInput
 * @property {Set<string>} localParts The local parts of the email address to check. Local parts require the following
 *   criteria:
 *     - At least one local part is required.
 *     - A maximum of 5 local parts per API request.
 *     - Local parts must not exceed 64 characters.
 *     - Local parts must match the following pattern: `^[a-zA-Z0-9](\.?[-_a-zA-Z0-9])*$`
 * @property {Set<string>} domains The domains of the email address to check. If left undefined, will use default
 *   recognized by the service.
 */
export interface CheckEmailAddressAvailabilityInput {
  localParts: Set<string>
  domains?: Set<string>
}
