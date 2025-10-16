/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Owner } from '@sudoplatform/sudo-common'

export enum EmailMaskStatus {
  // The email mask is currently enabled
  ENABLED = 'ENABLED',
  // The email mask has been disabled by the owner
  DISABLED = 'DISABLED',
  // The email mask has been locked by the system
  LOCKED = 'LOCKED',
}

export enum EmailMaskRealAddressType {
  // The real email address is an internal email address managed by the email service
  INTERNAL = 'INTERNAL',
  // The real email address is an external email address not managed by the email service
  EXTERNAL = 'EXTERNAL',
}

export interface EmailMaskProps {
  id: string
  owner: string
  owners: Owner[]
  identityId: string
  maskAddress: string
  realAddress: string
  realAddressType: EmailMaskRealAddressType
  status: EmailMaskStatus
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

export interface SealedEmailMaskProps {
  metadata?: Record<string, any>
}

/**
 * The Sudo Platform SDK representation of an email mask.
 *
 * @interface EmailMask
 * @property {string} id Unique identifier of the email mask.
 * @property {string} owner Identifier of the user owns the email mask resource.
 * @property {Owner[]} owners List of identifiers of user/accounts associated with this email mask.
 * @property {string} identityId The identityId of the user that owns the email mask resource.
 * @property {string} maskAddress The mask email address that will be publicly visible.
 * @property {string} realAddress The real email address that the mask forwards to.
 * @property {EmailMaskRealAddressType} realAddressType The type of the real email address.
 * @property {EmailMaskStatus} status The status of the email mask.
 * @property {number} inboundReceived Number of inbound messages received by the email mask.
 * @property {number} inboundDelivered Number of inbound messages delivered to the real email address.
 * @property {number} outboundReceived Number of outbound messages attempted to be sent from the real email address through the email mask.
 * @property {number} outboundDelivered Number of outbound messages successfully sent from the real email address through the email mask.
 * @property {number} spamCount Number of inbound messages that were flagged as spam.
 * @property {number} virusCount Number of inbound messages that were flagged as viruses.
 * @property {JSON} metadata Optional metadata associated with the email mask.
 * @property {Date} expiresAt Optional TTL signifying when the email mask will be automatically deactivated.
 * @property {Date} createdAt Date and time when the email mask was created.
 * @property {Date} updatedAt Date and time when the email mask was last updated.
 * @property {number} version Version of the email mask resource.
 */
export interface EmailMask extends EmailMaskProps, SealedEmailMaskProps {}