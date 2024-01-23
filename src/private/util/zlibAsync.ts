/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { gunzip, gzip } from 'zlib'

export async function gzipAsync(message: ArrayBuffer) {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    gzip(message, (err, output) => {
      if (err) {
        reject(err)
      } else {
        resolve(output)
      }
    })
  })
}

export async function gunzipAsync(compressed: ArrayBuffer) {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    gunzip(compressed, (err, output) => {
      if (err) {
        reject(err)
      } else {
        resolve(output)
      }
    })
  })
}
