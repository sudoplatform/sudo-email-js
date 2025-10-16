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

describe('SudoEmailClient DeprovisionEmailMask Test Suite', () => {
  jest.setTimeout(240000)
  const log = new DefaultLogger('SudoEmailClientIntegrationTests')

  let emailMasks: EmailMask[] = []

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
      { emailAddresses: [], sudos: [sudo] },
      { emailClient: instanceUnderTest, profilesClient, userClient },
    )
  })

  const runTestsIfEnabled = runTests ? describe : describe.skip
  runTestsIfEnabled('emailMasksEnabled', () => {
    it('returns expected output when deprovisioning', async () => {
      const emailMask = await provisionEmailMask(
        ownershipProofToken,
        instanceUnderTest,
      )

      const deprovisionedMask = await instanceUnderTest.deprovisionEmailMask({
        emailMaskId: emailMask.id,
      })

      expect(deprovisionedMask.id).toStrictEqual(emailMask.id)
      expect(deprovisionedMask.maskAddress).toStrictEqual(emailMask.maskAddress)
      expect(deprovisionedMask.realAddress).toStrictEqual(emailMask.realAddress)
      expect(deprovisionedMask.status).toStrictEqual(EmailMaskStatus.ENABLED)
      expect(deprovisionedMask.owner).toStrictEqual(emailMask.owner)
      expect(deprovisionedMask.version).toBeGreaterThanOrEqual(
        emailMask.version,
      )

      const sub = await userClient.getSubject()
      expect(deprovisionedMask.owner).toStrictEqual(sub)
      expect(deprovisionedMask.owners[0].id).toStrictEqual(sudo.id)
      expect(deprovisionedMask.owners[0].issuer).toStrictEqual(sudoIssuer)
    })

    it('successfully deprovisions mask with metadata', async () => {
      const metadata = { purpose: 'test', note: 'will be deprovisioned' }
      const emailMask = await provisionEmailMask(
        ownershipProofToken,
        instanceUnderTest,
        {
          metadata,
        },
      )

      const deprovisionedMask = await instanceUnderTest.deprovisionEmailMask({
        emailMaskId: emailMask.id,
      })

      expect(deprovisionedMask.id).toStrictEqual(emailMask.id)
      expect(deprovisionedMask.metadata).toEqual(metadata)
    })

    it('can deprovision multiple masks', async () => {
      const emailMask1 = await provisionEmailMask(
        ownershipProofToken,
        instanceUnderTest,
      )

      const emailMask2 = await provisionEmailMask(
        ownershipProofToken,
        instanceUnderTest,
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
})
