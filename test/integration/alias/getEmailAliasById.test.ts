/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger } from '@sudoplatform/sudo-common'
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import { v4 } from 'uuid'
import {
  EmailAddress,
  EmailAlias,
  EmailAliasNotFoundError,
  EmailAliasRealAddressType,
  EmailAliasStatus,
  SudoEmailClient,
} from '../../../src'
import {
  setupEmailClient,
  sudoIssuer,
  teardown,
} from '../util/emailClientLifecycle'
import { provisionEmailAddress } from '../util/provisionEmailAddress'
import { provisionEmailAlias } from '../util/provisionEmailAlias'

describe('SudoEmailClient GetEmailAliasById Test Suite', () => {
  const log = new DefaultLogger('SudoEmailClientIntegrationTests')

  const metadata = { purpose: 'testing', environment: 'integration' }

  let instanceUnderTest: SudoEmailClient
  let userClient: SudoUserClient
  let profilesClient: SudoProfilesClient
  let sudo: Sudo
  let provisionedEmailAddress: EmailAddress
  let provisionedAlias: EmailAlias
  let runTests = true
  let beforeAllComplete = false

  beforeAll(async () => {
    const result = await setupEmailClient(log)
    instanceUnderTest = result.emailClient
    userClient = result.userClient
    profilesClient = result.profilesClient
    sudo = result.sudo

    const config = await instanceUnderTest.getConfigurationData()
    runTests = config.emailAliasesEnabled
    if (!runTests) {
      log.debug('Email aliases are not enabled, skipping tests')
      beforeAllComplete = true
      return
    }

    provisionedEmailAddress = await provisionEmailAddress(
      result.ownershipProofToken,
      instanceUnderTest,
    )
    provisionedAlias = await provisionEmailAlias(
      result.ownershipProofToken,
      instanceUnderTest,
      { realAddress: provisionedEmailAddress.emailAddress, metadata },
    )

    beforeAllComplete = true
  })

  afterAll(async () => {
    if (provisionedAlias) {
      try {
        await instanceUnderTest.deprovisionEmailAlias({
          emailAliasId: provisionedAlias.id,
        })
      } catch (err) {
        console.log(
          `Error deprovisioning email alias ${provisionedAlias.id}: ${err}`,
        )
      }
    }

    await teardown(
      { emailAddresses: [provisionedEmailAddress], sudos: [sudo] },
      { emailClient: instanceUnderTest, profilesClient, userClient },
    )
  })

  function expectSetupComplete() {
    expect(beforeAllComplete).toBe(true)
  }

  it('returns the provisioned email alias', async () => {
    expectSetupComplete()
    if (!runTests) return

    const result = await instanceUnderTest.getEmailAliasById({
      id: provisionedAlias.id,
    })

    expect(result).toStrictEqual(provisionedAlias)
    expect(result.id).toStrictEqual(provisionedAlias.id)
    expect(result.aliasAddress).toStrictEqual(provisionedAlias.aliasAddress)
    expect(result.realAddress).toStrictEqual(
      provisionedEmailAddress.emailAddress,
    )
    expect(result.realAddressType).toStrictEqual(
      EmailAliasRealAddressType.INTERNAL,
    )
    expect(result.status).toStrictEqual(EmailAliasStatus.ENABLED)
    expect(result.createdAt.getTime()).toBeGreaterThan(0)
    expect(result.updatedAt.getTime()).toBeGreaterThan(0)

    const sub = await userClient.getSubject()
    expect(result.owner).toStrictEqual(sub)
    expect(result.owners[0].id).toStrictEqual(sudo.id)
    expect(result.owners[0].issuer).toStrictEqual(sudoIssuer)

    expect(result.metadata).toEqual(metadata)
  })

  it('throws EmailAliasNotFoundError for a non-existent alias', async () => {
    expectSetupComplete()
    if (!runTests) return

    await expect(
      instanceUnderTest.getEmailAliasById({ id: v4() }),
    ).rejects.toThrow(EmailAliasNotFoundError)
  })
})
