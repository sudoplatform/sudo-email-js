/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { SealedAttributeInput } from '../../../../gen/graphqlTypes'

export enum BlockedAddressHashAlgorithm {
  SHA256,
}

export interface BlockedAddress {
  hashedBlockedValue: string
  hashAlgorithm: BlockedAddressHashAlgorithm
  sealedValue: SealedAttributeInput
}
