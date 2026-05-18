/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger } from '@sudoplatform/sudo-common'
import {
  EmailAddress,
  SendEmailMessageInput,
  SudoEmailClient,
} from '../../../src'
import crypto from 'crypto'
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import { setupEmailClient, teardown } from '../util/emailClientLifecycle'
import { provisionEmailAddress } from '../util/provisionEmailAddress'
import waitForExpect from 'wait-for-expect'
import {
  CacheFlushInput,
  CacheGetResult,
  CachePutInput,
  EmailMessageBodyCache,
} from '../../../src/private/domain/entities/message/emailMessageBodyCache'
import { DefaultEmailMessageBodyCache } from '../../../src/private/data/message/cache/defaultEmailMessageBodyCache'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import {
  EntitlementsBuilder,
  emailStorageMaxPerEmailAddressEntitlement,
  emailStorageMaxPerUserEntitlement,
} from '../util/entitlements'
import { constructSendMessageInput } from '../util/emailMessage'
import { SUCCESS_SIMULATOR_ADDRESS } from '../util/data'

/**
 * An instrumented wrapper around EmailMessageBodyCache that records
 * cache hits and misses for verification in integration tests.
 */
class InstrumentedEmailMessageBodyCache implements EmailMessageBodyCache {
  readonly hits: string[] = []
  readonly misses: string[] = []
  readonly puts: string[] = []
  readonly deletes: string[] = []
  readonly flushes: CacheFlushInput[] = []

  constructor(private readonly delegate: EmailMessageBodyCache) {}

  async get(messageId: string): Promise<CacheGetResult | undefined> {
    const result = await this.delegate.get(messageId)
    if (result) {
      this.hits.push(messageId)
    } else {
      this.misses.push(messageId)
    }
    return result
  }

  async put(input: CachePutInput): Promise<void> {
    this.puts.push(input.messageId)
    return this.delegate.put(input)
  }

  async deleteMessage(messageId: string): Promise<void> {
    this.deletes.push(messageId)
    return this.delegate.deleteMessage(messageId)
  }

  async flush(input: CacheFlushInput): Promise<void> {
    this.flushes.push(input)
    return this.delegate.flush(input)
  }

  async flushAll(): Promise<void> {
    return this.delegate.flushAll()
  }

  async setCacheSizeLimit(bytes: number): Promise<void> {
    return this.delegate.setCacheSizeLimit(bytes)
  }

  async getTotalSize(): Promise<number> {
    return this.delegate.getTotalSize()
  }

  reset(): void {
    this.hits.length = 0
    this.misses.length = 0
    this.puts.length = 0
    this.deletes.length = 0
    this.flushes.length = 0
  }
}

describe('Email Message Body Cache Integration Tests', () => {
  const log = new DefaultLogger(
    'EmailMessageBodyCacheIntegrationTests',
    'debug',
  )

  let emailAddresses: EmailAddress[] = []
  let instanceUnderTest: SudoEmailClient
  let profilesClient: SudoProfilesClient
  let userClient: SudoUserClient
  let sudo: Sudo
  let ownershipProofToken: string
  let instrumentedCache: InstrumentedEmailMessageBodyCache
  let tmpCacheDir: string

  let emailAddress: EmailAddress

  beforeAll(async () => {
    // Create a temp directory for the cache database
    tmpCacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'email-cache-integ-'))

    // Create the instrumented cache wrapping a real DefaultEmailMessageBodyCache
    const realCache = await DefaultEmailMessageBodyCache.create({
      cacheStoragePath: tmpCacheDir,
    })
    instrumentedCache = new InstrumentedEmailMessageBodyCache(realCache)

    // Set up the email client with an instrumented cache
    const result = await setupEmailClient(log, undefined, {
      emailMessageBodyCache: instrumentedCache,
    })
    profilesClient = result.profilesClient
    userClient = result.userClient
    sudo = result.sudo
    ownershipProofToken = result.ownershipProofToken
    instanceUnderTest = result.emailClient

    const entitlementsClient = result.entitlementsClient
    const entitlementsAdminClient = result.entitlementsAdminClient
    await new EntitlementsBuilder()
      .setEntitlementsAdminClient(entitlementsAdminClient)
      .setEntitlementsClient(entitlementsClient)
      .setEntitlement({
        name: emailStorageMaxPerEmailAddressEntitlement,
        description: 'Test Max Storage Per Email Address Entitlement',
        value: 5000000 * 5, // Set higher for these tests
      })
      .setEntitlement({
        name: emailStorageMaxPerUserEntitlement,
        description: 'Test Max Storage Per User Entitlement',
        value: 5000000 * 5,
      })
      .apply()

    emailAddress = await provisionEmailAddress(
      ownershipProofToken,
      instanceUnderTest,
    )
    emailAddresses.push(emailAddress)
  })

  afterAll(async () => {
    await teardown(
      { emailAddresses, sudos: [sudo] },
      { emailClient: instanceUnderTest, profilesClient, userClient },
    )
    emailAddresses = []
    // Clean up temp cache directory
    fs.rmSync(tmpCacheDir, { recursive: true, force: true })
  })

  beforeEach(() => {
    instrumentedCache.reset()
  })

  function generateSendInput(body: string): SendEmailMessageInput {
    return {
      senderEmailAddressId: emailAddress.id,
      emailMessageHeader: {
        from: { emailAddress: emailAddress.emailAddress },
        to: [{ emailAddress: 'success@simulator.amazonses.com' }],
        cc: [],
        bcc: [],
        replyTo: [],
        subject: 'Cache Integration Test',
      },
      body,
      attachments: [],
      inlineAttachments: [],
    }
  }

  async function waitForMessageAvailable(messageId: string): Promise<void> {
    await waitForExpect(
      async () => {
        const msg = await instanceUnderTest.getEmailMessage({ id: messageId })
        expect(msg).toBeDefined()
      },
      60000,
      10000,
    )
  }

  describe('cache hit and miss behaviour', () => {
    it('first fetch results in a cache miss and populates the cache', async () => {
      const sendResult = await instanceUnderTest.sendEmailMessage(
        generateSendInput('First fetch test'),
      )
      await waitForMessageAvailable(sendResult.id)

      // First fetch — should be a cache miss
      const result = await instanceUnderTest.getEmailMessageWithBody({
        id: sendResult.id,
        emailAddressId: emailAddress.id,
      })

      expect(result).toBeDefined()
      expect(result!.body).toContain('First fetch test')
      expect(instrumentedCache.misses).toContain(sendResult.id)
      expect(instrumentedCache.puts).toContain(sendResult.id)
      expect(instrumentedCache.hits).not.toContain(sendResult.id)
    })

    it('second fetch of the same message results in a cache hit', async () => {
      const sendResult = await instanceUnderTest.sendEmailMessage(
        generateSendInput('Second fetch test'),
      )
      await waitForMessageAvailable(sendResult.id)

      // First fetch — populates cache
      await instanceUnderTest.getEmailMessageWithBody({
        id: sendResult.id,
        emailAddressId: emailAddress.id,
      })

      instrumentedCache.reset()

      // Second fetch — should be a cache hit
      const result = await instanceUnderTest.getEmailMessageWithBody({
        id: sendResult.id,
        emailAddressId: emailAddress.id,
      })

      expect(result).toBeDefined()
      expect(result!.body).toContain('Second fetch test')
      expect(instrumentedCache.hits).toContain(sendResult.id)
      expect(instrumentedCache.misses).not.toContain(sendResult.id)
    })

    it('cached content is identical to fresh S3 content', async () => {
      const body = 'Content integrity test — special chars: é à ü ñ 中文'
      const sendResult = await instanceUnderTest.sendEmailMessage(
        generateSendInput(body),
      )
      await waitForMessageAvailable(sendResult.id)

      // First fetch from S3
      const firstResult = await instanceUnderTest.getEmailMessageWithBody({
        id: sendResult.id,
        emailAddressId: emailAddress.id,
      })

      // Second fetch from cache
      const secondResult = await instanceUnderTest.getEmailMessageWithBody({
        id: sendResult.id,
        emailAddressId: emailAddress.id,
      })

      expect(firstResult).toStrictEqual(secondResult)
    })
  })

  describe('cache invalidation', () => {
    it('deleting a message removes it from the cache', async () => {
      const sendResult = await instanceUnderTest.sendEmailMessage(
        generateSendInput('Delete test'),
      )
      await waitForMessageAvailable(sendResult.id)

      // Populate cache
      await instanceUnderTest.getEmailMessageWithBody({
        id: sendResult.id,
        emailAddressId: emailAddress.id,
      })
      expect(instrumentedCache.puts).toContain(sendResult.id)

      instrumentedCache.reset()

      // Delete the message
      await instanceUnderTest.deleteEmailMessage(sendResult.id)

      // Verify cache delete was called
      expect(instrumentedCache.deletes).toContain(sendResult.id)

      // Verify the message is no longer retrievable
      const result = await instanceUnderTest.getEmailMessageWithBody({
        id: sendResult.id,
        emailAddressId: emailAddress.id,
      })
      expect(result).toBeUndefined()
    })

    it('flushing by email address clears all cached entries for that address', async () => {
      // Send and cache two messages
      const send1 = await instanceUnderTest.sendEmailMessage(
        generateSendInput('Flush test 1'),
      )
      const send2 = await instanceUnderTest.sendEmailMessage(
        generateSendInput('Flush test 2'),
      )
      await waitForMessageAvailable(send1.id)
      await waitForMessageAvailable(send2.id)

      await instanceUnderTest.getEmailMessageWithBody({
        id: send1.id,
        emailAddressId: emailAddress.id,
      })
      await instanceUnderTest.getEmailMessageWithBody({
        id: send2.id,
        emailAddressId: emailAddress.id,
      })

      // Verify both are cached
      expect(await instrumentedCache.getTotalSize()).toBeGreaterThan(0)

      instrumentedCache.reset()

      // Flush by email address
      await instanceUnderTest.flushMessageBodyCache({
        emailAddressId: emailAddress.id,
      })

      expect(instrumentedCache.flushes).toContainEqual({
        emailAddressId: emailAddress.id,
      })

      // Verify cache is empty for this address
      expect(await instrumentedCache.getTotalSize()).toBe(0)

      // Re-fetching should result in cache misses
      await instanceUnderTest.getEmailMessageWithBody({
        id: send1.id,
        emailAddressId: emailAddress.id,
      })
      expect(instrumentedCache.misses).toContain(send1.id)
    })
  })

  describe('cache size management', () => {
    it('setCacheSizeLimit persists and takes effect', async () => {
      const sendResult = await instanceUnderTest.sendEmailMessage(
        generateSendInput('Size limit test'),
      )
      await waitForMessageAvailable(sendResult.id)

      // Populate cache
      await instanceUnderTest.getEmailMessageWithBody({
        id: sendResult.id,
        emailAddressId: emailAddress.id,
      })
      expect(await instrumentedCache.getTotalSize()).toBeGreaterThan(0)

      // Set cache size to 0 — should flush everything
      await instanceUnderTest.setCacheSizeLimit(0)
      expect(await instrumentedCache.getTotalSize()).toBe(0)

      instrumentedCache.reset()

      // Fetching should still work (from S3) but not populate cache
      const result = await instanceUnderTest.getEmailMessageWithBody({
        id: sendResult.id,
        emailAddressId: emailAddress.id,
      })
      expect(result).toBeDefined()
      // With cache size 0, get returns undefined (miss) and put is a no-op
      expect(instrumentedCache.misses).toContain(sendResult.id)
      expect(instrumentedCache.puts).toContain(sendResult.id) // put is called but is a no-op internally

      // Restore cache size for other tests
      await instanceUnderTest.setCacheSizeLimit(300 * 1024 * 1024)
    })
  })

  describe('large message handling', () => {
    it('caches a message larger than 1MB on the filesystem (not inline in SQLite)', async () => {
      // Generate a body larger than 1MB to trigger filesystem storage
      const randomBytes = crypto.randomBytes(1.2 * 1024 * 1024)
      const largeBody = randomBytes.toString('base64')
      const sendInput = constructSendMessageInput({
        senderEmailAddressId: emailAddress.id,
        from: { emailAddress: emailAddress.emailAddress },
        to: [{ emailAddress: SUCCESS_SIMULATOR_ADDRESS }],
        body: largeBody,
      })
      const sendResult = await instanceUnderTest.sendEmailMessage(sendInput)
      await waitForMessageAvailable(sendResult.id)

      // First fetch — cache miss, should store on filesystem
      const result = await instanceUnderTest.getEmailMessageWithBody({
        id: sendResult.id,
        emailAddressId: emailAddress.id,
      })

      expect(result).toBeDefined()
      expect(result!.body).toContain(largeBody) // Verify content is correct
      expect(instrumentedCache.misses).toContain(sendResult.id)
      expect(instrumentedCache.puts).toContain(sendResult.id)

      // Verify the blob file exists on the filesystem
      const blobPath = path.join(tmpCacheDir, 'blobs', `${sendResult.id}.blob`)
      expect(fs.existsSync(blobPath)).toBe(true)

      instrumentedCache.reset()

      // Second fetch — should be a cache hit from filesystem
      const secondResult = await instanceUnderTest.getEmailMessageWithBody({
        id: sendResult.id,
        emailAddressId: emailAddress.id,
      })

      expect(secondResult).toBeDefined()
      expect(secondResult).toStrictEqual(result)
      expect(instrumentedCache.hits).toContain(sendResult.id)
      expect(instrumentedCache.misses).not.toContain(sendResult.id)
    })

    it('does not cache a message larger than the cache size limit', async () => {
      // Set cache size to 2MB so we can send a message that exceeds it
      await instanceUnderTest.setCacheSizeLimit(2 * 1024 * 1024)

      // Generate a body larger than 2MB
      const randomBytes = crypto.randomBytes(2.5 * 1024 * 1024)
      const oversizedBody = randomBytes.toString('base64')
      const sendResult = await instanceUnderTest.sendEmailMessage(
        generateSendInput(oversizedBody),
      )
      await waitForMessageAvailable(sendResult.id)

      const sizeBefore = await instrumentedCache.getTotalSize()

      // Fetch — should be a cache miss and NOT populate the cache (oversized)
      const result = await instanceUnderTest.getEmailMessageWithBody({
        id: sendResult.id,
        emailAddressId: emailAddress.id,
      })

      expect(result).toBeDefined()
      expect(result!.body).toContain(oversizedBody)
      expect(instrumentedCache.misses).toContain(sendResult.id)
      expect(instrumentedCache.puts).toContain(sendResult.id) // put is called but is a no-op for oversized

      // Cache size should not have increased
      const sizeAfter = await instrumentedCache.getTotalSize()
      expect(sizeAfter).toBe(sizeBefore)

      // No blob file should exist for this message
      const blobPath = path.join(tmpCacheDir, 'blobs', `${sendResult.id}.blob`)
      expect(fs.existsSync(blobPath)).toBe(false)

      instrumentedCache.reset()

      // Second fetch — should still be a cache miss (never cached)
      await instanceUnderTest.getEmailMessageWithBody({
        id: sendResult.id,
        emailAddressId: emailAddress.id,
      })
      expect(instrumentedCache.misses).toContain(sendResult.id)
      expect(instrumentedCache.hits).not.toContain(sendResult.id)

      // Restore cache size for other tests
      await instanceUnderTest.setCacheSizeLimit(300 * 1024 * 1024)
    })
  })
})
