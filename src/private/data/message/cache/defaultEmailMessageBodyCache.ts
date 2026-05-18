/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import { InvalidArgumentError } from '../../../../public/errors'
import {
  CacheFlushInput,
  CacheGetResult,
  CachePutInput,
  EmailMessageBodyCache,
} from '../../../domain/entities/message/emailMessageBodyCache'
import { utf8ByteLength } from '../../../util/utf8ByteLength'
import { BetterSqlite3Adapter } from './betterSqlite3Adapter'
import { CacheStorageAdapter } from './cacheStorageAdapter'
import { SqlJsAdapter } from './sqlJsAdapter'

/** Default maximum total cache size: 300 MB */
const DEFAULT_CACHE_SIZE_LIMIT_BYTES = 300 * 1024 * 1024

/** Default threshold above which blobs are stored on the filesystem: 1 MB */
const DEFAULT_LARGE_MESSAGE_THRESHOLD_BYTES = 1 * 1024 * 1024

/**
 * Construction options for `DefaultEmailMessageBodyCache`.
 *
 * @interface DefaultEmailMessageBodyCacheOptions
 * @property {string} [cacheStoragePath] Directory for all cache storage (database file and blob files).
 *   Default: ~/.sudo-email/cache
 * @property {number} [initialCacheSizeLimitBytes] Initial cache size limit in bytes, written to the
 *   settings table only if no persisted value already exists. Default: 300 MB.
 * @property {number} [largeMessageThresholdBytes] Blobs larger than this value are stored on the
 *   filesystem rather than inline in SQLite. Default: 1 MB.
 */
export interface DefaultEmailMessageBodyCacheOptions {
  cacheStoragePath?: string
  initialCacheSizeLimitBytes?: number
  largeMessageThresholdBytes?: number
}

/**
 * Implementation of `EmailMessageBodyCache` that delegates all persistence
 * to a `CacheStorageAdapter`. The adapter is selected automatically based on
 * environment detection (Node.js → BetterSqlite3Adapter, browser → SqlJsAdapter).
 *
 * This class is a thin orchestrator: it validates arguments, manages the in-memory
 * `cacheSizeLimitBytes` state, swallows errors, and delegates all persistence to
 * the adapter. No SQL, no `instanceof` checks, no conditional filesystem logic.
 *
 * Cache errors are always logged and never propagated to callers — the cache is a
 * performance optimisation and must not break message retrieval.
 *
 * @internal
 */
export class DefaultEmailMessageBodyCache implements EmailMessageBodyCache {
  private readonly log: Logger

  /** In-memory copy of the persisted cache size limit, kept in sync with the settings table. */
  private cacheSizeLimitBytes: number

  /**
   * The underlying storage adapter.
   * `null` when the adapter failed to initialize — all operations become no-ops.
   */
  private adapter: CacheStorageAdapter | null

  /**
   * @internal
   */
  constructor(options: DefaultEmailMessageBodyCacheOptions = {}) {
    this.log = new DefaultLogger(this.constructor.name)
    this.adapter = null
    this.cacheSizeLimitBytes =
      options.initialCacheSizeLimitBytes ?? DEFAULT_CACHE_SIZE_LIMIT_BYTES
  }

  /**
   * Factory method that creates and initializes the cache.
   * Detects the runtime environment and creates the appropriate adapter.
   */
  static async create(
    options: DefaultEmailMessageBodyCacheOptions = {},
  ): Promise<DefaultEmailMessageBodyCache> {
    const cache = new DefaultEmailMessageBodyCache(options)
    await cache.initAdapter(options)
    return cache
  }

  /**
   * Detect the runtime environment, create the appropriate adapter,
   * initialize it, and load/set the persisted cache size limit.
   */
  private async initAdapter(
    options: DefaultEmailMessageBodyCacheOptions,
  ): Promise<void> {
    try {
      if (DefaultEmailMessageBodyCache.isNodeEnvironment()) {
        const pathModule = await import('path')
        const osModule = await import('os')
        const storagePath =
          options.cacheStoragePath ??
          pathModule.join(osModule.homedir(), '.sudo-email', 'cache')
        this.adapter = await BetterSqlite3Adapter.create(
          storagePath,
          options.largeMessageThresholdBytes ??
            DEFAULT_LARGE_MESSAGE_THRESHOLD_BYTES,
        )
      } else {
        this.adapter = await SqlJsAdapter.create()
      }
      await this.adapter.initialize()

      // Load persisted cache size limit
      const persisted = await this.adapter.getCacheSizeLimit()
      if (persisted !== undefined) {
        this.cacheSizeLimitBytes = persisted
      } else {
        await this.adapter.setCacheSizeLimit(this.cacheSizeLimitBytes)
      }
    } catch (err) {
      this.log.error(
        'Failed to initialize cache adapter — caching disabled for this session',
        { err },
      )
      this.adapter = null
    }
  }

  // ---------------------------------------------------------------------------
  // Public interface methods
  // ---------------------------------------------------------------------------

  async get(messageId: string): Promise<CacheGetResult | undefined> {
    if (!this.isCacheActive()) return undefined
    try {
      const entry = await this.adapter!.getEntry(messageId)
      if (!entry) return undefined
      return {
        messageId: entry.messageId,
        sudoId: entry.sudoId,
        emailAddressId: entry.emailAddressId,
        sealedBlob: entry.content,
        contentEncoding: entry.contentEncoding,
      }
    } catch (err) {
      this.log.error('Cache get error', { messageId, err })
      return undefined
    }
  }

  async put(input: CachePutInput): Promise<void> {
    if (!this.isCacheActive()) return
    try {
      const blobSize = utf8ByteLength(input.sealedBlob)
      if (blobSize > this.cacheSizeLimitBytes) return

      await this.adapter!.evictLRU(blobSize, this.cacheSizeLimitBytes)
      await this.adapter!.putEntry({
        messageId: input.messageId,
        sudoId: input.sudoId,
        emailAddressId: input.emailAddressId,
        content: input.sealedBlob,
        contentEncoding: input.contentEncoding,
        sizeBytes: blobSize,
      })
    } catch (err) {
      this.log.error('Cache put error', { messageId: input.messageId, err })
    }
  }

  async deleteMessage(messageId: string): Promise<void> {
    if (!this.isCacheActive()) return
    try {
      await this.adapter!.deleteEntry(messageId)
    } catch (err) {
      this.log.error('Cache deleteMessage error', { messageId, err })
    }
  }

  async flush(input: CacheFlushInput): Promise<void> {
    if (!input.sudoId && !input.emailAddressId) {
      throw new InvalidArgumentError(
        'flush requires either sudoId or emailAddressId',
      )
    }
    if (!this.isCacheActive()) return
    try {
      if (input.sudoId) await this.adapter!.flushBySudoId(input.sudoId)
      if (input.emailAddressId)
        await this.adapter!.flushByEmailAddressId(input.emailAddressId)
    } catch (err) {
      this.log.error('Cache flush error', { input, err })
    }
  }

  async flushAll(): Promise<void> {
    if (!this.isCacheActive()) return
    try {
      await this.adapter!.flushAll()
    } catch (err) {
      this.log.error('Cache flushAll error', { err })
    }
  }

  async setCacheSizeLimit(bytes: number): Promise<void> {
    if (bytes < 0) {
      throw new InvalidArgumentError(
        `Cache size limit must be >= 0, got ${bytes}`,
      )
    }
    this.cacheSizeLimitBytes = bytes
    if (!this.adapter) return
    try {
      await this.adapter.setCacheSizeLimit(bytes)
      if (bytes === 0) {
        await this.adapter.flushAll()
      } else {
        await this.adapter.evictLRU(0, bytes)
      }
    } catch (err) {
      this.log.error('Cache setCacheSizeLimit error', { bytes, err })
    }
  }

  async getTotalSize(): Promise<number> {
    if (!this.isCacheActive()) return 0
    try {
      return await this.adapter!.getTotalSize()
    } catch (err) {
      this.log.error('Cache getTotalSize error', { err })
      return 0
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private isCacheActive(): boolean {
    return this.adapter !== null && this.cacheSizeLimitBytes > 0
  }

  private static isNodeEnvironment(): boolean {
    return (
      typeof process !== 'undefined' &&
      process.versions != null &&
      process.versions.node != null
    )
  }
}
