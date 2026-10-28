/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
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
  EmailAlias,
  EmailAliasRealAddressType,
  EmailAliasStatus,
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
import { provisionEmailAlias } from '../util/provisionEmailAlias'
import { v4 } from 'uuid'

describe('SudoEmailClient ListEmailAliasesForOwner Test Suite', () => {
  const log = new DefaultLogger('SudoEmailClientIntegrationTests')

  let emailAliases: EmailAlias[] = []
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
    runTests = config.emailAliasesEnabled
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
      log.debug('Email aliases are not enabled, skipping tests')
    }
  })

  afterEach(async () => {
    // Deprovision email aliases first
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

    await teardown(
      { emailAddresses: [provisionedEmailAddress], sudos: [sudo] },
      { emailClient: instanceUnderTest, profilesClient, userClient },
    )
  })

  it('returns empty list when no aliases exist', async () => {
    if (!runTests) {
      log.debug('Email Aliases not enabled. Skipping.')
      return
    }
    const result = await instanceUnderTest.listEmailAliasesForOwner({})

    expect(result).toBeDefined()
    expect(result.items).toEqual([])
    expect(result.nextToken).toBeUndefined()
  })

  it('lists a single provisioned alias', async () => {
    if (!runTests) {
      log.debug('Email Aliases not enabled. Skipping.')
      return
    }
    const metadata = { purpose: 'testing' }
    const emailAlias = await provisionEmailAlias(
      ownershipProofToken,
      instanceUnderTest,
      {
        metadata,
        realAddress: provisionedEmailAddress.emailAddress,
      },
    )
    emailAliases.push(emailAlias)

    await waitForExpect(async () => {
      const result = await instanceUnderTest.listEmailAliasesForOwner({})

      expect(result.items).toHaveLength(1)
      expect(result.items[0].id).toStrictEqual(emailAlias.id)
      expect(result.items[0].aliasAddress).toStrictEqual(
        emailAlias.aliasAddress,
      )
      expect(result.items[0].realAddress).toStrictEqual(emailAlias.realAddress)
      expect(result.items[0].status).toStrictEqual(EmailAliasStatus.ENABLED)
      expect(result.items[0].metadata).toEqual(metadata)

      const sub = await userClient.getSubject()
      expect(result.items[0].owner).toStrictEqual(sub)
      expect(result.items[0].owners[0].id).toStrictEqual(sudo.id)
      expect(result.items[0].owners[0].issuer).toStrictEqual(sudoIssuer)
    })
  })

  it('lists multiple provisioned aliases', async () => {
    if (!runTests) {
      log.debug('Email Aliases not enabled. Skipping.')
      return
    }
    const alias1 = await provisionEmailAlias(
      ownershipProofToken,
      instanceUnderTest,
      {
        metadata: { index: 1 },
        realAddress: provisionedEmailAddress.emailAddress,
      },
    )
    emailAliases.push(alias1)

    const alias2 = await provisionEmailAlias(
      ownershipProofToken,
      instanceUnderTest,
      {
        metadata: { index: 2 },
        realAddress: provisionedEmailAddress.emailAddress,
      },
    )
    emailAliases.push(alias2)

    const alias3 = await provisionEmailAlias(
      ownershipProofToken,
      instanceUnderTest,
      {
        metadata: { index: 3 },
        realAddress: provisionedEmailAddress.emailAddress,
      },
    )
    emailAliases.push(alias3)

    await waitForExpect(async () => {
      const result = await instanceUnderTest.listEmailAliasesForOwner({})

      expect(result.items).toHaveLength(3)
      const aliasIds = result.items.map((m) => m.id)
      expect(aliasIds).toContain(alias1.id)
      expect(aliasIds).toContain(alias2.id)
      expect(aliasIds).toContain(alias3.id)
    })
  })

  it('filters by status', async () => {
    if (!runTests) {
      log.debug('Email Aliases not enabled. Skipping.')
      return
    }
    const enabledAlias = await provisionEmailAlias(
      ownershipProofToken,
      instanceUnderTest,
      {
        realAddress: provisionedEmailAddress.emailAddress,
      },
    )
    emailAliases.push(enabledAlias)

    const disabledAlias = await provisionEmailAlias(
      ownershipProofToken,
      instanceUnderTest,
      {
        realAddress: provisionedEmailAddress.emailAddress,
      },
    )
    emailAliases.push(disabledAlias)

    await instanceUnderTest.disableEmailAlias({
      emailAliasId: disabledAlias.id,
    })

    await waitForExpect(async () => {
      const result = await instanceUnderTest.listEmailAliasesForOwner({
        filter: {
          status: { equal: EmailAliasStatus.ENABLED },
        },
      })

      expect(result.items.length).toBeGreaterThanOrEqual(1)
      const enabledAliass = result.items.filter(
        (m) => m.status === EmailAliasStatus.ENABLED,
      )
      expect(enabledAliass.length).toBeGreaterThanOrEqual(1)
      expect(enabledAliass.some((m) => m.id === enabledAlias.id)).toBe(true)
      expect(enabledAliass.every((m) => m.id !== disabledAlias.id)).toBe(true)
    })

    await waitForExpect(async () => {
      const result = await instanceUnderTest.listEmailAliasesForOwner({
        filter: {
          status: { equal: EmailAliasStatus.DISABLED },
        },
      })

      expect(result.items.length).toBeGreaterThanOrEqual(1)
      const disabledAliass = result.items.filter(
        (m) => m.status === EmailAliasStatus.DISABLED,
      )
      expect(disabledAliass.length).toBeGreaterThanOrEqual(1)
      expect(disabledAliass.some((m) => m.id === disabledAlias.id)).toBe(true)
      expect(disabledAliass.every((m) => m.id !== enabledAlias.id)).toBe(true)
    })
  })

  it('filters by status DISABLED', async () => {
    if (!runTests) {
      log.debug('Email Aliases not enabled. Skipping.')
      return
    }
    const enabledAlias = await provisionEmailAlias(
      ownershipProofToken,
      instanceUnderTest,
      {
        realAddress: provisionedEmailAddress.emailAddress,
      },
    )
    emailAliases.push(enabledAlias)

    const disabledAlias = await provisionEmailAlias(
      ownershipProofToken,
      instanceUnderTest,
      {
        realAddress: provisionedEmailAddress.emailAddress,
      },
    )
    emailAliases.push(disabledAlias)

    await instanceUnderTest.disableEmailAlias({
      emailAliasId: disabledAlias.id,
    })

    await waitForExpect(async () => {
      const result = await instanceUnderTest.listEmailAliasesForOwner({
        filter: {
          status: { equal: EmailAliasStatus.DISABLED },
        },
      })

      expect(result.items.length).toBeGreaterThanOrEqual(1)
      const disabledAliass = result.items.filter(
        (m) => m.status === EmailAliasStatus.DISABLED,
      )
      expect(disabledAliass.length).toBeGreaterThanOrEqual(1)
      expect(disabledAliass.some((m) => m.id === disabledAlias.id)).toBe(true)
      expect(disabledAliass.every((m) => m.id !== enabledAlias.id)).toBe(true)
    })
  })

  it('uses pagination with limit', async () => {
    if (!runTests) {
      log.debug('Email Aliases not enabled. Skipping.')
      return
    }
    // Create 3 aliases
    for (let i = 0; i < 3; i++) {
      const alias = await provisionEmailAlias(
        ownershipProofToken,
        instanceUnderTest,
        {
          realAddress: provisionedEmailAddress.emailAddress,
        },
      )
      emailAliases.push(alias)
    }

    await waitForExpect(async () => {
      const result = await instanceUnderTest.listEmailAliasesForOwner({
        limit: 2,
      })

      expect(result.items.length).toBeLessThanOrEqual(2)
      if (result.items.length === 2 && result.nextToken) {
        // If we got a nextToken, fetch the next page
        const nextResult = await instanceUnderTest.listEmailAliasesForOwner({
          nextToken: result.nextToken,
        })
        expect(nextResult.items.length).toBeGreaterThan(0)
      }
    })
  })
})
