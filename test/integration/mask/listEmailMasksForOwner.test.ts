/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger } from '@sudoplatform/sudo-common'
import { SudoEntitlementsClient } from '@sudoplatform/sudo-entitlements'
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import waitForExpect from 'wait-for-expect'
import {
  EmailAddress,
  EmailMask,
  EmailMaskRealAddressType,
  EmailMaskStatus,
  SudoEmailClient,
} from '../../../src'
import {
  setupEmailClient,
  sudoIssuer,
  teardown,
} from '../util/emailClientLifecycle'
import {
  generateSafeLocalPart,
  provisionEmailAddress,
} from '../util/provisionEmailAddress'
import { provisionEmailMask } from '../util/provisionEmailMask'
import { v4 } from 'uuid'

describe('SudoEmailClient ListEmailMasksForOwner Test Suite', () => {
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
      { emailAddresses, sudos: [sudo] },
      { emailClient: instanceUnderTest, profilesClient, userClient },
    )
    emailAddresses = []
  })

  const runTestsIfEnabled = runTests ? describe : describe.skip
  runTestsIfEnabled('emailMasksEnabled', () => {
    it('returns empty list when no masks exist', async () => {
      const result = await instanceUnderTest.listEmailMasksForOwner({})

      expect(result).toBeDefined()
      expect(result.items).toEqual([])
      expect(result.nextToken).toBeUndefined()
    })

    it('lists a single provisioned mask', async () => {
      const metadata = { purpose: 'testing' }
      const emailMask = await provisionEmailMask(
        ownershipProofToken,
        instanceUnderTest,
        {
          metadata,
        },
      )
      emailMasks.push(emailMask)

      await waitForExpect(async () => {
        const result = await instanceUnderTest.listEmailMasksForOwner({})

        expect(result.items).toHaveLength(1)
        expect(result.items[0].id).toStrictEqual(emailMask.id)
        expect(result.items[0].maskAddress).toStrictEqual(emailMask.maskAddress)
        expect(result.items[0].realAddress).toStrictEqual(emailMask.realAddress)
        expect(result.items[0].status).toStrictEqual(EmailMaskStatus.ENABLED)
        expect(result.items[0].metadata).toEqual(metadata)

        const sub = await userClient.getSubject()
        expect(result.items[0].owner).toStrictEqual(sub)
        expect(result.items[0].owners[0].id).toStrictEqual(sudo.id)
        expect(result.items[0].owners[0].issuer).toStrictEqual(sudoIssuer)
      })
    })

    it('lists multiple provisioned masks', async () => {
      const mask1 = await provisionEmailMask(
        ownershipProofToken,
        instanceUnderTest,
        {
          metadata: { index: 1 },
        },
      )
      emailMasks.push(mask1)

      const mask2 = await provisionEmailMask(
        ownershipProofToken,
        instanceUnderTest,
        {
          metadata: { index: 2 },
        },
      )
      emailMasks.push(mask2)

      const mask3 = await provisionEmailMask(
        ownershipProofToken,
        instanceUnderTest,
        {
          metadata: { index: 3 },
        },
      )
      emailMasks.push(mask3)

      await waitForExpect(async () => {
        const result = await instanceUnderTest.listEmailMasksForOwner({})

        expect(result.items).toHaveLength(3)
        const maskIds = result.items.map((m) => m.id)
        expect(maskIds).toContain(mask1.id)
        expect(maskIds).toContain(mask2.id)
        expect(maskIds).toContain(mask3.id)
      })
    })

    it('filters by status ENABLED', async () => {
      const enabledMask = await provisionEmailMask(
        ownershipProofToken,
        instanceUnderTest,
      )
      emailMasks.push(enabledMask)

      const disabledMask = await provisionEmailMask(
        ownershipProofToken,
        instanceUnderTest,
      )
      emailMasks.push(disabledMask)

      await instanceUnderTest.disableEmailMask({
        emailMaskId: disabledMask.id,
      })

      await waitForExpect(async () => {
        const result = await instanceUnderTest.listEmailMasksForOwner({
          filter: {
            status: { equal: EmailMaskStatus.ENABLED },
          },
        })

        expect(result.items.length).toBeGreaterThanOrEqual(1)
        const enabledMasks = result.items.filter(
          (m) => m.status === EmailMaskStatus.ENABLED,
        )
        expect(enabledMasks.length).toBeGreaterThanOrEqual(1)
        expect(enabledMasks.some((m) => m.id === enabledMask.id)).toBe(true)
        expect(enabledMasks.every((m) => m.id !== disabledMask.id)).toBe(true)
      })
    })

    it('filters by status DISABLED', async () => {
      const enabledMask = await provisionEmailMask(
        ownershipProofToken,
        instanceUnderTest,
      )
      emailMasks.push(enabledMask)

      const disabledMask = await provisionEmailMask(
        ownershipProofToken,
        instanceUnderTest,
      )
      emailMasks.push(disabledMask)

      await instanceUnderTest.disableEmailMask({
        emailMaskId: disabledMask.id,
      })

      await waitForExpect(async () => {
        const result = await instanceUnderTest.listEmailMasksForOwner({
          filter: {
            status: { equal: EmailMaskStatus.DISABLED },
          },
        })

        expect(result.items.length).toBeGreaterThanOrEqual(1)
        const disabledMasks = result.items.filter(
          (m) => m.status === EmailMaskStatus.DISABLED,
        )
        expect(disabledMasks.length).toBeGreaterThanOrEqual(1)
        expect(disabledMasks.some((m) => m.id === disabledMask.id)).toBe(true)
        expect(disabledMasks.every((m) => m.id !== enabledMask.id)).toBe(true)
      })
    })

    it('filters by realAddressType INTERNAL', async () => {
      const realEmailAddress = await provisionEmailAddress(
        ownershipProofToken,
        instanceUnderTest,
      )
      emailAddresses.push(realEmailAddress)

      const internalMask = await provisionEmailMask(
        ownershipProofToken,
        instanceUnderTest,
        {
          realAddress: realEmailAddress.emailAddress,
        },
      )
      emailMasks.push(internalMask)

      const externalMask = await provisionEmailMask(
        ownershipProofToken,
        instanceUnderTest,
        {
          realAddress: `external-${v4()}@anonyome.com`,
        },
      )
      emailMasks.push(externalMask)

      await waitForExpect(async () => {
        const result = await instanceUnderTest.listEmailMasksForOwner({
          filter: {
            realAddressType: { equal: EmailMaskRealAddressType.INTERNAL },
          },
        })

        expect(result.items.length).toBeGreaterThanOrEqual(1)
        const internalMasks = result.items.filter(
          (m) => m.realAddressType === EmailMaskRealAddressType.INTERNAL,
        )
        expect(internalMasks.length).toBeGreaterThanOrEqual(1)
        expect(internalMasks.some((m) => m.id === internalMask.id)).toBe(true)
      })
    })

    it('filters by realAddressType EXTERNAL', async () => {
      const externalMask = await provisionEmailMask(
        ownershipProofToken,
        instanceUnderTest,
        {
          realAddress: `external-${v4()}@anonyome.com`,
        },
      )
      emailMasks.push(externalMask)

      await waitForExpect(async () => {
        const result = await instanceUnderTest.listEmailMasksForOwner({
          filter: {
            realAddressType: { equal: EmailMaskRealAddressType.EXTERNAL },
          },
        })

        expect(result.items.length).toBeGreaterThanOrEqual(1)
        const externalMasks = result.items.filter(
          (m) => m.realAddressType === EmailMaskRealAddressType.EXTERNAL,
        )
        expect(externalMasks.length).toBeGreaterThanOrEqual(1)
        expect(externalMasks.some((m) => m.id === externalMask.id)).toBe(true)
      })
    })

    it('uses pagination with limit', async () => {
      // Create 3 masks
      for (let i = 0; i < 3; i++) {
        const mask = await provisionEmailMask(
          ownershipProofToken,
          instanceUnderTest,
        )
        emailMasks.push(mask)
      }

      await waitForExpect(async () => {
        const result = await instanceUnderTest.listEmailMasksForOwner({
          limit: 2,
        })

        expect(result.items.length).toBeLessThanOrEqual(2)
        if (result.items.length === 2 && result.nextToken) {
          // If we got a nextToken, fetch the next page
          const nextResult = await instanceUnderTest.listEmailMasksForOwner({
            nextToken: result.nextToken,
          })
          expect(nextResult.items.length).toBeGreaterThan(0)
        }
      })
    })
  })
})
