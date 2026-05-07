/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Result returned by a successful cache lookup.
 *
 * @interface CacheGetResult
 * @property {string} messageId Unique identifier of the email message.
 * @property {string} [sudoId] Identifier of the sudo that owns the email message, if available.
 * @property {string} emailAddressId Identifier of the email address associated with the email message.
 * @property {string} sealedBlob The sealed message blob as retrieved from S3, before unsealing.
 * @property {string} [contentEncoding] The S3 content-encoding header value, used to determine the decoding pipeline.
 */
export interface CacheGetResult {
  messageId: string
  sudoId?: string
  emailAddressId: string
  sealedBlob: string
  contentEncoding?: string
}

/**
 * Input for `EmailMessageBodyCache.put`.
 *
 * @interface CachePutInput
 * @property {string} messageId Unique identifier of the email message.
 * @property {string} [sudoId] Identifier of the sudo that owns the email message, if available.
 * @property {string} emailAddressId Identifier of the email address associated with the email message.
 * @property {string} sealedBlob The sealed message blob to cache.
 * @property {string} [contentEncoding] The S3 content-encoding header value, stored alongside the blob for decoding on cache hit.
 */
export interface CachePutInput {
  messageId: string
  sudoId?: string
  emailAddressId: string
  sealedBlob: string
  contentEncoding?: string
}

/**
 * Input for `EmailMessageBodyCache.flush`.
 * Exactly one of `sudoId` or `emailAddressId` must be provided.
 *
 * @interface CacheFlushInput
 * @property {string} [sudoId] Remove all cache entries belonging to this sudo ID.
 * @property {string} [emailAddressId] Remove all cache entries belonging to this email address ID.
 */
export interface CacheFlushInput {
  sudoId?: string
  emailAddressId?: string
}

/**
 * Local SQLite-backed cache for sealed email message bodies.
 *
 * The cache stores sealed blobs (before unsealing) keyed by message ID. It uses an
 * LRU eviction policy and enforces a configurable total-size limit. Blobs larger than
 * the size limit are never cached. Blobs larger than the large-message threshold are
 * stored on the device filesystem rather than inline in the SQLite database.
 *
 * All cache errors are logged and swallowed — a cache failure must never prevent
 * message retrieval.
 *
 * @interface EmailMessageBodyCache
 */
export interface EmailMessageBodyCache {
  /**
   * Retrieve a sealed blob from the cache.
   *
   * On a cache hit, updates the entry's last-accessed timestamp (resetting its LRU
   * position) and returns the blob.
   *
   * On a cache miss, returns `undefined`.
   *
   * If the entry exists in the database but its stored content is missing or
   * unreadable (stale entry), removes the entry and returns `undefined`.
   *
   * @param messageId Identifier of the message to retrieve.
   * @returns The cached sealed blob, or `undefined` on a miss or stale entry.
   */
  get(messageId: string): Promise<CacheGetResult | undefined>

  /**
   * Store a sealed blob in the cache.
   *
   * No-ops if:
   * - The cache size limit is 0 (caching disabled).
   * - The blob is larger than the configured cache size limit (oversized message).
   *
   * Evicts the least recently used entries as needed before inserting to ensure the
   * total cached size does not exceed the limit.
   *
   * Blobs larger than the large-message threshold are stored on the device filesystem;
   * smaller blobs are stored inline in the SQLite database.
   *
   * @param input The message metadata and sealed blob to store.
   */
  put(input: CachePutInput): Promise<void>

  /**
   * Remove a single cache entry by message ID.
   *
   * No-op if the entry does not exist.
   *
   * @param messageId Identifier of the message to remove.
   */
  deleteMessage(messageId: string): Promise<void>

  /**
   * Remove all cache entries matching the given scope.
   *
   * Exactly one of `sudoId` or `emailAddressId` must be provided; throws
   * `InvalidArgumentError` if neither is supplied.
   *
   * @param input Scope of the flush operation.
   */
  flush(input: CacheFlushInput): Promise<void>

  /**
   * Remove all entries from the cache, including any associated filesystem files.
   */
  flushAll(): Promise<void>

  /**
   * Update the maximum total size of the cache and persist the new value.
   *
   * If the new limit is lower than the current total cached size, immediately evicts
   * the least recently used entries until the total size is within the new limit.
   *
   * Setting `bytes` to 0 disables caching and evicts all existing entries.
   *
   * @param bytes New cache size limit in bytes. Must be >= 0.
   * @throws {InvalidArgumentError} If `bytes` is negative.
   */
  setCacheSizeLimit(bytes: number): Promise<void>

  /**
   * Returns the current total size of all cached blobs in bytes.
   */
  getTotalSize(): Promise<number>
}
