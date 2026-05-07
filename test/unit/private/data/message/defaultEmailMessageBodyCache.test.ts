/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fc from 'fast-check'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import {
  DefaultEmailMessageBodyCache,
  DefaultEmailMessageBodyCacheOptions,
} from '../../../../../src/private/data/message/defaultEmailMessageBodyCache'
import { InvalidArgumentError } from '../../../../../src/public/errors'

describe('DefaultEmailMessageBodyCache', () => {
  let tmpDir: string
  let fsStoragePath: string

  function createCache(
    overrides?: Partial<DefaultEmailMessageBodyCacheOptions>,
  ): DefaultEmailMessageBodyCache {
    return new DefaultEmailMessageBodyCache({
      cacheStoragePath: tmpDir,
      ...overrides,
    })
  }

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'email-cache-test-'))
    fsStoragePath = path.join(tmpDir, 'blobs')
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  // ---------------------------------------------------------------------------
  // Schema creation and settings persistence (Task 4.1)
  // ---------------------------------------------------------------------------

  describe('schema creation and settings persistence', () => {
    it('should create the database file and storage directory on construction', () => {
      createCache()
      expect(fs.existsSync(path.join(tmpDir, 'email-cache.db'))).toBe(true)
      expect(fs.existsSync(fsStoragePath)).toBe(true)
    })

    it('should write initialCacheSizeLimitBytes to settings on first construction', async () => {
      const cache = createCache({ initialCacheSizeLimitBytes: 500 })
      // Verify by checking that a blob of 501 bytes is rejected
      await cache.put({
        messageId: 'msg-1',
        sudoId: 'sudo-1',
        emailAddressId: 'addr-1',
        sealedBlob: 'x'.repeat(501),
      })
      const result = await cache.get('msg-1')
      expect(result).toBeUndefined()
    })

    it('should use persisted value on subsequent construction, ignoring initialCacheSizeLimitBytes', async () => {
      // First construction with 1000 byte limit
      const cache1 = createCache({ initialCacheSizeLimitBytes: 1000 })
      await cache1.setCacheSizeLimit(500)

      // Second construction with a different initial value — should be ignored
      const cache2 = createCache({ initialCacheSizeLimitBytes: 2000 })

      // The persisted 500 byte limit should be in effect
      await cache2.put({
        messageId: 'msg-1',
        sudoId: 'sudo-1',
        emailAddressId: 'addr-1',
        sealedBlob: 'x'.repeat(501),
      })
      const result = await cache2.get('msg-1')
      expect(result).toBeUndefined()
    })

    it('should persist setCacheSizeLimit value in the settings table', async () => {
      const cache1 = createCache({ initialCacheSizeLimitBytes: 10000 })
      await cache1.setCacheSizeLimit(200)

      // New instance reads the persisted value
      const cache2 = createCache({ initialCacheSizeLimitBytes: 10000 })
      await cache2.put({
        messageId: 'msg-1',
        sudoId: 'sudo-1',
        emailAddressId: 'addr-1',
        sealedBlob: 'x'.repeat(201),
      })
      const result = await cache2.get('msg-1')
      expect(result).toBeUndefined()
    })

    it('should disable caching after setCacheSizeLimit(0)', async () => {
      const cache = createCache({ initialCacheSizeLimitBytes: 10000 })

      // Store something first
      await cache.put({
        messageId: 'msg-1',
        sudoId: 'sudo-1',
        emailAddressId: 'addr-1',
        sealedBlob: 'hello',
      })
      expect(await cache.get('msg-1')).toBeDefined()

      // Disable caching
      await cache.setCacheSizeLimit(0)

      // Existing entries should be flushed
      expect(await cache.get('msg-1')).toBeUndefined()

      // New puts should be no-ops
      await cache.put({
        messageId: 'msg-2',
        sudoId: 'sudo-1',
        emailAddressId: 'addr-1',
        sealedBlob: 'world',
      })
      expect(await cache.get('msg-2')).toBeUndefined()
    })

    it('should use default 300 MB limit when no initialCacheSizeLimitBytes is provided', async () => {
      const cache = createCache()
      // A small blob should be cacheable with the default 300 MB limit
      await cache.put({
        messageId: 'msg-1',
        sudoId: 'sudo-1',
        emailAddressId: 'addr-1',
        sealedBlob: 'test content',
      })
      const result = await cache.get('msg-1')
      expect(result).toBeDefined()
      expect(result!.sealedBlob).toBe('test content')
    })
  })

  // ---------------------------------------------------------------------------
  // get (Task 4.2)
  // ---------------------------------------------------------------------------

  describe('get', () => {
    it('should return undefined for a missing entry', async () => {
      const cache = createCache()
      const result = await cache.get('nonexistent')
      expect(result).toBeUndefined()
    })

    it('should return the blob and update lastAccessedAt for a present inline entry', async () => {
      const cache = createCache()
      await cache.put({
        messageId: 'msg-1',
        sudoId: 'sudo-1',
        emailAddressId: 'addr-1',
        sealedBlob: 'sealed-content',
      })

      // Small delay to ensure timestamp difference
      await new Promise((r) => setTimeout(r, 10))

      const result = await cache.get('msg-1')
      expect(result).toBeDefined()
      expect(result!.messageId).toBe('msg-1')
      expect(result!.sudoId).toBe('sudo-1')
      expect(result!.emailAddressId).toBe('addr-1')
      expect(result!.sealedBlob).toBe('sealed-content')
    })

    it('should return the blob for a large-message (filesystem) entry', async () => {
      const largeBlob = 'x'.repeat(2 * 1024 * 1024) // 2 MB
      const cache = createCache({
        initialCacheSizeLimitBytes: 10 * 1024 * 1024,
        largeMessageThresholdBytes: 1 * 1024 * 1024,
      })

      await cache.put({
        messageId: 'msg-large',
        sudoId: 'sudo-1',
        emailAddressId: 'addr-1',
        sealedBlob: largeBlob,
      })

      const result = await cache.get('msg-large')
      expect(result).toBeDefined()
      expect(result!.sealedBlob).toBe(largeBlob)
    })

    it('should remove a stale entry (missing fs file) and return undefined', async () => {
      const cache = createCache({
        initialCacheSizeLimitBytes: 10 * 1024 * 1024,
        largeMessageThresholdBytes: 10, // Force filesystem storage for small blobs
      })

      await cache.put({
        messageId: 'msg-stale',
        sudoId: 'sudo-1',
        emailAddressId: 'addr-1',
        sealedBlob: 'x'.repeat(20),
      })

      // Delete the filesystem file to simulate staleness
      const blobPath = path.join(fsStoragePath, 'msg-stale.blob')
      fs.unlinkSync(blobPath)

      const result = await cache.get('msg-stale')
      expect(result).toBeUndefined()

      // Entry should be removed from the database too
      expect(await cache.getTotalSize()).toBe(0)
    })
  })

  // ---------------------------------------------------------------------------
  // put (Task 4.3)
  // ---------------------------------------------------------------------------

  describe('put', () => {
    it('should store a small blob inline in the SQLite row', async () => {
      const cache = createCache()
      await cache.put({
        messageId: 'msg-1',
        sudoId: 'sudo-1',
        emailAddressId: 'addr-1',
        sealedBlob: 'small-content',
      })

      const result = await cache.get('msg-1')
      expect(result).toBeDefined()
      expect(result!.sealedBlob).toBe('small-content')

      // No filesystem file should exist
      expect(fs.existsSync(path.join(fsStoragePath, 'msg-1.blob'))).toBe(false)
    })

    it('should store a large blob on the filesystem', async () => {
      const largeBlob = 'y'.repeat(2 * 1024 * 1024)
      const cache = createCache({
        initialCacheSizeLimitBytes: 10 * 1024 * 1024,
        largeMessageThresholdBytes: 1 * 1024 * 1024,
      })

      await cache.put({
        messageId: 'msg-large',
        sudoId: 'sudo-1',
        emailAddressId: 'addr-1',
        sealedBlob: largeBlob,
      })

      // Filesystem file should exist
      expect(fs.existsSync(path.join(fsStoragePath, 'msg-large.blob'))).toBe(
        true,
      )

      const result = await cache.get('msg-large')
      expect(result!.sealedBlob).toBe(largeBlob)
    })

    it('should skip storage when blob exceeds cacheSizeLimitBytes', async () => {
      const cache = createCache({ initialCacheSizeLimitBytes: 100 })

      await cache.put({
        messageId: 'msg-oversized',
        sudoId: 'sudo-1',
        emailAddressId: 'addr-1',
        sealedBlob: 'x'.repeat(101),
      })

      expect(await cache.get('msg-oversized')).toBeUndefined()
      expect(await cache.getTotalSize()).toBe(0)
    })

    it('should evict LRU entries when the cache is full', async () => {
      const cache = createCache({ initialCacheSizeLimitBytes: 100 })

      // Fill the cache with two entries
      await cache.put({
        messageId: 'msg-old',
        sudoId: 'sudo-1',
        emailAddressId: 'addr-1',
        sealedBlob: 'a'.repeat(50),
      })

      await new Promise((r) => setTimeout(r, 10))

      await cache.put({
        messageId: 'msg-new',
        sudoId: 'sudo-1',
        emailAddressId: 'addr-1',
        sealedBlob: 'b'.repeat(50),
      })

      // Adding another entry should evict the oldest
      await cache.put({
        messageId: 'msg-newest',
        sudoId: 'sudo-1',
        emailAddressId: 'addr-1',
        sealedBlob: 'c'.repeat(50),
      })

      // msg-old should have been evicted
      expect(await cache.get('msg-old')).toBeUndefined()
      // msg-new and msg-newest should still be present
      expect(await cache.get('msg-new')).toBeDefined()
      expect(await cache.get('msg-newest')).toBeDefined()
    })

    it('should be a no-op when cacheSizeLimitBytes is 0', async () => {
      const cache = createCache({ initialCacheSizeLimitBytes: 0 })

      await cache.put({
        messageId: 'msg-1',
        sudoId: 'sudo-1',
        emailAddressId: 'addr-1',
        sealedBlob: 'content',
      })

      expect(await cache.get('msg-1')).toBeUndefined()
      expect(await cache.getTotalSize()).toBe(0)
    })
  })

  // ---------------------------------------------------------------------------
  // deleteMessage, flush, flushAll, setCacheSizeLimit (Task 4.4)
  // ---------------------------------------------------------------------------

  describe('deleteMessage', () => {
    it('should remove an existing entry and its filesystem file', async () => {
      const cache = createCache({
        initialCacheSizeLimitBytes: 10 * 1024 * 1024,
        largeMessageThresholdBytes: 10,
      })

      await cache.put({
        messageId: 'msg-1',
        sudoId: 'sudo-1',
        emailAddressId: 'addr-1',
        sealedBlob: 'x'.repeat(20),
      })

      expect(fs.existsSync(path.join(fsStoragePath, 'msg-1.blob'))).toBe(true)

      await cache.deleteMessage('msg-1')

      expect(await cache.get('msg-1')).toBeUndefined()
      expect(fs.existsSync(path.join(fsStoragePath, 'msg-1.blob'))).toBe(false)
    })

    it('should be a no-op for a missing entry', async () => {
      const cache = createCache()
      // Should not throw
      await cache.deleteMessage('nonexistent')
      expect(await cache.getTotalSize()).toBe(0)
    })
  })

  describe('flush', () => {
    it('should remove only entries matching the given sudoId', async () => {
      const cache = createCache()

      await cache.put({
        messageId: 'msg-1',
        sudoId: 'sudo-A',
        emailAddressId: 'addr-1',
        sealedBlob: 'content-1',
      })
      await cache.put({
        messageId: 'msg-2',
        sudoId: 'sudo-B',
        emailAddressId: 'addr-2',
        sealedBlob: 'content-2',
      })
      await cache.put({
        messageId: 'msg-3',
        sudoId: 'sudo-A',
        emailAddressId: 'addr-3',
        sealedBlob: 'content-3',
      })

      await cache.flush({ sudoId: 'sudo-A' })

      expect(await cache.get('msg-1')).toBeUndefined()
      expect(await cache.get('msg-3')).toBeUndefined()
      expect(await cache.get('msg-2')).toBeDefined()
    })

    it('should remove only entries matching the given emailAddressId', async () => {
      const cache = createCache()

      await cache.put({
        messageId: 'msg-1',
        sudoId: 'sudo-1',
        emailAddressId: 'addr-A',
        sealedBlob: 'content-1',
      })
      await cache.put({
        messageId: 'msg-2',
        sudoId: 'sudo-1',
        emailAddressId: 'addr-B',
        sealedBlob: 'content-2',
      })

      await cache.flush({ emailAddressId: 'addr-A' })

      expect(await cache.get('msg-1')).toBeUndefined()
      expect(await cache.get('msg-2')).toBeDefined()
    })

    it('should throw InvalidArgumentError when neither sudoId nor emailAddressId is provided', async () => {
      const cache = createCache()
      await expect(cache.flush({})).rejects.toThrow(InvalidArgumentError)
    })
  })

  describe('flushAll', () => {
    it('should remove all entries and filesystem files', async () => {
      const cache = createCache({
        initialCacheSizeLimitBytes: 10 * 1024 * 1024,
        largeMessageThresholdBytes: 10,
      })

      await cache.put({
        messageId: 'msg-1',
        sudoId: 'sudo-1',
        emailAddressId: 'addr-1',
        sealedBlob: 'x'.repeat(20),
      })
      await cache.put({
        messageId: 'msg-2',
        sudoId: 'sudo-2',
        emailAddressId: 'addr-2',
        sealedBlob: 'y'.repeat(20),
      })

      await cache.flushAll()

      expect(await cache.getTotalSize()).toBe(0)
      expect(await cache.get('msg-1')).toBeUndefined()
      expect(await cache.get('msg-2')).toBeUndefined()
      expect(fs.existsSync(path.join(fsStoragePath, 'msg-1.blob'))).toBe(false)
      expect(fs.existsSync(path.join(fsStoragePath, 'msg-2.blob'))).toBe(false)
    })
  })

  describe('setCacheSizeLimit', () => {
    it('should trigger immediate LRU eviction when current usage exceeds the new limit', async () => {
      const cache = createCache({ initialCacheSizeLimitBytes: 1000 })

      await cache.put({
        messageId: 'msg-1',
        sudoId: 'sudo-1',
        emailAddressId: 'addr-1',
        sealedBlob: 'a'.repeat(300),
      })

      await new Promise((r) => setTimeout(r, 10))

      await cache.put({
        messageId: 'msg-2',
        sudoId: 'sudo-1',
        emailAddressId: 'addr-1',
        sealedBlob: 'b'.repeat(300),
      })

      // Reduce limit — should evict msg-1 (oldest)
      await cache.setCacheSizeLimit(350)

      expect(await cache.get('msg-1')).toBeUndefined()
      expect(await cache.get('msg-2')).toBeDefined()
    })

    it('should throw InvalidArgumentError for a negative value', async () => {
      const cache = createCache()
      await expect(cache.setCacheSizeLimit(-1)).rejects.toThrow(
        InvalidArgumentError,
      )
    })
  })

  // ---------------------------------------------------------------------------
  // Property-based tests
  // ---------------------------------------------------------------------------

  // Feature: pemc-1740, Property 4: Cache entry schema round-trip
  describe('Property 4: Cache entry schema round-trip', () => {
    it('after put then get, returned blob equals original and metadata is preserved', async () => {
      const cache = createCache({
        initialCacheSizeLimitBytes: 50 * 1024 * 1024,
      })

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            messageId: fc.uuid(),
            sudoId: fc.uuid(),
            emailAddressId: fc.uuid(),
            blob: fc.string({ minLength: 1, maxLength: 1000 }),
          }),
          async ({ messageId, sudoId, emailAddressId, blob }) => {
            await cache.put({
              messageId,
              sudoId,
              emailAddressId,
              sealedBlob: blob,
            })

            const result = await cache.get(messageId)
            expect(result).toBeDefined()
            expect(result!.messageId).toBe(messageId)
            expect(result!.sudoId).toBe(sudoId)
            expect(result!.emailAddressId).toBe(emailAddressId)
            expect(result!.sealedBlob).toBe(blob)

            await cache.deleteMessage(messageId)
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  // Feature: pemc-1740, Property 5: Storage routing by blob size
  describe('Property 5: Storage routing by blob size', () => {
    it('blobs <= threshold are stored inline; blobs > threshold are stored on filesystem', async () => {
      const threshold = 500
      const cache = createCache({
        initialCacheSizeLimitBytes: 50 * 1024 * 1024,
        largeMessageThresholdBytes: threshold,
      })

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            messageId: fc.uuid(),
            size: fc.integer({ min: 1, max: 2000 }),
          }),
          async ({ messageId, size }) => {
            const blob = 'x'.repeat(size)
            await cache.put({
              messageId,
              sudoId: 'sudo-1',
              emailAddressId: 'addr-1',
              sealedBlob: blob,
            })

            const blobPath = path.join(fsStoragePath, `${messageId}.blob`)
            const blobSize = Buffer.byteLength(blob, 'utf8')

            if (blobSize > threshold) {
              expect(fs.existsSync(blobPath)).toBe(true)
            } else {
              expect(fs.existsSync(blobPath)).toBe(false)
            }

            const result = await cache.get(messageId)
            expect(result).toBeDefined()
            expect(result!.sealedBlob).toBe(blob)

            await cache.deleteMessage(messageId)
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  // Feature: pemc-1740, Property 6: LRU access timestamp update
  describe('Property 6: LRU access timestamp update', () => {
    it('accessing an entry via get prevents it from being evicted before unaccessed entries', async () => {
      const entrySize = 60
      const limit = entrySize * 3 + 10
      const cache = createCache({ initialCacheSizeLimitBytes: limit })

      await fc.assert(
        fc.asyncProperty(fc.uuid(), async () => {
          await cache.flushAll()

          await cache.put({
            messageId: 'entry-first',
            sudoId: 'sudo-1',
            emailAddressId: 'addr-1',
            sealedBlob: 'a'.repeat(entrySize),
          })

          await new Promise((r) => setTimeout(r, 15))

          await cache.put({
            messageId: 'entry-second',
            sudoId: 'sudo-1',
            emailAddressId: 'addr-1',
            sealedBlob: 'b'.repeat(entrySize),
          })

          await new Promise((r) => setTimeout(r, 15))

          await cache.put({
            messageId: 'entry-third',
            sudoId: 'sudo-1',
            emailAddressId: 'addr-1',
            sealedBlob: 'c'.repeat(entrySize),
          })

          await new Promise((r) => setTimeout(r, 15))

          const accessed = await cache.get('entry-first')
          expect(accessed).toBeDefined()

          await new Promise((r) => setTimeout(r, 15))

          await cache.put({
            messageId: 'entry-fourth',
            sudoId: 'sudo-1',
            emailAddressId: 'addr-1',
            sealedBlob: 'd'.repeat(entrySize),
          })

          expect(await cache.get('entry-first')).toBeDefined()
          expect(await cache.get('entry-second')).toBeUndefined()
        }),
        { numRuns: 20 },
      )
    })
  })

  // Feature: pemc-1740, Property 7: LRU eviction maintains size invariant
  describe('Property 7: LRU eviction maintains size invariant', () => {
    it('total cache size never exceeds cacheSizeLimitBytes after any put', async () => {
      const limit = 500
      const cache = createCache({ initialCacheSizeLimitBytes: limit })

      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              messageId: fc.uuid(),
              size: fc.integer({ min: 1, max: 200 }),
            }),
            { minLength: 1, maxLength: 20 },
          ),
          async (entries) => {
            await cache.flushAll()

            for (const entry of entries) {
              await cache.put({
                messageId: entry.messageId,
                sudoId: 'sudo-1',
                emailAddressId: 'addr-1',
                sealedBlob: 'x'.repeat(entry.size),
              })

              const totalSize = await cache.getTotalSize()
              expect(totalSize).toBeLessThanOrEqual(limit)
            }
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  // Feature: pemc-1740, Property 8: Size limit reduction triggers immediate eviction
  describe('Property 8: Size limit reduction triggers immediate eviction', () => {
    it('after setCacheSizeLimit(L), total cached size is <= L', async () => {
      const cache = createCache({ initialCacheSizeLimitBytes: 10000 })

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 5000 }),
          async (newLimit) => {
            await cache.flushAll()

            for (let i = 0; i < 5; i++) {
              await cache.put({
                messageId: `msg-${i}`,
                sudoId: 'sudo-1',
                emailAddressId: 'addr-1',
                sealedBlob: 'y'.repeat(500),
              })
            }

            await cache.setCacheSizeLimit(newLimit)

            const totalSize = await cache.getTotalSize()
            expect(totalSize).toBeLessThanOrEqual(newLimit)

            await cache.setCacheSizeLimit(10000)
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  // Feature: pemc-1740, Property 10: Oversized messages never cached
  describe('Property 10: Oversized messages never cached', () => {
    it('put with a blob larger than cacheSizeLimitBytes leaves cache unchanged', async () => {
      const limit = 500
      const cache = createCache({ initialCacheSizeLimitBytes: limit })

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: limit + 1, max: limit * 3 }),
          async (blobSize) => {
            const sizeBefore = await cache.getTotalSize()

            await cache.put({
              messageId: `oversized-${blobSize}`,
              sudoId: 'sudo-1',
              emailAddressId: 'addr-1',
              sealedBlob: 'z'.repeat(blobSize),
            })

            const sizeAfter = await cache.getTotalSize()
            expect(sizeAfter).toBe(sizeBefore)

            const result = await cache.get(`oversized-${blobSize}`)
            expect(result).toBeUndefined()
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  // Feature: pemc-1740, Property 11: Scoped flush removes exactly matching entries
  describe('Property 11: Scoped flush removes exactly matching entries', () => {
    it('flush by sudoId removes only matching entries', async () => {
      const cache = createCache({
        initialCacheSizeLimitBytes: 50 * 1024 * 1024,
      })

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            targetSudoId: fc.uuid(),
            otherSudoId: fc.uuid(),
          }),
          async ({ targetSudoId, otherSudoId }) => {
            await cache.flushAll()
            if (targetSudoId === otherSudoId) return

            await cache.put({
              messageId: 'msg-target',
              sudoId: targetSudoId,
              emailAddressId: 'addr-1',
              sealedBlob: 'target-content',
            })
            await cache.put({
              messageId: 'msg-other',
              sudoId: otherSudoId,
              emailAddressId: 'addr-2',
              sealedBlob: 'other-content',
            })

            await cache.flush({ sudoId: targetSudoId })

            expect(await cache.get('msg-target')).toBeUndefined()
            expect(await cache.get('msg-other')).toBeDefined()
          },
        ),
        { numRuns: 100 },
      )
    })

    it('flush by emailAddressId removes only matching entries', async () => {
      const cache = createCache({
        initialCacheSizeLimitBytes: 50 * 1024 * 1024,
      })

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            targetAddrId: fc.uuid(),
            otherAddrId: fc.uuid(),
          }),
          async ({ targetAddrId, otherAddrId }) => {
            await cache.flushAll()
            if (targetAddrId === otherAddrId) return

            await cache.put({
              messageId: 'msg-target',
              sudoId: 'sudo-1',
              emailAddressId: targetAddrId,
              sealedBlob: 'target-content',
            })
            await cache.put({
              messageId: 'msg-other',
              sudoId: 'sudo-1',
              emailAddressId: otherAddrId,
              sealedBlob: 'other-content',
            })

            await cache.flush({ emailAddressId: targetAddrId })

            expect(await cache.get('msg-target')).toBeUndefined()
            expect(await cache.get('msg-other')).toBeDefined()
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  // Feature: pemc-1740, Property 12: Delete by message ID is idempotent
  describe('Property 12: Delete by message ID is idempotent', () => {
    it('deleteMessage succeeds regardless of whether entry exists', async () => {
      const cache = createCache({
        initialCacheSizeLimitBytes: 50 * 1024 * 1024,
      })

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            messageId: fc.uuid(),
            exists: fc.boolean(),
          }),
          async ({ messageId, exists }) => {
            await cache.flushAll()

            if (exists) {
              await cache.put({
                messageId,
                sudoId: 'sudo-1',
                emailAddressId: 'addr-1',
                sealedBlob: 'some-content',
              })
            }

            await cache.deleteMessage(messageId)

            const result = await cache.get(messageId)
            expect(result).toBeUndefined()
          },
        ),
        { numRuns: 100 },
      )
    })
  })
})
