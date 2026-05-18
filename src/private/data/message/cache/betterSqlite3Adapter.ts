/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import type Database from 'better-sqlite3'
import type * as fs from 'fs'
import type * as path from 'path'
import {
  CacheColumn,
  CacheEntry,
  CacheEntryInput,
  CacheStorageAdapter,
  CacheTable,
  SettingsColumn,
  SettingsKey,
} from './cacheStorageAdapter'

/**
 * CacheStorageAdapter implementation backed by better-sqlite3 (Node.js native addon).
 * Owns its schema (WITH `fs_path` column), handles filesystem blob storage internally
 * for large messages, and encapsulates all SQL.
 *
 * Uses dynamic imports to avoid static module resolution issues in browser bundles.
 */
export class BetterSqlite3Adapter implements CacheStorageAdapter {
  private readonly db: Database.Database
  private readonly fsModule: typeof fs
  private readonly pathModule: typeof path
  private readonly blobStoragePath: string
  private readonly largeMessageThresholdBytes: number

  private constructor(
    db: Database.Database,
    fsModule: typeof fs,
    pathModule: typeof path,
    blobStoragePath: string,
    largeMessageThresholdBytes: number,
  ) {
    this.db = db
    this.fsModule = fsModule
    this.pathModule = pathModule
    this.blobStoragePath = blobStoragePath
    this.largeMessageThresholdBytes = largeMessageThresholdBytes
  }

  /**
   * Factory method — dynamically imports better-sqlite3, fs, and path,
   * then opens the database at `storagePath/email-cache.db`.
   * Creates both the DB directory and a `blobs` subdirectory within `storagePath`.
   */
  static async create(
    storagePath: string,
    largeMessageThresholdBytes: number,
  ): Promise<BetterSqlite3Adapter> {
    const [Database, fsModule, pathModule] = await Promise.all([
      BetterSqlite3Adapter.loadBetterSqlite3(),
      import('fs'),
      import('path'),
    ])
    fsModule.mkdirSync(storagePath, { recursive: true })
    const dbPath = pathModule.join(storagePath, 'email-cache.db')
    const db = new Database(dbPath)
    const blobStoragePath = pathModule.join(storagePath, 'blobs')
    fsModule.mkdirSync(blobStoragePath, { recursive: true })
    return new BetterSqlite3Adapter(
      db,
      fsModule,
      pathModule,
      blobStoragePath,
      largeMessageThresholdBytes,
    )
  }

  private static async loadBetterSqlite3(): Promise<typeof Database> {
    try {
      const module = await import('better-sqlite3')
      return module.default ?? module
    } catch {
      throw new Error(
        'better-sqlite3 is required for Node.js usage but was not found. ' +
          'Install it with: npm install better-sqlite3',
      )
    }
  }

  // --- Schema (WITH fs_path column) ---

  async initialize(): Promise<void> {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${CacheTable.CACHE} (
        ${CacheColumn.MESSAGE_ID}        TEXT    NOT NULL PRIMARY KEY,
        ${CacheColumn.SUDO_ID}           TEXT,
        ${CacheColumn.EMAIL_ADDRESS_ID}  TEXT    NOT NULL,
        ${CacheColumn.CONTENT}           TEXT,
        ${CacheColumn.FS_PATH}           TEXT,
        ${CacheColumn.CONTENT_ENCODING}  TEXT,
        ${CacheColumn.SIZE_BYTES}        INTEGER NOT NULL,
        ${CacheColumn.LAST_ACCESSED_AT}  INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_last_accessed_at
        ON ${CacheTable.CACHE} (${CacheColumn.LAST_ACCESSED_AT} ASC);
      CREATE INDEX IF NOT EXISTS idx_sudo_id
        ON ${CacheTable.CACHE} (${CacheColumn.SUDO_ID});
      CREATE INDEX IF NOT EXISTS idx_email_address_id
        ON ${CacheTable.CACHE} (${CacheColumn.EMAIL_ADDRESS_ID});
      CREATE TABLE IF NOT EXISTS ${CacheTable.SETTINGS} (
        ${SettingsColumn.KEY}    TEXT NOT NULL PRIMARY KEY,
        ${SettingsColumn.VALUE}  TEXT NOT NULL
      );
    `)
  }

  // --- Domain operations (all SQL is internal) ---

  async getEntry(messageId: string): Promise<CacheEntry | undefined> {
    const row = this.db
      .prepare(
        `SELECT ${CacheColumn.MESSAGE_ID}, ${CacheColumn.SUDO_ID}, ${CacheColumn.EMAIL_ADDRESS_ID},
                ${CacheColumn.CONTENT}, ${CacheColumn.FS_PATH}, ${CacheColumn.CONTENT_ENCODING},
                ${CacheColumn.SIZE_BYTES}, ${CacheColumn.LAST_ACCESSED_AT}
         FROM ${CacheTable.CACHE} WHERE ${CacheColumn.MESSAGE_ID} = ?`,
      )
      .get(messageId) as any

    if (!row) return undefined

    let content: string
    if (row[CacheColumn.FS_PATH]) {
      // Read from filesystem
      try {
        content = this.fsModule.readFileSync(row[CacheColumn.FS_PATH], 'utf8')
      } catch {
        // Stale entry — file missing, clean up
        this.db
          .prepare(
            `DELETE FROM ${CacheTable.CACHE} WHERE ${CacheColumn.MESSAGE_ID} = ?`,
          )
          .run(messageId)
        return undefined
      }
    } else if (row[CacheColumn.CONTENT] !== null) {
      content = row[CacheColumn.CONTENT]
    } else {
      // Stale entry — no content and no fs_path
      this.db
        .prepare(
          `DELETE FROM ${CacheTable.CACHE} WHERE ${CacheColumn.MESSAGE_ID} = ?`,
        )
        .run(messageId)
      return undefined
    }

    // Update last-accessed timestamp
    this.db
      .prepare(
        `UPDATE ${CacheTable.CACHE} SET ${CacheColumn.LAST_ACCESSED_AT} = ? WHERE ${CacheColumn.MESSAGE_ID} = ?`,
      )
      .run(Date.now(), messageId)

    return {
      messageId: row[CacheColumn.MESSAGE_ID],
      sudoId: row[CacheColumn.SUDO_ID] ?? undefined,
      emailAddressId: row[CacheColumn.EMAIL_ADDRESS_ID],
      content,
      contentEncoding: row[CacheColumn.CONTENT_ENCODING] ?? undefined,
      sizeBytes: row[CacheColumn.SIZE_BYTES],
      lastAccessedAt: row[CacheColumn.LAST_ACCESSED_AT],
    }
  }

  async putEntry(entry: CacheEntryInput): Promise<void> {
    const now = Date.now()

    if (entry.sizeBytes > this.largeMessageThresholdBytes) {
      // Store on filesystem
      const filePath = this.pathModule.join(
        this.blobStoragePath,
        `${entry.messageId}.blob`,
      )
      this.fsModule.writeFileSync(filePath, entry.content, 'utf8')
      this.db
        .prepare(
          `INSERT OR REPLACE INTO ${CacheTable.CACHE}
         (${CacheColumn.MESSAGE_ID}, ${CacheColumn.SUDO_ID}, ${CacheColumn.EMAIL_ADDRESS_ID},
          ${CacheColumn.CONTENT}, ${CacheColumn.FS_PATH}, ${CacheColumn.CONTENT_ENCODING},
          ${CacheColumn.SIZE_BYTES}, ${CacheColumn.LAST_ACCESSED_AT})
         VALUES (?, ?, ?, NULL, ?, ?, ?, ?)`,
        )
        .run(
          entry.messageId,
          entry.sudoId ?? null,
          entry.emailAddressId,
          filePath,
          entry.contentEncoding ?? null,
          entry.sizeBytes,
          now,
        )
    } else {
      // Store inline
      this.db
        .prepare(
          `INSERT OR REPLACE INTO ${CacheTable.CACHE}
         (${CacheColumn.MESSAGE_ID}, ${CacheColumn.SUDO_ID}, ${CacheColumn.EMAIL_ADDRESS_ID},
          ${CacheColumn.CONTENT}, ${CacheColumn.FS_PATH}, ${CacheColumn.CONTENT_ENCODING},
          ${CacheColumn.SIZE_BYTES}, ${CacheColumn.LAST_ACCESSED_AT})
         VALUES (?, ?, ?, ?, NULL, ?, ?, ?)`,
        )
        .run(
          entry.messageId,
          entry.sudoId ?? null,
          entry.emailAddressId,
          entry.content,
          entry.contentEncoding ?? null,
          entry.sizeBytes,
          now,
        )
    }
  }

  async deleteEntry(messageId: string): Promise<void> {
    const row = this.db
      .prepare(
        `SELECT ${CacheColumn.FS_PATH} FROM ${CacheTable.CACHE} WHERE ${CacheColumn.MESSAGE_ID} = ?`,
      )
      .get(messageId) as any
    if (row?.[CacheColumn.FS_PATH]) {
      try {
        this.fsModule.unlinkSync(row[CacheColumn.FS_PATH])
      } catch {
        /* ignore */
      }
    }
    this.db
      .prepare(
        `DELETE FROM ${CacheTable.CACHE} WHERE ${CacheColumn.MESSAGE_ID} = ?`,
      )
      .run(messageId)
  }

  async flushBySudoId(sudoId: string): Promise<void> {
    this.deleteFilesForRows(
      this.db
        .prepare(
          `SELECT ${CacheColumn.FS_PATH} FROM ${CacheTable.CACHE} WHERE ${CacheColumn.SUDO_ID} = ?`,
        )
        .all(sudoId) as any[],
    )
    this.db
      .prepare(
        `DELETE FROM ${CacheTable.CACHE} WHERE ${CacheColumn.SUDO_ID} = ?`,
      )
      .run(sudoId)
  }

  async flushByEmailAddressId(emailAddressId: string): Promise<void> {
    this.deleteFilesForRows(
      this.db
        .prepare(
          `SELECT ${CacheColumn.FS_PATH} FROM ${CacheTable.CACHE} WHERE ${CacheColumn.EMAIL_ADDRESS_ID} = ?`,
        )
        .all(emailAddressId) as any[],
    )
    this.db
      .prepare(
        `DELETE FROM ${CacheTable.CACHE} WHERE ${CacheColumn.EMAIL_ADDRESS_ID} = ?`,
      )
      .run(emailAddressId)
  }

  async flushAll(): Promise<void> {
    // Delete all blob files
    try {
      const files = this.fsModule.readdirSync(this.blobStoragePath)
      for (const file of files) {
        this.fsModule.unlinkSync(
          this.pathModule.join(this.blobStoragePath, file),
        )
      }
    } catch {
      /* ignore */
    }
    this.db.prepare(`DELETE FROM ${CacheTable.CACHE}`).run()
  }

  async evictLRU(
    incomingBytes: number,
    cacheSizeLimitBytes: number,
  ): Promise<void> {
    this.db.exec('BEGIN')
    try {
      let currentTotal =
        (
          this.db
            .prepare(
              `SELECT COALESCE(SUM(${CacheColumn.SIZE_BYTES}), 0) AS total FROM ${CacheTable.CACHE}`,
            )
            .get() as any
        )?.total ?? 0

      while (currentTotal + incomingBytes > cacheSizeLimitBytes) {
        const victim = this.db
          .prepare(
            `SELECT ${CacheColumn.MESSAGE_ID}, ${CacheColumn.FS_PATH}, ${CacheColumn.SIZE_BYTES}
             FROM ${CacheTable.CACHE}
             ORDER BY ${CacheColumn.LAST_ACCESSED_AT} ASC LIMIT 1`,
          )
          .get() as any
        if (!victim) break
        if (victim[CacheColumn.FS_PATH]) {
          try {
            this.fsModule.unlinkSync(victim[CacheColumn.FS_PATH])
          } catch {
            /* ignore */
          }
        }
        this.db
          .prepare(
            `DELETE FROM ${CacheTable.CACHE} WHERE ${CacheColumn.MESSAGE_ID} = ?`,
          )
          .run(victim[CacheColumn.MESSAGE_ID])
        currentTotal -= victim[CacheColumn.SIZE_BYTES]
      }
      this.db.exec('COMMIT')
    } catch (err) {
      this.db.exec('ROLLBACK')
      throw err
    }
  }

  async getTotalSize(): Promise<number> {
    const row = this.db
      .prepare(
        `SELECT COALESCE(SUM(${CacheColumn.SIZE_BYTES}), 0) AS total FROM ${CacheTable.CACHE}`,
      )
      .get() as any
    return row?.total ?? 0
  }

  async getCacheSizeLimit(): Promise<number | undefined> {
    const row = this.db
      .prepare(
        `SELECT ${SettingsColumn.VALUE} FROM ${CacheTable.SETTINGS} WHERE ${SettingsColumn.KEY} = ?`,
      )
      .get(SettingsKey.CACHE_SIZE_LIMIT) as any
    return row ? parseInt(row[SettingsColumn.VALUE], 10) : undefined
  }

  async setCacheSizeLimit(bytes: number): Promise<void> {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO ${CacheTable.SETTINGS} (${SettingsColumn.KEY}, ${SettingsColumn.VALUE}) VALUES (?, ?)`,
      )
      .run(SettingsKey.CACHE_SIZE_LIMIT, String(bytes))
  }

  async close(): Promise<void> {
    this.db.close()
  }

  private deleteFilesForRows(
    rows: Array<{ [CacheColumn.FS_PATH]: string | null }>,
  ): void {
    for (const row of rows) {
      if (row[CacheColumn.FS_PATH]) {
        try {
          this.fsModule.unlinkSync(row[CacheColumn.FS_PATH])
        } catch {
          /* ignore */
        }
      }
    }
  }
}
