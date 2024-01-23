/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { createHash } from 'crypto'

export function generateHash(cleartext: string): string {
  return createHash('sha256').update(cleartext).digest('base64')
}
