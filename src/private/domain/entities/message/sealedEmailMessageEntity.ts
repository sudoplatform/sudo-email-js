/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Direction, State } from '../../../../public/typings/emailMessage'
import { OwnerEntity } from '../common/ownerEntity'

/**
 * Core entity representation of a sealed email message business rule. Depicts the metadata related to an email message resource.
 *
 * @interface SealedEmailMessageEntity
 * @property {string} id Unique identifier of the email message.
 * @property {string} owner Identifier of the user that owns the email message.
 * @property {OwnerEntity[]} owners List of identifiers of user/accounts associated with this email message.
 * @property {string} emailAddressId Identifier of the email address associated with the email message.
 * @property {string} keyId Unique identifier of the associated decryption/encryption key.
 * @property {string} algorithm Algorithm used to decrypt/encrypt this entity.
 * @property {string} folderId Unique identifier of the email folder which the message resource is assigned to.
 * @property {string} previousFolderId Unique identifier of the previous email folder which the message resource was assigned to, if any.
 * @property {Direction} direction Direction of the email message.
 * @property {boolean} seen True if the user has previously seen the email message.
 * @property {State} state Current state of the email message.
 * @property {string} clientRefId Unique client reference identifier.
 * @property {string} rfc822Header RFC 822 header data for the email message. Contains the recipients and subject matter.
 * @property {Date} sortDate Date when the email message was processed by the service.
 * @property {Date} createdAt Date when the email message was created.
 * @property {Date} updatedAt Date when the email message was last updated.
 */
export interface SealedEmailMessageEntity {
  id: string
  owner: string
  owners: OwnerEntity[]
  emailAddressId: string
  keyId: string
  algorithm: string
  folderId: string
  previousFolderId?: string
  direction: Direction
  seen: boolean
  state: State
  clientRefId?: string
  rfc822Header: string
  version: number
  sortDate: Date
  createdAt: Date
  updatedAt: Date
  size: number
}
