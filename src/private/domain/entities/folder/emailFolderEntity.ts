/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { OwnerEntity } from '../common/ownerEntity'

export type EmailFolderEntityStatus =
  | { type: 'Completed' }
  | { type: 'Failed'; cause: Error }

/**
 * Core entity representation of an email folder business rule. Depicts the information related to a folder resource.
 *
 * @interface EmailFolderEntity
 * @property {string} id Unique identifier of the email folder.
 * @property {string} owner Identifier of the user that owns the email folder.
 * @property {OwnerEntity[]} owners List of identifiers of user/accounts associated with this email folder.
 * @property {string} emailAddressId Identifier of the email address associated with the email folder.
 * @property {string} folderName Name assigned to the email folder (i.e. INBOX, SENT, TRASH, OUTBOX).
 * @property {string} customFolderName Custom name assigned to the email folder.
 * @property {number} size The total size of all email messages assigned to the email folder.
 * @property {number} unseenCount The total count of unseen email messages assigned to the email folder.
 * @property {number} ttl An optional TTL signifying when email messages are deleted from the email folder.
 * @property {Date} createdAt Date when the email folder was created.
 * @property {Date} updatedAt Date when the email folder was last updated.
 * * @property {EmailFolderEntityStatus} status Indicates whether or not the entity is fully formed or had an error.
 */
export interface EmailFolderEntity {
  id: string
  owner: string
  owners: OwnerEntity[]
  emailAddressId: string
  customFolderName?: string
  folderName: string
  size: number
  unseenCount: number
  ttl?: number
  version: number
  createdAt: Date
  updatedAt: Date
  status: EmailFolderEntityStatus
}
