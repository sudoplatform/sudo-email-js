/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger } from '@sudoplatform/sudo-common'
import { SudoEntitlementsClient } from '@sudoplatform/sudo-entitlements'
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import { DateTime } from 'luxon'
import { v4 } from 'uuid'
import {
  EmailAddress,
  EmailMask,
  EmailMaskRealAddressType,
  EmailMaskStatus,
  SudoEmailClient,
} from '../../../src'
import { secondsSinceEpoch } from '../../../src/private/util/date'
import {
  getEmailMaskDomains,
  setupEmailClient,
  sudoIssuer,
  teardown,
} from '../util/emailClientLifecycle'
import {
  generateSafeLocalPart,
  provisionEmailAddress,
} from '../util/provisionEmailAddress'

describe('SudoEmailClient ProvisionEmailMask Test Suite', () => {
  jest.setTimeout(240000)
  const log = new DefaultLogger('SudoEmailClientIntegrationTests')

  let emailAddresses: EmailAddress[] = []
  let emailMasks: EmailMask[] = []

  let instanceUnderTest: SudoEmailClient
  let userClient: SudoUserClient
  let entitlementsClient: SudoEntitlementsClient
  let profilesClient: SudoProfilesClient
  let sudo: Sudo
  let ownershipProofToken: string
  let maskDomain: string
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
      maskDomain = (await getEmailMaskDomains(result.emailClient))[0]
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
      { emailAddresses, sudos: [sudo] },
      { emailClient: instanceUnderTest, profilesClient, userClient },
    )
    emailAddresses = []
  })

  const runTestsIfEnabled = runTests ? describe : describe.skip
  runTestsIfEnabled('emailMasksEnabled', () => {
    it('returns expected output with internal real address', async () => {
      const realEmailAddress = await provisionEmailAddress(
        ownershipProofToken,
        instanceUnderTest,
      )
      emailAddresses.push(realEmailAddress)

      const maskAddress = `${generateSafeLocalPart()}@${maskDomain}`
      const metadata = { purpose: 'testing', environment: 'integration' }
      const expiresAt = DateTime.now().plus({ days: 1 }).toJSDate() // 1 day from now

      const emailMask = await instanceUnderTest.provisionEmailMask({
        maskAddress,
        realAddress: realEmailAddress.emailAddress,
        ownershipProofToken,
        metadata,
        expiresAt,
      })
      emailMasks.push(emailMask)

      expect(emailMask.id).toBeDefined()
      expect(emailMask.maskAddress).toStrictEqual(maskAddress)
      expect(emailMask.realAddress).toStrictEqual(realEmailAddress.emailAddress)
      expect(emailMask.realAddressType).toStrictEqual(
        EmailMaskRealAddressType.INTERNAL,
      )
      expect(emailMask.status).toStrictEqual(EmailMaskStatus.ENABLED)

      const sub = await userClient.getSubject()
      expect(emailMask.owner).toStrictEqual(sub)
      expect(emailMask.owners[0].id).toStrictEqual(sudo.id)
      expect(emailMask.owners[0].issuer).toStrictEqual(sudoIssuer)

      expect(emailMask.identityId).toBeDefined()
      expect(emailMask.version).toStrictEqual(0)

      // Check counters are initialized to zero
      expect(emailMask.inboundReceived).toStrictEqual(0)
      expect(emailMask.inboundDelivered).toStrictEqual(0)
      expect(emailMask.outboundReceived).toStrictEqual(0)
      expect(emailMask.outboundDelivered).toStrictEqual(0)
      expect(emailMask.spamCount).toStrictEqual(0)
      expect(emailMask.virusCount).toStrictEqual(0)

      // Check metadata and expiration
      expect(emailMask.metadata).toEqual(metadata)
      expect(emailMask.expiresAt).toBeDefined()
      expect(secondsSinceEpoch(emailMask.expiresAt!)).toEqual(
        secondsSinceEpoch(expiresAt),
      )
    })

    it('provisions a mask with external real address', async () => {
      const maskAddress = `${generateSafeLocalPart()}@${maskDomain}`
      const externalRealAddress = `${v4()}@anonyome.com`

      const emailMask = await instanceUnderTest.provisionEmailMask({
        maskAddress,
        realAddress: externalRealAddress,
        ownershipProofToken,
      })
      emailMasks.push(emailMask)

      expect(emailMask.id).toBeDefined()
      expect(emailMask.maskAddress).toStrictEqual(maskAddress)
      expect(emailMask.realAddress).toStrictEqual(externalRealAddress)
      expect(emailMask.realAddressType).toStrictEqual(
        EmailMaskRealAddressType.EXTERNAL,
      )
      expect(emailMask.status).toStrictEqual(EmailMaskStatus.ENABLED)

      const sub = await userClient.getSubject()
      expect(emailMask.owner).toStrictEqual(sub)
      expect(emailMask.owners[0].id).toStrictEqual(sudo.id)
      expect(emailMask.owners[0].issuer).toStrictEqual(sudoIssuer)
    })

    it('provisions a mask without optional metadata and expiration', async () => {
      const realEmailAddress = await provisionEmailAddress(
        ownershipProofToken,
        instanceUnderTest,
      )
      emailAddresses.push(realEmailAddress)

      const maskAddress = `${generateSafeLocalPart()}@${maskDomain}`

      const emailMask = await instanceUnderTest.provisionEmailMask({
        maskAddress,
        realAddress: realEmailAddress.emailAddress,
        ownershipProofToken,
      })
      emailMasks.push(emailMask)

      expect(emailMask.id).toBeDefined()
      expect(emailMask.maskAddress).toStrictEqual(maskAddress)
      expect(emailMask.realAddress).toStrictEqual(realEmailAddress.emailAddress)
      expect(emailMask.status).toStrictEqual(EmailMaskStatus.ENABLED)
      expect(emailMask.metadata).toBeUndefined()
      expect(emailMask.expiresAt).toBeUndefined()
    })

    it('provisions a mask with multi-byte UTF-8 characters in metadata', async () => {
      const realEmailAddress = await provisionEmailAddress(
        ownershipProofToken,
        instanceUnderTest,
      )
      emailAddresses.push(realEmailAddress)

      const maskAddress = `${generateSafeLocalPart()}@${maskDomain}`
      const metadata = {
        emoji: '😎🎉',
        unicode: '日本語',
        description: 'Test with UTF-8 🔥',
      }

      const emailMask = await instanceUnderTest.provisionEmailMask({
        maskAddress,
        realAddress: realEmailAddress.emailAddress,
        ownershipProofToken,
        metadata,
      })
      emailMasks.push(emailMask)

      expect(emailMask.id).toBeDefined()
      expect(emailMask.metadata).toEqual(metadata)
    })

    it('can provision multiple email masks', async () => {
      const realEmailAddress = await provisionEmailAddress(
        ownershipProofToken,
        instanceUnderTest,
      )
      emailAddresses.push(realEmailAddress)

      const maskAddress1 = `${generateSafeLocalPart()}@${maskDomain}`
      const maskAddress2 = `${generateSafeLocalPart()}@${maskDomain}`

      const emailMask1 = await instanceUnderTest.provisionEmailMask({
        maskAddress: maskAddress1,
        realAddress: realEmailAddress.emailAddress,
        ownershipProofToken,
      })

      const emailMask2 = await instanceUnderTest.provisionEmailMask({
        maskAddress: maskAddress2,
        realAddress: realEmailAddress.emailAddress,
        ownershipProofToken,
      })

      emailMasks.push(emailMask1, emailMask2)

      expect(emailMask1.id).not.toStrictEqual(emailMask2.id)
      expect(emailMask1.maskAddress).toStrictEqual(maskAddress1)
      expect(emailMask2.maskAddress).toStrictEqual(maskAddress2)
      expect(emailMask1.realAddress).toStrictEqual(emailMask2.realAddress)
      expect(emailMask1.owner).toStrictEqual(emailMask2.owner)
      expect(emailMask1.owners[0].id).toStrictEqual(emailMask2.owners[0].id)
    })
  })
})
