/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { ParsedMail, simpleParser } from 'mailparser'

import { Logger } from '@sudoplatform/sudo-common'
import { delay } from '../../util/delay'
import { S3Client } from '../../../src/private/data/common/s3Client'
import { internal } from '@sudoplatform/sudo-user'

/**
 * Test account that reads sent emails from the S3 mail transporter bucket
 * instead of polling an external IMAP mailbox. Objects are stored under
 * `{identityId}/{emailMessageId}.eml` and the bucket is a UserReadOnlyBucket,
 * so the caller must use Cognito-authenticated S3 credentials.
 */
export class S3TestAccount {
  private readonly region: string
  constructor(
    private readonly s3: S3Client,
    private readonly bucket: string,
    private readonly identityId: string,
    private readonly log: Logger,
  ) {
    this.region = internal.getIdentityServiceConfig().identityService.region
  }

  /**
   * Polls the S3 bucket for an email, optionally
   * matching a sender and/or subject. Returns the parsed email when found.
   */
  async waitForEmail(
    sender?: string,
    subject?: string,
    options?: {
      timeoutMs?: number
      searchFromDate?: Date
      pollIntervalMs?: number
    },
  ): Promise<ParsedMail> {
    const timeoutMs = options?.timeoutMs ?? 40000
    const pollIntervalMs = options?.pollIntervalMs ?? 2000
    const deadline = Date.now() + timeoutMs
    const checkedKeys = new Set<string>()

    while (Date.now() < deadline) {
      const listed = await this.s3.list({
        bucket: this.bucket,
        prefix: `${this.identityId}/`,
        region: this.region,
        limit: 100,
      })

      for (const obj of listed.results ?? []) {
        if (!obj.key || checkedKeys.has(obj.key)) continue
        checkedKeys.add(obj.key)

        // Skip objects older than searchFromDate if specified
        if (options?.searchFromDate && obj.lastModified) {
          if (obj.lastModified < options.searchFromDate) continue
        }

        const response = await this.s3.download({
          bucket: this.bucket,
          key: obj.key,
          region: this.region,
        })

        const body = response.body
        if (!body) continue

        const parsed = await simpleParser(body)

        // Match sender against the RFC822 From header (which may be rewritten
        // by the mask pipeline) or the S3 metadata sender field
        const fromAddresses =
          parsed.from?.value.map((a) => a.address?.toLowerCase()) ?? []
        const metaSender = response.metadata?.sender?.toLowerCase()
        const senderLower = sender?.toLowerCase()
        if (
          senderLower !== undefined &&
          !fromAddresses.includes(senderLower) &&
          metaSender !== senderLower
        ) {
          continue
        }

        if (!subject || parsed.subject === subject) {
          this.log.debug('Found matching email in S3', {
            key: obj.key,
            sender,
            subject: parsed.subject,
          })
          return parsed
        }
      }

      await delay(pollIntervalMs)
    }

    throw new Error(
      `Timeout waiting for email from ${sender}${subject ? ` with subject "${subject}"` : ''} in S3 bucket ${this.bucket}`,
    )
  }
}
