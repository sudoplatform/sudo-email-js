/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import JSDOMEnvironment from 'jest-environment-jsdom'
import { TextDecoder, TextEncoder } from 'util'
import waitForExpect from 'wait-for-expect'
import { setImmediate } from 'timers'

require('dotenv').config({ quiet: true })

waitForExpect.defaults.interval = 500
waitForExpect.defaults.timeout = 30000

global.setImmediate = setImmediate

export default class JSDomEnvironmentPlusMissing extends JSDOMEnvironment {
  constructor(...args: ConstructorParameters<typeof JSDOMEnvironment>) {
    super(...args)

    // Workaround for `jsdom` test environment not providing structuredClone.
    this.global.structuredClone = structuredClone
    // Workaround for `jsdom` test environment not providing TextEncoder and
    // TextDecoder.
    this.global.TextEncoder = TextEncoder as typeof global.TextEncoder
    this.global.TextDecoder = TextDecoder as typeof global.TextDecoder

    // Add proper crypto support for v17 sudo-user JWT operations
    const { webcrypto } = require('crypto')
    if (!this.global.crypto || !this.global.crypto.subtle) {
      Object.defineProperty(this.global, 'crypto', {
        value: webcrypto,
        writable: true,
        configurable: true
      })
    }

    // Ensure proper fetch support
    if (!this.global.fetch) {
      Object.defineProperty(this.global, 'fetch', {
        value: require('node-fetch'),
        writable: true,
        configurable: true
      })
    }

    // Fix Uint8Array for jose library compatibility
    // jose requires actual Uint8Array instances, not jsdom's version
    this.global.Uint8Array = Uint8Array
    this.global.ArrayBuffer = ArrayBuffer
  }
}
