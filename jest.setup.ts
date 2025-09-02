/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { TextDecoder, TextEncoder } from 'util'
import waitForExpect from 'wait-for-expect'
require('dotenv').config()
// Workaround for `jsdom` test environment not providing TextEncoder and
// TextDecoder.
global.TextEncoder = TextEncoder as typeof global.TextEncoder
global.TextDecoder = TextDecoder as typeof global.TextDecoder
waitForExpect.defaults.interval = 500
waitForExpect.defaults.timeout = 30000
