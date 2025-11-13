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

  it('returns empty list when no masks exist', async () => {
    if (!runTests) {
      log.debug('Email Masks not enabled. Skipping.')
      return
    }
    const result = await instanceUnderTest.listEmailMasksForOwner({})

    expect(result).toBeDefined()
    expect(result.items).toEqual([])
    expect(result.nextToken).toBeUndefined()
  })

  it('lists a single provisioned mask', async () => {
    if (!runTests) {
      log.debug('Email Masks not enabled. Skipping.')
      return
    }
    const metadata = { purpose: 'testing' }
    const emailMask = await provisionEmailMask(
      ownershipProofToken,
      instanceUnderTest,
      {
        metadata,
        realAddress: provisionedEmailAddress.emailAddress,
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
    if (!runTests) {
      log.debug('Email Masks not enabled. Skipping.')
      return
    }
    const mask1 = await provisionEmailMask(
      ownershipProofToken,
      instanceUnderTest,
      {
        metadata: { index: 1 },
        realAddress: provisionedEmailAddress.emailAddress,
      },
    )
    emailMasks.push(mask1)

    const mask2 = await provisionEmailMask(
      ownershipProofToken,
      instanceUnderTest,
      {
        metadata: { index: 2 },
        realAddress: provisionedEmailAddress.emailAddress,
      },
    )
    emailMasks.push(mask2)

    const mask3 = await provisionEmailMask(
      ownershipProofToken,
      instanceUnderTest,
      {
        metadata: { index: 3 },
        realAddress: provisionedEmailAddress.emailAddress,
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

  it('filters by status', async () => {
    if (!runTests) {
      log.debug('Email Masks not enabled. Skipping.')
      return
    }
    const enabledMask = await provisionEmailMask(
      ownershipProofToken,
      instanceUnderTest,
      {
        realAddress: provisionedEmailAddress.emailAddress,
      },
    )
    emailMasks.push(enabledMask)

    const disabledMask = await provisionEmailMask(
      ownershipProofToken,
      instanceUnderTest,
      {
        realAddress: provisionedEmailAddress.emailAddress,
      },
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

  it('filters by status DISABLED', async () => {
    if (!runTests) {
      log.debug('Email Masks not enabled. Skipping.')
      return
    }
    const enabledMask = await provisionEmailMask(
      ownershipProofToken,
      instanceUnderTest,
      {
        realAddress: provisionedEmailAddress.emailAddress,
      },
    )
    emailMasks.push(enabledMask)

    const disabledMask = await provisionEmailMask(
      ownershipProofToken,
      instanceUnderTest,
      {
        realAddress: provisionedEmailAddress.emailAddress,
      },
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

  it('uses pagination with limit', async () => {
    if (!runTests) {
      log.debug('Email Masks not enabled. Skipping.')
      return
    }
    // Create 3 masks
    for (let i = 0; i < 3; i++) {
      const mask = await provisionEmailMask(
        ownershipProofToken,
        instanceUnderTest,
        {
          realAddress: provisionedEmailAddress.emailAddress,
        },
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
