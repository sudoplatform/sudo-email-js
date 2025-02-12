/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

export interface FolderUseCaseOutput {
  id: string
  owner: string
  owners: Array<{ id: string; issuer: string }>
  emailAddressId: string
  folderName: string
  customFolderName?: string
  size: number
  unseenCount: number
  ttl?: number
  version: number
  createdAt: Date
  updatedAt: Date
  status: { type: 'Completed' } | { type: 'Failed'; cause: Error }
}
