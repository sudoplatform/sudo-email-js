/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import fs from 'fs'

export const getImageFileData = (): string => {
  return fs.readFileSync('test/util/files/dogimage.jpeg', {
    encoding: 'base64',
  })
}

export const getPdfFileData = (): string => {
  return fs.readFileSync('test/util/files/lorem-ipsum.pdf', {
    encoding: 'base64',
  })
}
