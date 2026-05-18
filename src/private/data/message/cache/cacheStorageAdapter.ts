/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

// ---------------------------------------------------------------------------
// Shared table and column name constants for SQL statements
// ---------------------------------------------------------------------------

/** Table names used by the cache storage adapters. */
export enum CacheTable {
  CACHE = 'email_message_body_cache',
  SETTINGS = 'email_message_cache_settings',
}

/** Column names for the cache entries table. */
export enum CacheColumn {
  MESSAGE_ID = 'message_id',
  SUDO_ID = 'sudo_id',
  EMAIL_ADDRESS_ID = 'email_address_id',
  CONTENT = 'content',
  FS_PATH = 'fs_path',
  CONTENT_ENCODING = 'content_encoding',
  SIZE_BYTES = 'size_bytes',
  LAST_ACCESSED_AT = 'last_accessed_at',
}

/** Column names for the settings table. */
export enum SettingsColumn {
  KEY = 'key',
  VALUE = 'value',
}

/** Well-known settings keys. */
export enum SettingsKey {
  CACHE_SIZE_LIMIT = 'cache_size_limit_bytes',
}

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

/**
 * A cache entry as returned by the adapter.
 */
export interface CacheEntry {
  messageId: string
  sudoId?: string
  emailAddressId: string
  content: string
  contentEncoding?: string
  sizeBytes: number
  lastAccessedAt: number
}

/**
 * Input for storing a cache entry via the adapter.
 */
export interface CacheEntryInput {
  messageId: string
  sudoId?: string
  emailAddressId: string
  content: string
  contentEncoding?: string
  sizeBytes: number
}

/**
 * Domain-aware storage adapter for the email message body cache.
 * Each implementation owns its schema, SQL, and storage strategy.
 */
export interface CacheStorageAdapter {
  /**
   * Create schema tables/indexes and load persisted settings.
   * Called once after construction.
   */
  initialize(): Promise<void>

  /**
   * Retrieve a cached entry by message ID.
   * Updates the entry's last-accessed timestamp on hit.
   * Returns undefined on miss or if the entry is stale/unreadable.
   */
  getEntry(messageId: string): Promise<CacheEntry | undefined>

  /**
   * Store a cache entry. The adapter decides internally whether to
   * store inline or on the filesystem based on its own strategy.
   */
  putEntry(entry: CacheEntryInput): Promise<void>

  /**
   * Remove a single cache entry by message ID.
   * No-op if the entry does not exist.
   */
  deleteEntry(messageId: string): Promise<void>

  /**
   * Remove all cache entries belonging to the given sudo ID.
   */
  flushBySudoId(sudoId: string): Promise<void>

  /**
   * Remove all cache entries belonging to the given email address ID.
   */
  flushByEmailAddressId(emailAddressId: string): Promise<void>

  /**
   * Remove all cache entries and associated storage (filesystem files, etc.).
   */
  flushAll(): Promise<void>

  /**
   * Evict least-recently-used entries until there is room for
   * `incomingBytes` within `cacheSizeLimitBytes`.
   */
  evictLRU(incomingBytes: number, cacheSizeLimitBytes: number): Promise<void>

  /**
   * Return the sum of all entry sizes in bytes.
   */
  getTotalSize(): Promise<number>

  /**
   * Read the persisted cache size limit from the settings table.
   * Returns undefined if no limit has been persisted yet.
   */
  getCacheSizeLimit(): Promise<number | undefined>

  /**
   * Persist a new cache size limit to the settings table.
   */
  setCacheSizeLimit(bytes: number): Promise<void>

  /**
   * Release the database connection and any associated resources.
   */
  close(): Promise<void>
}
