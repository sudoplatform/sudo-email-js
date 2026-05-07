/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import Database from 'better-sqlite3'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { InvalidArgumentError } from '../../../public/errors'
import {
  CacheFlushInput,
  CacheGetResult,
  CachePutInput,
  EmailMessageBodyCache,
} from '../../domain/entities/message/emailMessageBodyCache'

/** Default maximum total cache size: 300 MB */
const DEFAULT_CACHE_SIZE_LIMIT_BYTES = 300 * 1024 * 1024

/** Default threshold above which blobs are stored on the filesystem: 1 MB */
const DEFAULT_LARGE_MESSAGE_THRESHOLD_BYTES = 1 * 1024 * 1024

/** Settings table key for the persisted cache size limit */
const SETTINGS_KEY_CACHE_SIZE_LIMIT = 'cache_size_limit_bytes'

/** Default storage directory for the cache database and blob files */
const DEFAULT_CACHE_STORAGE_PATH = path.join(
  os.homedir(),
  '.sudo-email',
  'cache',
)

const CACHE_TABLE_NAME = 'email_message_body_cache'

const SETTINGS_TABLE_NAME = 'email_message_cache_settings'

enum CACHE_TABLE_KEYS {
  MESSAGE_ID = 'message_id',
  SUDO_ID = 'sudo_id',
  EMAIL_ADDRESS_ID = 'email_address_id',
  CONTENT = 'content',
  FS_PATH = 'fs_path',
  CONTENT_ENCODING = 'content_encoding',
  SIZE_BYTES = 'size_bytes',
  LAST_ACCESSED_AT = 'last_accessed_at',
}

enum SETTINGS_TABLE_KEYS {
  KEY = 'key',
  VALUE = 'value',
}

enum QUERY_KEYS {
  TOTAL = 'total',
}

// ---------------------------------------------------------------------------
// Row type interfaces for typed SQLite queries
// ---------------------------------------------------------------------------

interface SettingsRow {
  [SETTINGS_TABLE_KEYS.VALUE]: string
}

interface CacheEntryRow {
  [CACHE_TABLE_KEYS.MESSAGE_ID]: string
  [CACHE_TABLE_KEYS.SUDO_ID]: string | null
  [CACHE_TABLE_KEYS.EMAIL_ADDRESS_ID]: string
  [CACHE_TABLE_KEYS.CONTENT]: string | null
  [CACHE_TABLE_KEYS.FS_PATH]: string | null
  [CACHE_TABLE_KEYS.CONTENT_ENCODING]: string | null
}

interface FsPathRow {
  [CACHE_TABLE_KEYS.FS_PATH]: string | null
}

interface TotalSizeRow {
  [QUERY_KEYS.TOTAL]: number
}

interface EvictionVictimRow {
  [CACHE_TABLE_KEYS.MESSAGE_ID]: string
  [CACHE_TABLE_KEYS.FS_PATH]: string | null
  [CACHE_TABLE_KEYS.SIZE_BYTES]: number
}

// ---------------------------------------------------------------------------

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
 * SQLite-backed implementation of `EmailMessageBodyCache` using `better-sqlite3`.
 *
 * All SQLite operations are synchronous (as required by `better-sqlite3`), wrapped in
 * `async` methods for interface compatibility.
 *
 * Cache errors are always logged and never propagated to callers — the cache is a
 * performance optimisation and must not break message retrieval.
 */
export class DefaultEmailMessageBodyCache implements EmailMessageBodyCache {
  private readonly log: Logger
  private readonly fsStoragePath: string
  private readonly largeMessageThresholdBytes: number

  /** In-memory copy of the persisted cache size limit, kept in sync with the settings table. */
  private cacheSizeLimitBytes: number

  /**
   * The underlying `better-sqlite3` database instance.
   * `null` when the database failed to open — all operations become no-ops.
   */
  private readonly db: Database.Database | null

  constructor(options: DefaultEmailMessageBodyCacheOptions = {}) {
    this.log = new DefaultLogger(this.constructor.name)
    const storagePath = options.cacheStoragePath ?? DEFAULT_CACHE_STORAGE_PATH
    const dbPath = path.join(storagePath, 'email-cache.db')
    this.fsStoragePath = path.join(storagePath, 'blobs')
    this.largeMessageThresholdBytes =
      options.largeMessageThresholdBytes ??
      DEFAULT_LARGE_MESSAGE_THRESHOLD_BYTES
    this.cacheSizeLimitBytes =
      options.initialCacheSizeLimitBytes ?? DEFAULT_CACHE_SIZE_LIMIT_BYTES

    // Ensure storage directories exist before opening the database
    try {
      fs.mkdirSync(storagePath, { recursive: true })
      fs.mkdirSync(this.fsStoragePath, { recursive: true })
    } catch (err) {
      this.log.error('Failed to create cache storage directories', { err })
      this.db = null
      return
    }

    // Open the SQLite database and initialise schema; disable cache on failure
    this.db = null
    try {
      this.db = new Database(dbPath)
      this.initSchema()
      this.cacheSizeLimitBytes = this.initCacheSizeLimit(
        options.initialCacheSizeLimitBytes ?? DEFAULT_CACHE_SIZE_LIMIT_BYTES,
      )
    } catch (err) {
      this.log.error(
        'Failed to initialise cache database — caching disabled for this session',
        { err },
      )
      if (this.db) {
        try {
          this.db.close()
        } catch {
          /* ignore */
        }
      }
      this.db = null
      return
    }
  }

  // ---------------------------------------------------------------------------
  // Public interface methods
  // ---------------------------------------------------------------------------

  async get(messageId: string): Promise<CacheGetResult | undefined> {
    this.log.debug('Getting message', { messageId })
    if (!this.isCacheActive()) return undefined
    try {
      return this.getSync(messageId)
    } catch (err) {
      this.log.error('Cache get error', { messageId, err })
      return undefined
    }
  }

  async put(input: CachePutInput): Promise<void> {
    this.log.debug('Putting message', {
      messageId: input.messageId,
      emailAddressId: input.emailAddressId,
      sudoId: input.sudoId,
    })
    if (!this.isCacheActive()) return
    try {
      this.putSync(input)
    } catch (err) {
      this.log.error('Cache put error', { messageId: input.messageId, err })
    }
  }

  async deleteMessage(messageId: string): Promise<void> {
    this.log.debug('Deleting message', { messageId })
    if (!this.isCacheActive()) return
    try {
      this.deleteMessageSync(messageId)
    } catch (err) {
      this.log.error('Cache deleteMessage error', { messageId, err })
    }
  }

  async flush(input: CacheFlushInput): Promise<void> {
    this.log.debug('Flushing cache', { input })
    if (!this.isCacheActive()) return
    if (!input.sudoId && !input.emailAddressId) {
      throw new InvalidArgumentError(
        'flush requires either sudoId or emailAddressId',
      )
    }
    try {
      this.flushSync(input)
    } catch (err) {
      this.log.error('Cache flush error', { input, err })
    }
  }

  async flushAll(): Promise<void> {
    this.log.debug('Flushing all cache')
    if (!this.isCacheActive()) return
    try {
      this.flushAllSync()
    } catch (err) {
      this.log.error('Cache flushAll error', { err })
    }
  }

  async setCacheSizeLimit(bytes: number): Promise<void> {
    this.log.debug(`Setting cache limit to ${bytes} bytes`)
    if (bytes < 0) {
      throw new InvalidArgumentError(
        `Cache size limit must be >= 0, got ${bytes}`,
      )
    }
    this.cacheSizeLimitBytes = bytes
    // Not using isCacheActive() here so the size can be set properly
    if (!this.db) return
    try {
      this.db
        .prepare(
          `INSERT OR REPLACE INTO ${SETTINGS_TABLE_NAME} 
           (${SETTINGS_TABLE_KEYS.KEY}, ${SETTINGS_TABLE_KEYS.VALUE})
           VALUES (?, ?)`,
        )
        .run(SETTINGS_KEY_CACHE_SIZE_LIMIT, String(bytes))

      if (bytes === 0) {
        this.flushAllSync()
      } else {
        this.evictToFit(0)
      }
    } catch (err) {
      this.log.error('Cache setCacheSizeLimit error', { bytes, err })
    }
  }

  async getTotalSize(): Promise<number> {
    this.log.debug('Getting total size')
    if (!this.isCacheActive()) return 0
    try {
      const row = this.db!.prepare<[], TotalSizeRow>(
        `SELECT COALESCE(SUM(${CACHE_TABLE_KEYS.SIZE_BYTES}), 0) AS ${QUERY_KEYS.TOTAL}
           FROM ${CACHE_TABLE_NAME}`,
      ).get()
      return row?.total ?? 0
    } catch (err) {
      this.log.error('Cache getTotalSize error', { err })
      return 0
    }
  }

  // ---------------------------------------------------------------------------
  // Private synchronous helpers
  // ---------------------------------------------------------------------------

  private initSchema(): void {
    this.log.debug('Initilizing schema')
    this.db!.exec(`
      CREATE TABLE IF NOT EXISTS ${CACHE_TABLE_NAME} (
        ${CACHE_TABLE_KEYS.MESSAGE_ID}        TEXT    NOT NULL PRIMARY KEY,
        ${CACHE_TABLE_KEYS.SUDO_ID}           TEXT,
        ${CACHE_TABLE_KEYS.EMAIL_ADDRESS_ID}  TEXT    NOT NULL,
        ${CACHE_TABLE_KEYS.CONTENT}           TEXT,
        ${CACHE_TABLE_KEYS.FS_PATH}           TEXT,
        ${CACHE_TABLE_KEYS.CONTENT_ENCODING}  TEXT,
        ${CACHE_TABLE_KEYS.SIZE_BYTES}        INTEGER NOT NULL,
        ${CACHE_TABLE_KEYS.LAST_ACCESSED_AT}  INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_${CACHE_TABLE_KEYS.LAST_ACCESSED_AT}
        ON ${CACHE_TABLE_NAME} (${CACHE_TABLE_KEYS.LAST_ACCESSED_AT} ASC);

      CREATE INDEX IF NOT EXISTS idx_${CACHE_TABLE_KEYS.SUDO_ID}
        ON ${CACHE_TABLE_NAME} (${CACHE_TABLE_KEYS.SUDO_ID});

      CREATE INDEX IF NOT EXISTS idx_${CACHE_TABLE_KEYS.EMAIL_ADDRESS_ID}
        ON ${CACHE_TABLE_NAME} (${CACHE_TABLE_KEYS.EMAIL_ADDRESS_ID});

      CREATE TABLE IF NOT EXISTS ${SETTINGS_TABLE_NAME} (
        ${SETTINGS_TABLE_KEYS.KEY}    TEXT NOT NULL PRIMARY KEY,
        ${SETTINGS_TABLE_KEYS.VALUE}  TEXT NOT NULL
      );
    `)
  }

  /**
   * Reads the persisted cache size limit from the settings table.
   * If no value exists yet, writes `initialValue` and returns it.
   */
  private initCacheSizeLimit(initialValue: number): number {
    this.log.debug('initilizing cache size limit', { initialValue })
    const row = this.db!.prepare<[string], SettingsRow>(
      `SELECT ${SETTINGS_TABLE_KEYS.VALUE} FROM ${SETTINGS_TABLE_NAME} WHERE ${SETTINGS_TABLE_KEYS.KEY} = ?`,
    ).get(SETTINGS_KEY_CACHE_SIZE_LIMIT)

    if (row !== undefined) {
      return parseInt(row.value, 10)
    }

    this.db!.prepare(
      `INSERT INTO ${SETTINGS_TABLE_NAME} (
        ${SETTINGS_TABLE_KEYS.KEY}, 
        ${SETTINGS_TABLE_KEYS.VALUE}
      ) VALUES (?, ?)`,
    ).run(SETTINGS_KEY_CACHE_SIZE_LIMIT, String(initialValue))

    return initialValue
  }

  private getSync(messageId: string): CacheGetResult | undefined {
    this.log.debug('getSync', { messageId })
    const row = this.db!.prepare<[string], CacheEntryRow>(
      `SELECT 
        ${CACHE_TABLE_KEYS.MESSAGE_ID}, 
        ${CACHE_TABLE_KEYS.SUDO_ID}, 
        ${CACHE_TABLE_KEYS.EMAIL_ADDRESS_ID}, 
        ${CACHE_TABLE_KEYS.CONTENT}, 
        ${CACHE_TABLE_KEYS.FS_PATH}, 
        ${CACHE_TABLE_KEYS.CONTENT_ENCODING}
        FROM ${CACHE_TABLE_NAME}
        WHERE ${CACHE_TABLE_KEYS.MESSAGE_ID} = ?`,
    ).get(messageId)

    if (!row) return undefined

    // Stale entry: both content and fs_path are NULL
    if (row.content === null && row.fs_path === null) {
      this.log.warn('Stale entry', { row })
      this.deleteMessageSync(messageId)
      return undefined
    }

    let sealedBlob: string

    if (row.fs_path !== null) {
      this.log.debug('Reading from file system', { path: row.fs_path })
      // Large-message: read from filesystem
      try {
        sealedBlob = fs.readFileSync(row.fs_path, 'utf8')
      } catch {
        // File missing or unreadable — treat as stale
        this.deleteMessageSync(messageId)
        return undefined
      }
    } else {
      sealedBlob = row.content!
    }

    // Update last-accessed timestamp
    this.db!.prepare(
      `UPDATE ${CACHE_TABLE_NAME}
         SET ${CACHE_TABLE_KEYS.LAST_ACCESSED_AT} = ?
         WHERE ${CACHE_TABLE_KEYS.MESSAGE_ID} = ?`,
    ).run(Date.now(), messageId)

    return {
      messageId: row.message_id,
      sudoId: row.sudo_id ?? undefined,
      emailAddressId: row.email_address_id,
      sealedBlob,
      contentEncoding: row.content_encoding ?? undefined,
    }
  }

  private putSync(input: CachePutInput): void {
    this.log.debug('putSync', {
      messageId: input.messageId,
      emailAddressId: input.emailAddressId,
      sudoId: input.sudoId,
    })
    if (this.cacheSizeLimitBytes === 0) return

    const blobSize = Buffer.byteLength(input.sealedBlob, 'utf8')
    this.log.debug('Blob size', { blobSize })

    if (blobSize > this.cacheSizeLimitBytes) return

    // Evict LRU entries until there is room for the new blob
    this.evictToFit(blobSize)

    const now = Date.now()

    if (blobSize > this.largeMessageThresholdBytes) {
      // Store on filesystem
      const filePath = path.join(this.fsStoragePath, `${input.messageId}.blob`)
      this.log.debug('Storing in file system', { filePath })
      try {
        fs.writeFileSync(filePath, input.sealedBlob, 'utf8')
      } catch (err) {
        this.log.error('Failed to write large-message blob to filesystem', {
          messageId: input.messageId,
          filePath,
          err,
        })
        return
      }
      this.db!.prepare(
        `INSERT OR REPLACE INTO ${CACHE_TABLE_NAME}
          (
            ${CACHE_TABLE_KEYS.MESSAGE_ID}, 
            ${CACHE_TABLE_KEYS.SUDO_ID},
            ${CACHE_TABLE_KEYS.EMAIL_ADDRESS_ID}, 
            ${CACHE_TABLE_KEYS.CONTENT}, 
            ${CACHE_TABLE_KEYS.FS_PATH}, 
            ${CACHE_TABLE_KEYS.CONTENT_ENCODING}, 
            ${CACHE_TABLE_KEYS.SIZE_BYTES}, 
            ${CACHE_TABLE_KEYS.LAST_ACCESSED_AT}
          )
          VALUES (?, ?, ?, NULL, ?, ?, ?, ?)`,
      ).run(
        input.messageId,
        input.sudoId,
        input.emailAddressId,
        filePath,
        input.contentEncoding ?? null,
        blobSize,
        now,
      )
      return
    }

    // Store inline in SQLite
    this.db!.prepare(
      `INSERT OR REPLACE INTO ${CACHE_TABLE_NAME}
        (
          ${CACHE_TABLE_KEYS.MESSAGE_ID}, 
          ${CACHE_TABLE_KEYS.SUDO_ID}, 
          ${CACHE_TABLE_KEYS.EMAIL_ADDRESS_ID}, 
          ${CACHE_TABLE_KEYS.CONTENT}, 
          ${CACHE_TABLE_KEYS.FS_PATH}, 
          ${CACHE_TABLE_KEYS.CONTENT_ENCODING}, 
          ${CACHE_TABLE_KEYS.SIZE_BYTES}, 
          ${CACHE_TABLE_KEYS.LAST_ACCESSED_AT}
        )
        VALUES (?, ?, ?, ?, NULL, ?, ?, ?)`,
    ).run(
      input.messageId,
      input.sudoId,
      input.emailAddressId,
      input.sealedBlob,
      input.contentEncoding ?? null,
      blobSize,
      now,
    )
  }

  private deleteMessageSync(messageId: string): void {
    this.log.debug('deleteMessageSync', { messageId })
    const row = this.db!.prepare<[string], FsPathRow>(
      `SELECT ${CACHE_TABLE_KEYS.FS_PATH} FROM ${CACHE_TABLE_NAME} WHERE ${CACHE_TABLE_KEYS.MESSAGE_ID} = ?`,
    ).get(messageId)

    if (row?.fs_path) {
      this.log.debug('Deleting from file system', { path: row.fs_path })
      try {
        fs.unlinkSync(row.fs_path)
      } catch {
        // File already gone — ignore
      }
    }

    this.db!.prepare(
      `DELETE FROM ${CACHE_TABLE_NAME} WHERE ${CACHE_TABLE_KEYS.MESSAGE_ID} = ?`,
    ).run(messageId)
  }

  private flushSync(input: CacheFlushInput): void {
    this.log.debug('flushSync', { input })
    if (input.sudoId) {
      this.deleteFilesForQuery(
        `SELECT ${CACHE_TABLE_KEYS.FS_PATH} FROM ${CACHE_TABLE_NAME} WHERE ${CACHE_TABLE_KEYS.SUDO_ID} = ?`,
        input.sudoId,
      )
      this.db!.prepare(
        `DELETE FROM ${CACHE_TABLE_NAME} WHERE ${CACHE_TABLE_KEYS.SUDO_ID} = ?`,
      ).run(input.sudoId)
    }

    if (input.emailAddressId) {
      this.deleteFilesForQuery(
        `SELECT ${CACHE_TABLE_KEYS.FS_PATH} FROM ${CACHE_TABLE_NAME} WHERE ${CACHE_TABLE_KEYS.EMAIL_ADDRESS_ID} = ?`,
        input.emailAddressId,
      )
      this.db!.prepare(
        `DELETE FROM ${CACHE_TABLE_NAME} WHERE ${CACHE_TABLE_KEYS.EMAIL_ADDRESS_ID} = ?`,
      ).run(input.emailAddressId)
    }
  }

  private flushAllSync(): void {
    this.log.debug('flushAllSync')
    this.deleteFilesForQuery(
      `SELECT ${CACHE_TABLE_KEYS.FS_PATH} FROM ${CACHE_TABLE_NAME} WHERE ${CACHE_TABLE_KEYS.FS_PATH} IS NOT NULL`,
    )
    this.db!.prepare(`DELETE FROM ${CACHE_TABLE_NAME}`).run()
  }

  /**
   * Evicts LRU entries (ascending `last_accessed_at`) until the total cached size
   * plus `incomingBytes` fits within `cacheSizeLimitBytes`.
   *
   * All reads and deletes run inside a single transaction.
   */
  private evictToFit(incomingBytes: number): void {
    this.log.debug('evictToFit', { incomingBytes })
    const evict = this.db!.transaction(() => {
      const totalRow = this.db!.prepare<[], TotalSizeRow>(
        `SELECT COALESCE(SUM(${CACHE_TABLE_KEYS.SIZE_BYTES}), 0) AS ${QUERY_KEYS.TOTAL}
           FROM ${CACHE_TABLE_NAME}`,
      ).get()

      let currentTotal = totalRow?.total ?? 0

      while (currentTotal + incomingBytes > this.cacheSizeLimitBytes) {
        const victim = this.db!.prepare<[], EvictionVictimRow>(
          `SELECT 
              ${CACHE_TABLE_KEYS.MESSAGE_ID}, 
              ${CACHE_TABLE_KEYS.FS_PATH}, 
              ${CACHE_TABLE_KEYS.SIZE_BYTES}
            FROM ${CACHE_TABLE_NAME}
            ORDER BY ${CACHE_TABLE_KEYS.LAST_ACCESSED_AT} ASC
            LIMIT 1`,
        ).get()

        if (!victim) break
        this.log.debug('Evicting victim', { victim })

        if (victim.fs_path) {
          this.log.debug('Evicting from file system', { path: victim.fs_path })
          try {
            fs.unlinkSync(victim.fs_path)
          } catch {
            // File already gone — ignore
          }
        }

        this.db!.prepare(
          `DELETE FROM ${CACHE_TABLE_NAME} WHERE ${CACHE_TABLE_KEYS.MESSAGE_ID} = ?`,
        ).run(victim.message_id)

        currentTotal -= victim.size_bytes
      }
    })

    evict()
  }

  /**
   * Deletes filesystem blob files for all rows returned by `query`.
   * Ignores missing files.
   */
  private deleteFilesForQuery(query: string, ...params: unknown[]): void {
    const rows = this.db!.prepare<unknown[], FsPathRow>(query).all(...params)
    for (const row of rows) {
      if (row.fs_path) {
        try {
          fs.unlinkSync(row.fs_path)
        } catch {
          // File already gone — ignore
        }
      }
    }
  }

  private isCacheActive(): boolean {
    return !!this.db && this.cacheSizeLimitBytes > 0
  }
}
