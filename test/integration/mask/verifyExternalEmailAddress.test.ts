/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger } from '@sudoplatform/sudo-common'
import { SudoEmailClient } from '../../../src'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import { SudoEntitlementsClient } from '@sudoplatform/sudo-entitlements'
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import { setupEmailClient } from '../util/emailClientLifecycle'
import { ExternalTestAccount } from '../util/externalTestAccount'
import { delay } from '../../util/delay'
import { extractOtp } from '../util/emailMessage'

describe('SudoEmailClient VerifyExternalEmailAddress Test Suite', () => {
  jest.setTimeout(240000)
  const log = new DefaultLogger('SudoEmailClientIntegrationTests')

  let emailTestAccount: ExternalTestAccount

  let instanceUnderTest: SudoEmailClient
  let userClient: SudoUserClient
  let entitlementsClient: SudoEntitlementsClient
  let profilesClient: SudoProfilesClient
  let sudo: Sudo
  let ownershipProofToken: string
  let runTests = true

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
    } else {
      log.debug('External email masks are not enabled, skipping tests')
    }
  })

  it('can verify successfully', async () => {
    if (!runTests) {
      log.debug('External email masks not enabled. Skipping.')
      return
    }
    let date = new Date()
    date.setMinutes(date.getMinutes() - 1)

    const result = await instanceUnderTest.verifyExternalEmailAddress({
      emailAddress: emailTestAccount.getEmailAddress(),
      emailMaskId: 'test-id',
    })

    // Wait for verification code email to be sent
    await delay(30000)

    const verificationCodeEmail = await emailTestAccount.waitForEmailFromSender(
      emailTestAccount.getEmailAddress(),
      'Verify your email address',
      { searchFromDate: date },
    )

    const verificationResult =
      await instanceUnderTest.verifyExternalEmailAddress({
        emailAddress: emailTestAccount.getEmailAddress(),
        emailMaskId: 'test-id',
        verificationCode: extractOtp(verificationCodeEmail.html),
      })

    expect(verificationResult).toBeDefined()
    expect(verificationResult?.isVerified).toBeTruthy()
    expect(verificationResult?.reason).toBeUndefined()
  })

  it('fails to verify when verification code does not match', async () => {
    if (!runTests) {
      log.debug('External email masks not enabled. Skipping.')
      return
    }

    let date = new Date()
    date.setMinutes(date.getMinutes() - 1)

    const result = await instanceUnderTest.verifyExternalEmailAddress({
      emailAddress: emailTestAccount.getEmailAddress(),
      emailMaskId: 'test-id',
    })

    // Wait for verification code email to be sent
    await delay(30000)

    const verificationCodeEmail = await emailTestAccount.waitForEmailFromSender(
      emailTestAccount.getEmailAddress(),
      'Verify your email address',
      { searchFromDate: date },
    )

    const verificationResult =
      await instanceUnderTest.verifyExternalEmailAddress({
        emailAddress: emailTestAccount.getEmailAddress(),
        emailMaskId: 'test-id',
        verificationCode: '-1',
      })

    expect(verificationResult).toBeDefined()
    expect(verificationResult?.isVerified).toBeFalsy()
    expect(verificationResult?.reason).toStrictEqual(
      'Verification code does not match',
    )
  })
})
