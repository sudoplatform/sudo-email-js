/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Owner } from '@sudoplatform/sudo-common'

export enum EmailAliasStatus {
  // The email alias is currently enabled
  ENABLED = 'ENABLED',
  // The email alias has been disabled by the owner
  DISABLED = 'DISABLED',
  // The email alias has been locked by the system
  LOCKED = 'LOCKED',
  // The email alias is pending verification
  PENDING = 'PENDING',
}

export enum EmailAliasRealAddressType {
  // The real email address is an internal email address managed by the email service
  INTERNAL = 'INTERNAL',
  // The real email address is an external email address not managed by the email service
  EXTERNAL = 'EXTERNAL',
}

export interface EmailAliasProps {
  id: string
  owner: string
  owners: Owner[]
  identityId: string
  aliasAddress: string
  realAddress: string
  realAddressType: EmailAliasRealAddressType
  status: EmailAliasStatus
  inboundReceived: number
  inboundDelivered: number
  outboundReceived: number
  outboundDelivered: number
  spamCount: number
  virusCount: number
  expiresAt?: Date
  createdAt: Date
  updatedAt: Date
  version: number
}

export interface SealedEmailAliasProps {
  metadata?: Record<string, any>
}

/**
 * The Sudo Platform SDK representation of an email alias.
 *
 * @interface EmailAlias
 * @property {string} id Unique identifier of the email alias.
 * @property {string} owner Identifier of the user owns the email alias resource.
 * @property {Owner[]} owners List of identifiers of user/accounts associated with this email alias.
 * @property {string} identityId The identityId of the user that owns the email alias resource.
 * @property {string} aliasAddress The alias email address that will be publicly visible.
 * @property {string} realAddress The real email address that the alias forwards to.
 * @property {EmailAliasRealAddressType} realAddressType The type of the real email address.
 * @property {EmailAliasStatus} status The status of the email alias.
 * @property {number} inboundReceived Number of inbound messages received by the email alias.
 * @property {number} inboundDelivered Number of inbound messages delivered to the real email address.
 * @property {number} outboundReceived Number of outbound messages attempted to be sent from the real email address through the email alias.
 * @property {number} outboundDelivered Number of outbound messages successfully sent from the real email address through the email alias.
 * @property {number} spamCount Number of inbound messages that were flagged as spam.
 * @property {number} virusCount Number of inbound messages that were flagged as viruses.
 * @property {JSON} metadata Optional metadata associated with the email alias.
 * @property {Date} expiresAt Optional TTL signifying when the email alias will be automatically deactivated.
 * @property {Date} createdAt Date and time when the email alias was created.
 * @property {Date} updatedAt Date and time when the email alias was last updated.
 * @property {number} version Version of the email alias resource.
 */
export interface EmailAlias extends EmailAliasProps, SealedEmailAliasProps {}
