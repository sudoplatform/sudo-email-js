/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger } from '@sudoplatform/sudo-common'
import { SudoEntitlementsClient } from '@sudoplatform/sudo-entitlements'
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import {
  EmailAddress,
  EmailMask,
  EmailMaskStatus,
  SudoEmailClient,
} from '../../../src'
import {
  setupEmailClient,
  sudoIssuer,
  teardown,
} from '../util/emailClientLifecycle'
import { provisionEmailMask } from '../util/provisionEmailMask'
import { provisionEmailAddress } from '../util/provisionEmailAddress'

describe('SudoEmailClient EnableEmailMask Test Suite', () => {
  jest.setTimeout(240000)
  const log = new DefaultLogger('SudoEmailClientIntegrationTests')

  let emailMasks: EmailMask[] = []
  let provisionedEmailAddress: EmailAddress

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
    runTests = config.emailMasksEnabled
    if (runTests) {
      userClient = result.userClient
      entitlementsClient = result.entitlementsClient
      profilesClient = result.profilesClient
      sudo = result.sudo
      ownershipProofToken = result.ownershipProofToken
      provisionedEmailAddress = await provisionEmailAddress(
        ownershipProofToken,
        instanceUnderTest,
      )
    } else {
      log.debug('Email masks are not enabled, skipping tests')
    }
  })

  afterEach(async () => {
    // Deprovision email masks first
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

    await teardown(
      { emailAddresses: [provisionedEmailAddress], sudos: [sudo] },
      { emailClient: instanceUnderTest, profilesClient, userClient },
    )
  })

  it('enables a disabled email mask', async () => {
    if (!runTests) {
      log.debug('Email Masks not enabled. Skipping.')
      return
    }
    const emailMask = await provisionEmailMask(
      ownershipProofToken,
      instanceUnderTest,
      {
        realAddress: provisionedEmailAddress.emailAddress,
      },
    )
    emailMasks.push(emailMask)

    // First disable it
    const disabledMask = await instanceUnderTest.disableEmailMask({
      emailMaskId: emailMask.id,
    })
    expect(disabledMask.status).toStrictEqual(EmailMaskStatus.DISABLED)

    // Then enable it
    const enabledMask = await instanceUnderTest.enableEmailMask({
      emailMaskId: emailMask.id,
    })

    expect(enabledMask.id).toStrictEqual(emailMask.id)
    expect(enabledMask.status).toStrictEqual(EmailMaskStatus.ENABLED)
    expect(enabledMask.maskAddress).toStrictEqual(emailMask.maskAddress)
    expect(enabledMask.realAddress).toStrictEqual(emailMask.realAddress)
    expect(enabledMask.version).toBeGreaterThan(disabledMask.version)

    const sub = await userClient.getSubject()
    expect(enabledMask.owner).toStrictEqual(sub)
    expect(enabledMask.owners[0].id).toStrictEqual(sudo.id)
    expect(enabledMask.owners[0].issuer).toStrictEqual(sudoIssuer)
  })

  it('enabling an already enabled mask succeeds', async () => {
    if (!runTests) {
      log.debug('Email Masks not enabled. Skipping.')
      return
    }
    const emailMask = await provisionEmailMask(
      ownershipProofToken,
      instanceUnderTest,
      {
        realAddress: provisionedEmailAddress.emailAddress,
      },
    )
    emailMasks.push(emailMask)

    expect(emailMask.status).toStrictEqual(EmailMaskStatus.ENABLED)

    // Enable an already enabled mask
    const enabledMask = await instanceUnderTest.enableEmailMask({
      emailMaskId: emailMask.id,
    })

    expect(enabledMask.id).toStrictEqual(emailMask.id)
    expect(enabledMask.status).toStrictEqual(EmailMaskStatus.ENABLED)
  })
})
