/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger } from '@sudoplatform/sudo-common'
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import waitForExpect from 'wait-for-expect'
import {
  EmailAddress,
  EmailAlias,
  EmailAliasListItem,
  EmailAliasStatus,
  SudoEmailClient,
} from '../../../src'
import { createSudo } from '../util/createSudo'
import {
  setupEmailClient,
  sudoIssuer,
  teardown,
} from '../util/emailClientLifecycle'
import { provisionEmailAddress } from '../util/provisionEmailAddress'
import { provisionEmailAlias } from '../util/provisionEmailAlias'
import { DateTime } from 'luxon'

describe('SudoEmailClient ListEmailAliases Test Suite', () => {
  const log = new DefaultLogger('SudoEmailClientIntegrationTests')

  const numAliases = 4
  const numSudos = 2

  let instanceUnderTest: SudoEmailClient
  let userClient: SudoUserClient
  let profilesClient: SudoProfilesClient
  let sudos: Sudo[] = []
  let provisionedEmailAddress: EmailAddress
  let provisionedAliases: EmailAlias[] = []
  let runTests = true
  let beforeAllComplete = false

  // All aliases are provisioned once here since provisioning is slow. Tests that
  // mutate an alias must restore its state before finishing.
  beforeAll(async () => {
    const result = await setupEmailClient(log)
    instanceUnderTest = result.emailClient
    userClient = result.userClient
    profilesClient = result.profilesClient

    const config = await instanceUnderTest.getConfigurationData()
    runTests = config.emailAliasesEnabled
    if (!runTests) {
      log.debug('Email aliases are not enabled, skipping tests')
      beforeAllComplete = true
      return
    }

    const { sudo: secondSudo, ownershipProofToken: secondProof } =
      await createSudo('emailIntegrationTest2', profilesClient)
    sudos = [result.sudo, secondSudo]
    const proofs = [result.ownershipProofToken, secondProof]

    provisionedEmailAddress = await provisionEmailAddress(
      result.ownershipProofToken,
      instanceUnderTest,
    )

    const expiresAt = DateTime.now().plus({ day: 1 }).toJSDate()
    // Two aliases for each Sudo
    for (let i = 0; i < numAliases; i++) {
      const alias = await provisionEmailAlias(
        proofs[i % numSudos],
        instanceUnderTest,
        {
          realAddress: provisionedEmailAddress.emailAddress,
          metadata: { index: i, purpose: 'testing' },
          expiresAt,
        },
      )
      provisionedAliases.push(alias)
    }

    beforeAllComplete = true
  })

  // afterAll(async () => {
  //   await Promise.all(
  //     provisionedAliases.map(async (alias) => {
  //       try {
  //         await instanceUnderTest.deprovisionEmailAlias({
  //           emailAliasId: alias.id,
  //         })
  //       } catch (err) {
  //         console.log(`Error deprovisioning email alias ${alias.id}: ${err}`)
  //       }
  //     }),
  //   )
  //   provisionedAliases = []

  //   await teardown(
  //     { emailAddresses: [provisionedEmailAddress], sudos },
  //     { emailClient: instanceUnderTest, profilesClient, userClient },
  //   )
  //   sudos = []
  // })

  function expectSetupComplete() {
    expect(beforeAllComplete).toBe(true)
  }

  it('returns empty list for a Sudo with no aliases', async () => {
    expectSetupComplete()
    if (!runTests) return

    const { sudo: emptySudo } = await createSudo(
      'emailIntegrationTestEmpty',
      profilesClient,
    )
    sudos.push(emptySudo)

    const result = await instanceUnderTest.listEmailAliases({
      sudoId: emptySudo.id,
    })

    expect(result.items).toHaveLength(0)
    expect(result.nextToken).toBeUndefined()
  })

  it('returns empty list for a non-existent sudoId', async () => {
    expectSetupComplete()
    if (!runTests) return

    const result = await instanceUnderTest.listEmailAliases({
      sudoId: 'nonExistentId',
    })

    expect(result.items).toHaveLength(0)
    expect(result.nextToken).toBeUndefined()
  })

  it('returns full list when passed no filters', async () => {
    expectSetupComplete()
    if (!runTests) return

    const result = await instanceUnderTest.listEmailAliases()

    expect(result.items).toHaveLength(numAliases)
    expect(result.nextToken).toBeUndefined()
    expect(result.items.map((a) => a.id).sort()).toEqual(
      provisionedAliases.map((a) => a.id).sort(),
    )

    const expected = provisionedAliases[0]
    const matched = result.items.find((a) => a.id === expected.id)
    expect(matched).toBeDefined()
    // The real address is not available from list endpoints
    const { realAddress, ...expectedProperties } = expected
    expect(matched).toEqual(expect.objectContaining(expectedProperties))
    expect(matched).not.toHaveProperty('realAddress')

    const sub = await userClient.getSubject()
    expect(matched?.owner).toStrictEqual(sub)
    expect(matched?.owners[0].issuer).toStrictEqual(sudoIssuer)
  })

  it('paginates properly', async () => {
    expectSetupComplete()
    if (!runTests) return

    const limit = 2
    const allItems: EmailAliasListItem[] = []
    let nextToken: string | undefined = undefined
    let numPages = 0
    do {
      const result: Awaited<ReturnType<SudoEmailClient['listEmailAliases']>> =
        await instanceUnderTest.listEmailAliases({ limit, nextToken })
      expect(result.items.length).toBeLessThanOrEqual(limit)
      allItems.push(...result.items)
      nextToken = result.nextToken
      numPages++
    } while (nextToken)

    expect(allItems).toHaveLength(numAliases)
    // No duplicates across pages
    expect(new Set(allItems.map((a) => a.id)).size).toBe(numAliases)
    expect(numPages).toBeGreaterThanOrEqual(2)
  })

  it('filters by status properly', async () => {
    expectSetupComplete()
    if (!runTests) return

    const aliasToDisable = provisionedAliases[0]
    try {
      await instanceUnderTest.disableEmailAlias({
        emailAliasId: aliasToDisable.id,
      })

      const equalResult = await instanceUnderTest.listEmailAliases({
        filter: { status: { equal: EmailAliasStatus.ENABLED } },
      })
      expect(equalResult.items).toHaveLength(numAliases - 1)
      expect(
        equalResult.items.every((a) => a.status === EmailAliasStatus.ENABLED),
      ).toBe(true)
      expect(equalResult.items.some((a) => a.id === aliasToDisable.id)).toBe(
        false,
      )

      const notEqualResult = await instanceUnderTest.listEmailAliases({
        filter: { status: { notEqual: EmailAliasStatus.ENABLED } },
      })
      expect(notEqualResult.items).toHaveLength(1)
      expect(notEqualResult.items[0].id).toStrictEqual(aliasToDisable.id)

      const oneOfResult = await instanceUnderTest.listEmailAliases({
        filter: { status: { oneOf: [EmailAliasStatus.ENABLED] } },
      })
      expect(oneOfResult.items).toHaveLength(numAliases - 1)
      expect(
        oneOfResult.items.every((a) => a.status === EmailAliasStatus.ENABLED),
      ).toBe(true)
      expect(oneOfResult.items.some((a) => a.id === aliasToDisable.id)).toBe(
        false,
      )

      const notOneOfResult = await instanceUnderTest.listEmailAliases({
        filter: { status: { notOneOf: [EmailAliasStatus.ENABLED] } },
      })
      expect(notOneOfResult.items).toHaveLength(1)
      expect(notOneOfResult.items[0].id).toStrictEqual(aliasToDisable.id)
      expect(notOneOfResult.items[0].status).toStrictEqual(
        EmailAliasStatus.DISABLED,
      )
    } finally {
      // Re-enable so other tests see the expected state
      await instanceUnderTest.enableEmailAlias({
        emailAliasId: aliasToDisable.id,
      })
    }
  })

  it('filters by sudoId properly', async () => {
    expectSetupComplete()
    if (!runTests) return

    const sudoId = sudos[0].id
    const expectedAliases = provisionedAliases.filter((a) =>
      a.owners.some((o) => o.id === sudoId),
    )
    expect(expectedAliases).toHaveLength(numAliases / numSudos)

    const result = await instanceUnderTest.listEmailAliases({ sudoId })

    expect(result.items).toHaveLength(numAliases / numSudos)
    expect(result.items.map((a) => a.id).sort()).toEqual(
      expectedAliases.map((a) => a.id).sort(),
    )
    expect(
      result.items.every((a) => a.owners.some((o) => o.id === sudoId)),
    ).toBe(true)
  })
})
