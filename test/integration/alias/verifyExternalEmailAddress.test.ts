/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger, ServiceError } from '@sudoplatform/sudo-common'
import {
  EmailAlias,
  EmailAliasNotFoundError,
  SudoEmailClient,
} from '../../../src'
import {
  getEmailAliasDomains,
  getTestSentEmailBucket,
  setupEmailClient,
} from '../util/emailClientLifecycle'
import { ExternalTestAccount } from '../util/externalTestAccount'
import { delay } from '../../util/delay'
import { extractOtp } from '../util/emailMessage'
import { generateSafeLocalPart } from '../util/provisionEmailAddress'
import { DateTime } from 'luxon'
import { v4 } from 'uuid'
import { ParsedMail } from 'mailparser'
import { S3TestAccount } from '../util/s3TestAccount'

describe('SudoEmailClient VerifyExternalEmailAddress Test Suite', () => {
  const log = new DefaultLogger('SudoEmailClientIntegrationTests')

  let emailTestAccount: ExternalTestAccount
  let emailAliases: EmailAlias[] = []

  let instanceUnderTest: SudoEmailClient
  let ownershipProofToken: string
  let aliasDomain: string
  let runTests = true
  const testSentEmailBucket = getTestSentEmailBucket()
  let externalAddress: string = ''
  let s3TestAccount: S3TestAccount

  beforeEach(async ({ skip }) => {
    const result = await setupEmailClient(log)
    instanceUnderTest = result.emailClient
    const config = await instanceUnderTest.getConfigurationData()
    runTests = config.emailAliasesEnabled && config.externalEmailAliasesEnabled
    if (!runTests) {
      skip('External email aliases not enabled; skipping')
    }
    ownershipProofToken = result.ownershipProofToken

    if (testSentEmailBucket) {
      s3TestAccount = new S3TestAccount(
        result.s3Client,
        testSentEmailBucket,
        result.identityId,
        log,
      )
      externalAddress = `${v4()}@sudoplatform.com`
    } else {
      emailTestAccount = new ExternalTestAccount(log)
      externalAddress = emailTestAccount.getEmailAddress()
    }

    aliasDomain = (await getEmailAliasDomains(result.emailClient))[0]
  })

  afterEach(async () => {
    await Promise.all(
      emailAliases.map(async (alias) => {
        try {
          await instanceUnderTest.deprovisionEmailAlias({
            emailAliasId: alias.id,
          })
        } catch (err) {
          console.log(`Error deprovisioning email alias ${alias.id}: ${err}`)
        }
      }),
    )
    emailAliases = []
  })

  it('can verify successfully', { timeout: 320000 }, async ({ skip }) => {
    const date = new Date()
    date.setMinutes(date.getMinutes() - 1)

    const aliasAddress = `${generateSafeLocalPart()}@${aliasDomain}`
    const metadata = { purpose: 'testing', environment: 'integration' }
    const expiresAt = DateTime.now().plus({ days: 1 }).toJSDate()

    const emailAlias = await instanceUnderTest.provisionEmailAlias({
      aliasAddress,
      realAddress: externalAddress,
      ownershipProofToken,
      metadata,
      expiresAt,
    })
    emailAliases.push(emailAlias)

    try {
      await instanceUnderTest.verifyExternalEmailAddress({
        emailAddress: externalAddress,
        emailAliasId: emailAlias.id,
      })
    } catch (err) {
      if (
        err instanceof ServiceError &&
        err.message.includes('Daily message quota exceeded')
      ) {
        skip('*** Daily message quota exceeded ***')
        return
      }
      throw err
    }

    // Wait for verification code email to be sent
    await delay(20000)

    const emailsToCheck: ParsedMail[] = []
    if (testSentEmailBucket) {
      const verificationEmail = await s3TestAccount.waitForEmail(
        undefined,
        'Verify your email address',
        { searchFromDate: date, timeoutMs: 10000 },
      )
      expect(verificationEmail).toBeDefined()
      emailsToCheck.push(verificationEmail)
    } else {
      // Get all matching verification emails (for concurrent test support)
      const verificationEmails =
        await emailTestAccount.waitForAllEmailsBySubject(
          'Verify your email address',
          { searchFromDate: date, timeoutMs: 10000 },
        )

      expect(verificationEmails.length).toBeGreaterThan(0)
      emailsToCheck.push(...verificationEmails)
    }

    // Try each verification code until one succeeds
    let verificationResult
    for (const email of emailsToCheck) {
      const code = extractOtp(email.html)
      if (!code) {
        log.debug('Could not extract OTP from email')
        continue
      }

      const result = await instanceUnderTest.verifyExternalEmailAddress({
        emailAddress: externalAddress,
        emailAliasId: emailAlias.id,
        verificationCode: code,
      })

      if (result?.isVerified) {
        verificationResult = result
        break
      }
    }

    expect(verificationResult).toBeDefined()
    expect(verificationResult?.isVerified).toBeTruthy()
    expect(verificationResult?.reason).toBeUndefined()
  })

  it('fails to verify when verification code does not match', async ({
    skip,
  }) => {
    const date = new Date()
    date.setMinutes(date.getMinutes() - 1)

    const aliasAddress = `${generateSafeLocalPart()}@${aliasDomain}`
    const metadata = { purpose: 'testing', environment: 'integration' }
    const expiresAt = DateTime.now().plus({ days: 1 }).toJSDate()

    const emailAlias = await instanceUnderTest.provisionEmailAlias({
      aliasAddress,
      realAddress: externalAddress,
      ownershipProofToken,
      metadata,
      expiresAt,
    })
    emailAliases.push(emailAlias)

    try {
      await instanceUnderTest.verifyExternalEmailAddress({
        emailAddress: externalAddress,
        emailAliasId: emailAlias.id,
      })
    } catch (err) {
      if (
        err instanceof ServiceError &&
        err.message.includes('Daily message quota exceeded')
      ) {
        skip('*** Daily message quota exceeded ***')
        return
      }
      throw err
    }

    await delay(30000)

    if (testSentEmailBucket) {
      const verificationEmail = await s3TestAccount.waitForEmail(
        undefined,
        'Verify your email address',
        { searchFromDate: date, timeoutMs: 10000 },
      )
      expect(verificationEmail).toBeDefined()
    } else {
      // Get all matching verification emails (for concurrent test support)
      const verificationEmails =
        await emailTestAccount.waitForAllEmailsBySubject(
          'Verify your email address',
          { searchFromDate: date, timeoutMs: 10000 },
        )

      expect(verificationEmails.length).toBeGreaterThan(0)
    }

    const verificationResult =
      await instanceUnderTest.verifyExternalEmailAddress({
        emailAddress: externalAddress,
        emailAliasId: emailAlias.id,
        verificationCode: '-1',
      })

    expect(verificationResult).toBeDefined()
    expect(verificationResult?.isVerified).toBeFalsy()
    expect(verificationResult?.reason).toStrictEqual(
      'Verification code does not match',
    )
  })

  it('returns EmailAliasNotFoundError when verifying with an invalid alias id', async ({
    skip,
  }) => {
    try {
      await expect(
        instanceUnderTest.verifyExternalEmailAddress({
          emailAddress: externalAddress,
          emailAliasId: 'non-existent-alias-id',
        }),
      ).rejects.toThrow(EmailAliasNotFoundError)
    } catch (err) {
      if (
        err instanceof ServiceError &&
        err.message.includes('Daily message quota exceeded')
      ) {
        skip('*** Daily message quota exceeded ***')
        return
      }
      throw err
    }
  })
})
