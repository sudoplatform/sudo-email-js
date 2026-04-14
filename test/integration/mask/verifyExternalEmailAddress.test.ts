/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger, ServiceError } from '@sudoplatform/sudo-common'
import {
  EmailMask,
  EmailMaskNotFoundError,
  SudoEmailClient,
} from '../../../src'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import { SudoEntitlementsClient } from '@sudoplatform/sudo-entitlements'
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import {
  getEmailMaskDomains,
  setupEmailClient,
} from '../util/emailClientLifecycle'
import { ExternalTestAccount } from '../util/externalTestAccount'
import { delay } from '../../util/delay'
import { extractOtp } from '../util/emailMessage'
import { generateSafeLocalPart } from '../util/provisionEmailAddress'
import { DateTime } from 'luxon'

describe('SudoEmailClient VerifyExternalEmailAddress Test Suite', () => {
  const log = new DefaultLogger('SudoEmailClientIntegrationTests')

  let emailTestAccount: ExternalTestAccount
  let emailMasks: EmailMask[] = []

  let instanceUnderTest: SudoEmailClient
  let userClient: SudoUserClient
  let entitlementsClient: SudoEntitlementsClient
  let profilesClient: SudoProfilesClient
  let sudo: Sudo
  let ownershipProofToken: string
  let maskDomain: string
  let runTests = true

  function isDailyQuotaExceeded(err: unknown): boolean {
    return (
      err instanceof ServiceError &&
      err.message.includes('Daily message quota exceeded')
    )
  }

  beforeEach(async () => {
    const result = await setupEmailClient(log)
    instanceUnderTest = result.emailClient
    const config = await instanceUnderTest.getConfigurationData()
    runTests = config.emailMasksEnabled && config.externalEmailMasksEnabled
    if (runTests) {
      userClient = result.userClient
      entitlementsClient = result.entitlementsClient
      profilesClient = result.profilesClient
      sudo = result.sudo
      ownershipProofToken = result.ownershipProofToken
      emailTestAccount = new ExternalTestAccount(log)
      maskDomain = (await getEmailMaskDomains(result.emailClient))[0]
    } else {
      log.debug('External email masks are not enabled, skipping tests')
    }
  })

  afterEach(async () => {
    await Promise.all(
      emailMasks.map(async (mask) => {
        try {
          await instanceUnderTest.deprovisionEmailMask({
            emailMaskId: mask.id,
          })
        } catch (err) {
          console.log(`Error deprovisioning email mask ${mask.id}: ${err}`)
        }
      }),
    )
    emailMasks = []
  })

  it('can verify successfully', { timeout: 320000 }, async ({ skip }) => {
    if (!runTests) {
      skip('External email masks not enabled; skipping')
      return
    }
    const date = new Date()
    date.setMinutes(date.getMinutes() - 1)

    const maskAddress = `${generateSafeLocalPart()}@${maskDomain}`
    const metadata = { purpose: 'testing', environment: 'integration' }
    const expiresAt = DateTime.now().plus({ days: 1 }).toJSDate()

    const emailMask = await instanceUnderTest.provisionEmailMask({
      maskAddress,
      realAddress: emailTestAccount.getEmailAddress(),
      ownershipProofToken,
      metadata,
      expiresAt,
    })
    emailMasks.push(emailMask)

    try {
      await instanceUnderTest.verifyExternalEmailAddress({
        emailAddress: emailTestAccount.getEmailAddress(),
        emailMaskId: emailMask.id,
      })
    } catch (err) {
      if (isDailyQuotaExceeded(err)) {
        skip('*** Daily message quota exceeded ***')
        return
      }
      throw err
    }

    // Wait for verification code email to be sent
    await delay(20000)

    // Get all matching verification emails (for concurrent test support)
    const verificationEmails = await emailTestAccount.waitForAllEmailsBySubject(
      'Verify your email address',
      { searchFromDate: date, timeoutMs: 10000 },
    )

    expect(verificationEmails.length).toBeGreaterThan(0)

    // Try each verification code until one succeeds
    let verificationResult
    let successfulEmail
    for (const email of verificationEmails) {
      const code = extractOtp(email.html)
      if (!code) {
        log.debug('Could not extract OTP from email')
        continue
      }

      const result = await instanceUnderTest.verifyExternalEmailAddress({
        emailAddress: emailTestAccount.getEmailAddress(),
        emailMaskId: emailMask.id,
        verificationCode: code,
      })

      if (result?.isVerified) {
        verificationResult = result
        successfulEmail = email
        break
      }
    }

    expect(verificationResult).toBeDefined()
    expect(verificationResult?.isVerified).toBeTruthy()
    expect(verificationResult?.reason).toBeUndefined()

    if (successfulEmail?.messageId) {
      await emailTestAccount.deleteEmail(successfulEmail.messageId)
    }
  })

  it('fails to verify when verification code does not match', async ({
    skip,
  }) => {
    if (!runTests) {
      skip('External email masks not enabled; skipping')
      return
    }

    const date = new Date()
    date.setMinutes(date.getMinutes() - 1)

    const maskAddress = `${generateSafeLocalPart()}@${maskDomain}`
    const metadata = { purpose: 'testing', environment: 'integration' }
    const expiresAt = DateTime.now().plus({ days: 1 }).toJSDate()

    const emailMask = await instanceUnderTest.provisionEmailMask({
      maskAddress,
      realAddress: emailTestAccount.getEmailAddress(),
      ownershipProofToken,
      metadata,
      expiresAt,
    })
    emailMasks.push(emailMask)

    try {
      await instanceUnderTest.verifyExternalEmailAddress({
        emailAddress: emailTestAccount.getEmailAddress(),
        emailMaskId: emailMask.id,
      })
    } catch (err) {
      if (isDailyQuotaExceeded(err)) {
        skip('*** Daily message quota exceeded ***')
        return
      }
      throw err
    }

    await delay(30000)

    const verificationEmails = await emailTestAccount.waitForAllEmailsBySubject(
      'Verify your email address',
      { searchFromDate: date },
    )

    expect(verificationEmails.length).toBeGreaterThan(0)

    const verificationResult =
      await instanceUnderTest.verifyExternalEmailAddress({
        emailAddress: emailTestAccount.getEmailAddress(),
        emailMaskId: emailMask.id,
        verificationCode: '-1',
      })

    expect(verificationResult).toBeDefined()
    expect(verificationResult?.isVerified).toBeFalsy()
    expect(verificationResult?.reason).toStrictEqual(
      'Verification code does not match',
    )
  })

  it('returns EmailMaskNotFoundError when verifying with an invalid mask id', async ({
    skip,
  }) => {
    if (!runTests) {
      skip('External email masks not enabled; skipping')
      return
    }

    try {
      await expect(
        instanceUnderTest.verifyExternalEmailAddress({
          emailAddress: emailTestAccount.getEmailAddress(),
          emailMaskId: 'non-existent-mask-id',
        }),
      ).rejects.toThrow(EmailMaskNotFoundError)
    } catch (err) {
      if (isDailyQuotaExceeded(err)) {
        skip('*** Daily message quota exceeded ***')
        return
      }
      throw err
    }
  })
})
