/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { OwnerEntity } from '../common/ownerEntity'

export type EmailAliasMetadata = Record<string, any> | Error

export enum EmailAliasEntityStatus {
  ENABLED = 'ENABLED',
  DISABLED = 'DISABLED',
  LOCKED = 'LOCKED',
  PENDING = 'PENDING',
}

export enum EmailAliasEntityRealAddressType {
  INTERNAL = 'INTERNAL',
  EXTERNAL = 'EXTERNAL',
}

export interface EmailAliasEntity {
  id: string
  owner: string
  owners: OwnerEntity[]
  identityId: string
  aliasAddress: string
  realAddress: string
  realAddressType: EmailAliasEntityRealAddressType
  status: EmailAliasEntityStatus
  inboundReceived: number
  inboundDelivered: number
  outboundReceived: number
  outboundDelivered: number
  spamCount: number
  virusCount: number
  metadata?: EmailAliasMetadata
  expiresAt?: Date
  createdAt: Date
  updatedAt: Date
  version: number
}
