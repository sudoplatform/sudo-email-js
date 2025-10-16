/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { CachePolicy } from '@sudoplatform/sudo-common'
import { Pagination } from './common'

/**
 * Input for `SudoEmailClient.listEmailFoldersForEmailAddressId`.
 *
 * @interface ListEmailFoldersForEmailAddressIdInput
 * @property {string} emailAddressId The identifier of the email address associated with the email folders.
 * @property {CachePolicy} cachePolicy Determines how the email folders will be fetched. Default usage is `remoteOnly`.
 */
export interface ListEmailFoldersForEmailAddressIdInput extends Pagination {
  emailAddressId: string
  cachePolicy?: CachePolicy
}

/**
 * Input for `SudoEmailClient.CreateCustomEmailFolder`.
 *
 * @interface CreateCustomEmailFolderInput
 * @property {string} emailAddressId The identifier of the email address to be associated with the custom email folder.
 * @property {string} customFolderName The name of the custom email folder to be created.
 * @property {boolean} allowSymmetricKeyGeneration (optional) If false and no symmetric key is found, a KeyNotFoundError will be thrown. Defaults to true.
 */
export interface CreateCustomEmailFolderInput {
  emailAddressId: string
  customFolderName: string
  allowSymmetricKeyGeneration?: boolean
}

/**
 * Input for `SudoEmailClient.DeleteCustomEmailFolder`.
 *
 * @interface DeleteCustomEmailFolderInput
 * @property {string} emailFolderId The identifier of the email folder to delete.
 * @property {string} emailAddressId The identifier of the email address associated with the folder.
 */
export interface DeleteCustomEmailFolderInput {
  emailFolderId: string
  emailAddressId: string
}

export interface CustomEmailFolderUpdateValuesInput {
  customFolderName?: string
}

/**
 * Input for `SudoEmailClient.UpdateCustomEmailFolder`.
 *
 * @interface UpdateCustomEmailFolderInput
 * @property {string} emailFolderId The identifier of the email folder to update
 * @property {string} emailAddressId The identifier of the email address associated with the folder.
 * @property {CustomEmailFolderUpdateValuesInput} values The values to update
 * @property {boolean} allowSymmetricKeyGeneration (optional) If false and no symmetric key is found, a KeyNotFoundError will be thrown. Defaults to true.
 */
export interface UpdateCustomEmailFolderInput {
  emailFolderId: string
  emailAddressId: string
  values: CustomEmailFolderUpdateValuesInput
  allowSymmetricKeyGeneration?: boolean
}

/**
 * Input for `SudoEmailClient.deleteMessagesForFolderId`.
 *
 * @interface DeleteMessagesForFolderIdInput
 * @property {string} emailFolderId The identifier of the folder to delete messages from
 * @property {string} emailAddressId The identifier of the email address associated with the folder.
 * @property {boolean} hardDelete If true (default), messages will be completely deleted. If false, messages will be moved to TRASH, unless the folder itself is TRASH.
 */
export interface DeleteMessagesForFolderIdInput {
  emailFolderId: string
  emailAddressId: string
  hardDelete?: boolean
}
