/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { OwnerEntity } from '../common/ownerEntity'
import { EmailFolderEntity } from '../folder/emailFolderEntity'
import { EmailAddressEntity } from './emailAddressEntity'

export type EmailAccountEntityStatus =
  | { type: 'Completed' }
  | { type: 'Failed'; cause: Error }

/**
 * Core entity representation of an email account business rule. Depicts the information related to an email account resource.
 *
 * @interface EmailAccountEntity
 * @property {string} id Unique identifier of the email account.
 * @property {string} owner Identifier of the user that owns the email account.
 * @property {OwnerEntity[]} owners List of identifiers of user/accounts associated with this email account.
 * @property {string} identityId Unique identifier of the identity associated with the email account.
 * @property {string} keyRingId Unique identifier of the key ring associated with the email account.
 * @property {string} emailAddress Email address in format 'local-part@domain' of the email account.
 * @property {number} size The total size of all email messages assigned to the email account.
 * @property {number} version Version of this entity, increments on update.
 * @property {Date} createdAt Date when the email account was created.
 * @property {Date} updatedAt Date when the email account was last updated.
 * @property {Date} lastReceivedAt Date when the email account received its last email message. `undefined` if no messages received.
 * @property {EmailAccountEntityStatus} status Indicates whether or not the entity is fully formed or had an error.
 */
export interface EmailAccountEntity {
  id: string
  owner: string
  owners: OwnerEntity[]
  identityId: string
  keyRingId: string
  emailAddress: EmailAddressEntity
  size: number
  version: number
  createdAt: Date
  updatedAt: Date
  lastReceivedAt: Date | undefined
  status: EmailAccountEntityStatus
  folders: EmailFolderEntity[]
}
