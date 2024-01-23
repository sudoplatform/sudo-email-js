/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Owner } from '@sudoplatform/sudo-common'
import { EmailFolder } from './emailFolder'

/**
 * The Sudo Platform SDK representation of an email address provisioned by the email service.
 *
 * @interface EmailAddress
 * @property {string} id Unique identifier of the email address.
 * @property {string} owner Identifier of the user that owns the email address.
 * @property {OwnerEntity[]} owners List of identifiers of user/accounts associated with this email address.
 * @property {string} emailAddress Address in format 'local-part@domain' of the email address.
 * @property {number} size The total size of all email messages assigned to the email address.
 * @property {number} version Version of this entity, increments on update.
 * @property {Date} createdAt Date when the email address was created.
 * @property {Date} updatedAt Date when the email address was last updated.
 * @property {Date} lastReceivedAt Date when the email address last received an email message.
 * @property {string} alias An alias for the email address.
 */
export interface EmailAddress
  extends EmailAddressProps,
    SealedEmailAddressProps {}

export interface EmailAddressProps {
  id: string
  owner: string
  owners: Owner[]
  identityId: string
  emailAddress: string
  size: number
  version: number
  createdAt: Date
  updatedAt: Date
  lastReceivedAt: Date | undefined
  folders: EmailFolder[]
}
export interface SealedEmailAddressProps {
  alias?: string
}
