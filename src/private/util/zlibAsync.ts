/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { gzipSync, gunzipSync } from 'fflate'

export async function gzipAsync(message: ArrayBuffer) {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    try {
      return resolve(gzipSync(new Uint8Array(message)))
    } catch (e) {
      reject(e)
    }
  })
}

export async function gunzipAsync(compressed: ArrayBuffer) {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    try {
      return resolve(gunzipSync(new Uint8Array(compressed)))
    } catch (e) {
      reject(e)
    }
  })
}
