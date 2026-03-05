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
  }
}
