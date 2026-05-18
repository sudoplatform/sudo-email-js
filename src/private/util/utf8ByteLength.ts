/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Calculate the UTF-8 byte length of a string in a cross-environment manner.
 * Uses `Buffer.byteLength` when available (Node.js), otherwise falls back
 * to `TextEncoder` (browser).
 */
export function utf8ByteLength(str: string): number {
  if (typeof Buffer !== 'undefined') {
    return Buffer.byteLength(str, 'utf8')
  }
  return new TextEncoder().encode(str).byteLength
}
