/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EncryptionStatus } from '../../../../public'
import { Direction, State } from '../../../../public/typings/emailMessage'
import { EmailAddressEntity } from '../account/emailAddressEntity'
import { OwnerEntity } from '../common/ownerEntity'

export type EmailMessageEntityStatus =
  | { type: 'Completed' }
  | { type: 'Failed'; cause: Error }

/**
 * Core entity representation of an email message business rule. Depicts the metadata related to an email message resource.
 *
 * @interface EmailMessageEntity
 * @property {string} id Unique identifier of the email message.
 * @property {string} owner Identifier of the user that owns the email message.
 * @property {OwnerEntity[]} owners List of identifiers of user/accounts associated with this email message.
 * @property {string} emailAddressId Identifier of the email address associated with the email message.
 * @property {string} keyId Unique identifier of the associated decryption/encryption key.
 * @property {string} algorithm Algorithm used to decrypt/encrypt this entity.
 * @property {string} folderId Unique identifier of the email folder which the message resource is assigned to.
 * @property {string} previousFolderId Unique identifier of the previous email folder which the message resource was assigned to, if any.
 * @property {boolean} seen True if the user has previously seen the email message.
 * @property {Direction} direction Direction of the email message.
 * @property {State} state Current state of the email message.
 * @property {string} clientRefId Unique client reference identifier.
 * @property {EmailAddressEntity[]} from List of recipients that the email message was sent from.
 * @property {EmailAddressEntity[]} to List of recipients that the email message is being sent to.
 * @property {EmailAddressEntity[]} cc List of carbon copy recipients of the email message.
 * @property {EmailAddressEntity[]} bcc List of blind carbon copy recipients of the email message.
 * @property {EmailAddressEntity[]} replyTo List of recipients that a reply to this email message will be sent to.
 * @property {string} subject Subject header of the email message.
 * @property {Date} sortDate Date when the email message was processed by the service.
 * @property {Date} createdAt Date when the email message was created.
 * @property {Date} updatedAt Date when the email message was last updated.
 */
export interface EmailMessageEntity {
  id: string
  owner: string
  owners: OwnerEntity[]
  emailAddressId: string
  keyId: string
  algorithm: string
  folderId: string
  previousFolderId?: string
  seen: boolean
  direction: Direction
  state: State
  clientRefId?: string
  from: EmailAddressEntity[]
  to: EmailAddressEntity[]
  cc: EmailAddressEntity[]
  bcc: EmailAddressEntity[]
  replyTo: EmailAddressEntity[]
  subject?: string
  hasAttachments: boolean
  version: number
  sortDate: Date
  createdAt: Date
  updatedAt: Date
  status: EmailMessageEntityStatus
  size: number
  encryptionStatus: EncryptionStatus
}
