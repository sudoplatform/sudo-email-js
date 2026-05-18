/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Database as SqlJsDatabase, InitSqlJsStatic } from 'sql.js'
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
 * CacheStorageAdapter implementation backed by sql.js (WebAssembly).
 * Designed for browser environments where native addons are unavailable.
 *
 * Key characteristics:
 * - Always stores content inline (no filesystem, no fs_path column)
 * - Persists the in-memory database to IndexedDB after each write operation
 * - On IndexedDB failure, continues as in-memory-only cache
 */
export class SqlJsAdapter implements CacheStorageAdapter {
  static readonly INDEXEDDB_DB_NAME = 'sudo-email-cache'
  static readonly INDEXEDDB_STORE_NAME = 'databases'
  static readonly INDEXEDDB_KEY = 'email-cache-db'

  private db: SqlJsDatabase
  private persistenceDisabled = false

  private constructor(db: SqlJsDatabase) {
    this.db = db
  }

  /**
   * Factory method — loads sql.js via dynamic import, optionally
   * restoring a previously persisted database from IndexedDB.
   */
  static async create(): Promise<SqlJsAdapter> {
    const initSqlJs = await SqlJsAdapter.loadSqlJs()
    const SQL = await initSqlJs()

    // Attempt to restore from IndexedDB
    const existingData = await SqlJsAdapter.loadFromIndexedDB()
    const db = existingData
      ? new SQL.Database(existingData)
      : new SQL.Database()

    return new SqlJsAdapter(db)
  }

  private static async loadSqlJs(): Promise<InitSqlJsStatic> {
    try {
      const module = await import('sql.js')
      return module.default ?? module
    } catch {
      throw new Error(
        'sql.js is required for browser usage but was not found. ' +
          'Install it with: npm install sql.js',
      )
    }
  }

  // --- Schema (NO fs_path column — always inline) ---

  async initialize(): Promise<void> {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS ${CacheTable.CACHE} (
        ${CacheColumn.MESSAGE_ID}        TEXT    NOT NULL PRIMARY KEY,
        ${CacheColumn.SUDO_ID}           TEXT,
        ${CacheColumn.EMAIL_ADDRESS_ID}  TEXT    NOT NULL,
        ${CacheColumn.CONTENT}           TEXT    NOT NULL,
        ${CacheColumn.CONTENT_ENCODING}  TEXT,
        ${CacheColumn.SIZE_BYTES}        INTEGER NOT NULL,
        ${CacheColumn.LAST_ACCESSED_AT}  INTEGER NOT NULL
      )
    `)
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_last_accessed_at
        ON ${CacheTable.CACHE} (${CacheColumn.LAST_ACCESSED_AT} ASC)
    `)
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_sudo_id
        ON ${CacheTable.CACHE} (${CacheColumn.SUDO_ID})
    `)
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_email_address_id
        ON ${CacheTable.CACHE} (${CacheColumn.EMAIL_ADDRESS_ID})
    `)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS ${CacheTable.SETTINGS} (
        ${SettingsColumn.KEY}    TEXT NOT NULL PRIMARY KEY,
        ${SettingsColumn.VALUE}  TEXT NOT NULL
      )
    `)
    await this.persist()
  }

  // --- Domain operations (all SQL is internal) ---

  async getEntry(messageId: string): Promise<CacheEntry | undefined> {
    const stmt = this.db.prepare(
      `SELECT ${CacheColumn.MESSAGE_ID}, ${CacheColumn.SUDO_ID}, ${CacheColumn.EMAIL_ADDRESS_ID},
              ${CacheColumn.CONTENT}, ${CacheColumn.CONTENT_ENCODING},
              ${CacheColumn.SIZE_BYTES}, ${CacheColumn.LAST_ACCESSED_AT}
       FROM ${CacheTable.CACHE} WHERE ${CacheColumn.MESSAGE_ID} = ?`,
    )
    stmt.bind([messageId])
    if (!stmt.step()) {
      stmt.free()
      return undefined
    }
    const row = stmt.getAsObject() as any
    stmt.free()

    // Update last-accessed timestamp
    this.db.run(
      `UPDATE ${CacheTable.CACHE} SET ${CacheColumn.LAST_ACCESSED_AT} = ? WHERE ${CacheColumn.MESSAGE_ID} = ?`,
      [Date.now(), messageId],
    )
    await this.persist()

    return {
      messageId: row[CacheColumn.MESSAGE_ID],
      sudoId: row[CacheColumn.SUDO_ID] ?? undefined,
      emailAddressId: row[CacheColumn.EMAIL_ADDRESS_ID],
      content: row[CacheColumn.CONTENT],
      contentEncoding: row[CacheColumn.CONTENT_ENCODING] ?? undefined,
      sizeBytes: row[CacheColumn.SIZE_BYTES],
      lastAccessedAt: row[CacheColumn.LAST_ACCESSED_AT],
    }
  }

  async putEntry(entry: CacheEntryInput): Promise<void> {
    const now = Date.now()
    this.db.run(
      `INSERT OR REPLACE INTO ${CacheTable.CACHE}
       (${CacheColumn.MESSAGE_ID}, ${CacheColumn.SUDO_ID}, ${CacheColumn.EMAIL_ADDRESS_ID},
        ${CacheColumn.CONTENT}, ${CacheColumn.CONTENT_ENCODING},
        ${CacheColumn.SIZE_BYTES}, ${CacheColumn.LAST_ACCESSED_AT})
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.messageId,
        entry.sudoId ?? null,
        entry.emailAddressId,
        entry.content,
        entry.contentEncoding ?? null,
        entry.sizeBytes,
        now,
      ],
    )
    await this.persist()
  }

  async deleteEntry(messageId: string): Promise<void> {
    this.db.run(
      `DELETE FROM ${CacheTable.CACHE} WHERE ${CacheColumn.MESSAGE_ID} = ?`,
      [messageId],
    )
    await this.persist()
  }

  async flushBySudoId(sudoId: string): Promise<void> {
    this.db.run(
      `DELETE FROM ${CacheTable.CACHE} WHERE ${CacheColumn.SUDO_ID} = ?`,
      [sudoId],
    )
    await this.persist()
  }

  async flushByEmailAddressId(emailAddressId: string): Promise<void> {
    this.db.run(
      `DELETE FROM ${CacheTable.CACHE} WHERE ${CacheColumn.EMAIL_ADDRESS_ID} = ?`,
      [emailAddressId],
    )
    await this.persist()
  }

  async flushAll(): Promise<void> {
    this.db.run(`DELETE FROM ${CacheTable.CACHE}`)
    await this.persist()
  }

  async evictLRU(
    incomingBytes: number,
    cacheSizeLimitBytes: number,
  ): Promise<void> {
    this.db.run('BEGIN')
    try {
      const totalStmt = this.db.prepare(
        `SELECT COALESCE(SUM(${CacheColumn.SIZE_BYTES}), 0) AS total FROM ${CacheTable.CACHE}`,
      )
      totalStmt.step()
      let currentTotal = (totalStmt.getAsObject() as any).total ?? 0
      totalStmt.free()

      while (currentTotal + incomingBytes > cacheSizeLimitBytes) {
        const victimStmt = this.db.prepare(
          `SELECT ${CacheColumn.MESSAGE_ID}, ${CacheColumn.SIZE_BYTES}
           FROM ${CacheTable.CACHE}
           ORDER BY ${CacheColumn.LAST_ACCESSED_AT} ASC LIMIT 1`,
        )
        if (!victimStmt.step()) {
          victimStmt.free()
          break
        }
        const victim = victimStmt.getAsObject() as any
        victimStmt.free()

        this.db.run(
          `DELETE FROM ${CacheTable.CACHE} WHERE ${CacheColumn.MESSAGE_ID} = ?`,
          [victim[CacheColumn.MESSAGE_ID]],
        )
        currentTotal -= victim[CacheColumn.SIZE_BYTES]
      }
      this.db.run('COMMIT')
      await this.persist()
    } catch (err) {
      this.db.run('ROLLBACK')
      throw err
    }
  }

  async getTotalSize(): Promise<number> {
    const stmt = this.db.prepare(
      `SELECT COALESCE(SUM(${CacheColumn.SIZE_BYTES}), 0) AS total FROM ${CacheTable.CACHE}`,
    )
    stmt.step()
    const row = stmt.getAsObject() as any
    stmt.free()
    return row?.total ?? 0
  }

  async getCacheSizeLimit(): Promise<number | undefined> {
    const stmt = this.db.prepare(
      `SELECT ${SettingsColumn.VALUE} FROM ${CacheTable.SETTINGS} WHERE ${SettingsColumn.KEY} = ?`,
    )
    stmt.bind([SettingsKey.CACHE_SIZE_LIMIT])
    if (!stmt.step()) {
      stmt.free()
      return undefined
    }
    const row = stmt.getAsObject() as any
    stmt.free()
    return parseInt(row[SettingsColumn.VALUE], 10)
  }

  async setCacheSizeLimit(bytes: number): Promise<void> {
    this.db.run(
      `INSERT OR REPLACE INTO ${CacheTable.SETTINGS} (${SettingsColumn.KEY}, ${SettingsColumn.VALUE}) VALUES (?, ?)`,
      [SettingsKey.CACHE_SIZE_LIMIT, String(bytes)],
    )
    await this.persist()
  }

  async close(): Promise<void> {
    await this.persist()
    this.db.close()
  }

  // --- IndexedDB persistence (internal) ---

  /**
   * Persist the current database state to IndexedDB.
   * On failure, disables further persistence attempts and continues in-memory.
   */
  private async persist(): Promise<void> {
    if (this.persistenceDisabled) return
    try {
      const data = this.db.export()
      await SqlJsAdapter.saveToIndexedDB(data)
    } catch {
      this.persistenceDisabled = true
    }
  }

  static async loadFromIndexedDB(): Promise<Uint8Array | null> {
    return new Promise((resolve) => {
      try {
        const request = indexedDB.open(SqlJsAdapter.INDEXEDDB_DB_NAME, 1)

        request.onupgradeneeded = () => {
          const db = request.result
          if (
            !db.objectStoreNames.contains(SqlJsAdapter.INDEXEDDB_STORE_NAME)
          ) {
            db.createObjectStore(SqlJsAdapter.INDEXEDDB_STORE_NAME)
          }
        }

        request.onerror = () => {
          resolve(null)
        }

        request.onsuccess = () => {
          try {
            const db = request.result
            const tx = db.transaction(
              SqlJsAdapter.INDEXEDDB_STORE_NAME,
              'readonly',
            )
            const store = tx.objectStore(SqlJsAdapter.INDEXEDDB_STORE_NAME)
            const getRequest = store.get(SqlJsAdapter.INDEXEDDB_KEY)

            getRequest.onsuccess = () => {
              db.close()
              const result = getRequest.result
              if (result instanceof Uint8Array) {
                resolve(result)
              } else {
                resolve(null)
              }
            }

            getRequest.onerror = () => {
              db.close()
              resolve(null)
            }
          } catch {
            resolve(null)
          }
        }
      } catch {
        resolve(null)
      }
    })
  }

  static async saveToIndexedDB(data: Uint8Array): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(SqlJsAdapter.INDEXEDDB_DB_NAME, 1)

      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(SqlJsAdapter.INDEXEDDB_STORE_NAME)) {
          db.createObjectStore(SqlJsAdapter.INDEXEDDB_STORE_NAME)
        }
      }

      request.onerror = () => {
        reject(request.error)
      }

      request.onsuccess = () => {
        const db = request.result
        const tx = db.transaction(
          SqlJsAdapter.INDEXEDDB_STORE_NAME,
          'readwrite',
        )
        const store = tx.objectStore(SqlJsAdapter.INDEXEDDB_STORE_NAME)
        const putRequest = store.put(data, SqlJsAdapter.INDEXEDDB_KEY)

        putRequest.onsuccess = () => {
          db.close()
          resolve()
        }

        putRequest.onerror = () => {
          db.close()
          reject(putRequest.error)
        }
      }
    })
  }
}
