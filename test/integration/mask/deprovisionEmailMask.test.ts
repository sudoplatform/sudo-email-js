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

describe('SudoEmailClient DeprovisionEmailMask Test Suite', () => {
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

  it('returns expected output when deprovisioning', async () => {
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

    const deprovisionedMask = await instanceUnderTest.deprovisionEmailMask({
      emailMaskId: emailMask.id,
    })

    expect(deprovisionedMask.id).toStrictEqual(emailMask.id)
    expect(deprovisionedMask.maskAddress).toStrictEqual(emailMask.maskAddress)
    expect(deprovisionedMask.realAddress).toStrictEqual(emailMask.realAddress)
    expect(deprovisionedMask.status).toStrictEqual(EmailMaskStatus.ENABLED)
    expect(deprovisionedMask.owner).toStrictEqual(emailMask.owner)
    expect(deprovisionedMask.version).toBeGreaterThanOrEqual(emailMask.version)

    const sub = await userClient.getSubject()
    expect(deprovisionedMask.owner).toStrictEqual(sub)
    expect(deprovisionedMask.owners[0].id).toStrictEqual(sudo.id)
    expect(deprovisionedMask.owners[0].issuer).toStrictEqual(sudoIssuer)
  })

  it('successfully deprovisions mask with metadata', async () => {
    if (!runTests) {
      log.debug('Email Masks not enabled. Skipping.')
      return
    }
    const metadata = { purpose: 'test', note: 'will be deprovisioned' }
    const emailMask = await provisionEmailMask(
      ownershipProofToken,
      instanceUnderTest,
      {
        metadata,
        realAddress: provisionedEmailAddress.emailAddress,
      },
    )

    const deprovisionedMask = await instanceUnderTest.deprovisionEmailMask({
      emailMaskId: emailMask.id,
    })

    expect(deprovisionedMask.id).toStrictEqual(emailMask.id)
    expect(deprovisionedMask.metadata).toEqual(metadata)
  })

  it('can deprovision multiple masks', async () => {
    if (!runTests) {
      log.debug('Email Masks not enabled. Skipping.')
      return
    }
    const emailMask1 = await provisionEmailMask(
      ownershipProofToken,
      instanceUnderTest,
      {
        realAddress: provisionedEmailAddress.emailAddress,
      },
    )

    const emailMask2 = await provisionEmailMask(
      ownershipProofToken,
      instanceUnderTest,
      {
        realAddress: provisionedEmailAddress.emailAddress,
      },
    )

    const deprovisioned1 = await instanceUnderTest.deprovisionEmailMask({
      emailMaskId: emailMask1.id,
    })
    const deprovisioned2 = await instanceUnderTest.deprovisionEmailMask({
      emailMaskId: emailMask2.id,
    })

    expect(deprovisioned1.id).toStrictEqual(emailMask1.id)
    expect(deprovisioned2.id).toStrictEqual(emailMask2.id)
    expect(deprovisioned1.id).not.toStrictEqual(deprovisioned2.id)
  })
})
