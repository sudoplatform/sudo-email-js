import { TextDecoder, TextEncoder } from 'util'
import waitForExpect from 'wait-for-expect'
import { setImmediate } from 'timers'
import { webcrypto } from 'crypto'
import { w3cwebsocket as W3CWebSocket } from 'websocket'

// Load environment variables
import 'dotenv/config'

// Provide WebSocket globally for AWS Amplify GraphQL subscriptions
// AWS Amplify checks globalThis.WebSocket for subscription connectivity
globalThis.WebSocket = W3CWebSocket as unknown as typeof WebSocket

// Configure wait-for-expect defaults
waitForExpect.defaults.interval = 500
waitForExpect.defaults.timeout = 30000

// Provide setImmediate globally
globalThis.setImmediate = setImmediate as typeof globalThis.setImmediate

// Workaround for jsdom not providing structuredClone
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = structuredClone
}

// Workaround for jsdom not providing TextEncoder and TextDecoder
globalThis.TextEncoder = TextEncoder as typeof globalThis.TextEncoder
globalThis.TextDecoder = TextDecoder as typeof globalThis.TextDecoder

// Add proper crypto support for v17 sudo-user JWT operations
if (!globalThis.crypto || !globalThis.crypto.subtle) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    writable: true,
    configurable: true,
  })
}

// Fix Uint8Array for jose library compatibility in jsdom
// jose requires actual Uint8Array instances, not jsdom's version
// Only apply in jsdom to avoid issues in node environment
if (typeof window !== 'undefined') {
  globalThis.Uint8Array = Uint8Array
  globalThis.ArrayBuffer = ArrayBuffer
}
