/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger } from '@sudoplatform/sudo-common'
import { SudoEntitlementsClient } from '@sudoplatform/sudo-entitlements'
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import {
  EmailAddress,
  EmailAlias,
  EmailAliasStatus,
  SudoEmailClient,
} from '../../../src'
import {
  setupEmailClient,
  sudoIssuer,
  teardown,
} from '../util/emailClientLifecycle'
import { provisionEmailAlias } from '../util/provisionEmailAlias'
import { provisionEmailAddress } from '../util/provisionEmailAddress'

describe('SudoEmailClient DeprovisionEmailAlias Test Suite', () => {
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

  it('returns expected output when deprovisioning', async () => {
    if (!runTests) {
      log.debug('Email Aliases not enabled. Skipping.')
      return
    }
    const emailAlias = await provisionEmailAlias(
      ownershipProofToken,
      instanceUnderTest,
      {
        realAddress: provisionedEmailAddress.emailAddress,
      },
    )

    const deprovisionedAlias = await instanceUnderTest.deprovisionEmailAlias({
      emailAliasId: emailAlias.id,
    })

    expect(deprovisionedAlias.id).toStrictEqual(emailAlias.id)
    expect(deprovisionedAlias.aliasAddress).toStrictEqual(
      emailAlias.aliasAddress,
    )
    expect(deprovisionedAlias.realAddress).toStrictEqual(emailAlias.realAddress)
    expect(deprovisionedAlias.status).toStrictEqual(EmailAliasStatus.ENABLED)
    expect(deprovisionedAlias.owner).toStrictEqual(emailAlias.owner)
    expect(deprovisionedAlias.version).toBeGreaterThanOrEqual(
      emailAlias.version,
    )

    const sub = await userClient.getSubject()
    expect(deprovisionedAlias.owner).toStrictEqual(sub)
    expect(deprovisionedAlias.owners[0].id).toStrictEqual(sudo.id)
    expect(deprovisionedAlias.owners[0].issuer).toStrictEqual(sudoIssuer)
  })

  it('successfully deprovisions alias with metadata', async () => {
    if (!runTests) {
      log.debug('Email Aliases not enabled. Skipping.')
      return
    }
    const metadata = { purpose: 'test', note: 'will be deprovisioned' }
    const emailAlias = await provisionEmailAlias(
      ownershipProofToken,
      instanceUnderTest,
      {
        metadata,
        realAddress: provisionedEmailAddress.emailAddress,
      },
    )

    const deprovisionedAlias = await instanceUnderTest.deprovisionEmailAlias({
      emailAliasId: emailAlias.id,
    })

    expect(deprovisionedAlias.id).toStrictEqual(emailAlias.id)
    expect(deprovisionedAlias.metadata).toEqual(metadata)
  })

  it('can deprovision multiple aliases', async () => {
    if (!runTests) {
      log.debug('Email Aliases not enabled. Skipping.')
      return
    }
    const emailAlias1 = await provisionEmailAlias(
      ownershipProofToken,
      instanceUnderTest,
      {
        realAddress: provisionedEmailAddress.emailAddress,
      },
    )

    const emailAlias2 = await provisionEmailAlias(
      ownershipProofToken,
      instanceUnderTest,
      {
        realAddress: provisionedEmailAddress.emailAddress,
      },
    )

    const deprovisioned1 = await instanceUnderTest.deprovisionEmailAlias({
      emailAliasId: emailAlias1.id,
    })
    const deprovisioned2 = await instanceUnderTest.deprovisionEmailAlias({
      emailAliasId: emailAlias2.id,
    })

    expect(deprovisioned1.id).toStrictEqual(emailAlias1.id)
    expect(deprovisioned2.id).toStrictEqual(emailAlias2.id)
    expect(deprovisioned1.id).not.toStrictEqual(deprovisioned2.id)
  })
})
