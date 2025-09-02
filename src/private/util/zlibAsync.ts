/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { gzipSync, gunzipSync } from 'fflate'
import { Buffer as BufferUtil } from '@sudoplatform/sudo-common'

export async function gzipAsync(message: ArrayBuffer) {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    try {
      const compressed = gzipSync(new Uint8Array(message))
      resolve(BufferUtil.toArrayBuffer(compressed))
    } catch (e) {
      reject(e)
    }
  })
}

export async function gunzipAsync(compressed: ArrayBuffer) {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    try {
      const decompressed = gunzipSync(new Uint8Array(compressed))
      return resolve(BufferUtil.toArrayBuffer(decompressed))
    } catch (e) {
      reject(e)
    }
  })
}
