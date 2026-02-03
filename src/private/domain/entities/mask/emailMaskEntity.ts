/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { OwnerEntity } from '../common/ownerEntity'

export type EmailMaskMetadata = Record<string, any> | Error

export enum EmailMaskEntityStatus {
  ENABLED = 'ENABLED',
  DISABLED = 'DISABLED',
  LOCKED = 'LOCKED',
  PENDING = 'PENDING',
}

export enum EmailMaskEntityRealAddressType {
  INTERNAL = 'INTERNAL',
  EXTERNAL = 'EXTERNAL',
}

export interface EmailMaskEntity {
  id: string
  owner: string
  owners: OwnerEntity[]
  identityId: string
  maskAddress: string
  realAddress: string
  realAddressType: EmailMaskEntityRealAddressType
  status: EmailMaskEntityStatus
  inboundReceived: number
  inboundDelivered: number
  outboundReceived: number
  outboundDelivered: number
  spamCount: number
  virusCount: number
  metadata?: EmailMaskMetadata
  expiresAt?: Date
  createdAt: Date
  updatedAt: Date
  version: number
}
