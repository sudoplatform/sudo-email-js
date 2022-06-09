import { TextDecoder, TextEncoder } from 'util'
import waitForExpect from 'wait-for-expect'
// Workaround for `jsdom` test environment not providing TextEncoder and
// TextDecoder.
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder
waitForExpect.defaults.interval = 500
waitForExpect.defaults.timeout = 30000
