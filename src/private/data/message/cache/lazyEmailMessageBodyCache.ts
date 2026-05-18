/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CacheFlushInput,
  CacheGetResult,
  CachePutInput,
  EmailMessageBodyCache,
} from '../../../domain/entities/message/emailMessageBodyCache'
import {
  DefaultEmailMessageBodyCache,
  DefaultEmailMessageBodyCacheOptions,
} from './defaultEmailMessageBodyCache'

/**
 * A lazy-initializing wrapper around `DefaultEmailMessageBodyCache` that
 * implements `EmailMessageBodyCache`. This allows the cache to be created
 * asynchronously via `DefaultEmailMessageBodyCache.create()` while still
 * being usable in synchronous constructors.
 *
 * The wrapper starts the async initialization eagerly and awaits the result
 * before delegating each operation. All cache operations are already async,
 * so this adds no API change.
 *
 * @internal
 */
export class LazyEmailMessageBodyCache implements EmailMessageBodyCache {
  private readonly cachePromise: Promise<DefaultEmailMessageBodyCache>

  constructor(options: DefaultEmailMessageBodyCacheOptions = {}) {
    this.cachePromise = DefaultEmailMessageBodyCache.create(options)
  }

  async get(messageId: string): Promise<CacheGetResult | undefined> {
    const cache = await this.cachePromise
    return cache.get(messageId)
  }

  async put(input: CachePutInput): Promise<void> {
    const cache = await this.cachePromise
    return cache.put(input)
  }

  async deleteMessage(messageId: string): Promise<void> {
    const cache = await this.cachePromise
    return cache.deleteMessage(messageId)
  }

  async flush(input: CacheFlushInput): Promise<void> {
    const cache = await this.cachePromise
    return cache.flush(input)
  }

  async flushAll(): Promise<void> {
    const cache = await this.cachePromise
    return cache.flushAll()
  }

  async setCacheSizeLimit(bytes: number): Promise<void> {
    const cache = await this.cachePromise
    return cache.setCacheSizeLimit(bytes)
  }

  async getTotalSize(): Promise<number> {
    const cache = await this.cachePromise
    return cache.getTotalSize()
  }
}
