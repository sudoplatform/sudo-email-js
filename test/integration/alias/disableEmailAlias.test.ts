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

describe('SudoEmailClient DisableEmailAlias Test Suite', () => {
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

  it('disables an enabled email alias', async () => {
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
    emailAliases.push(emailAlias)

    expect(emailAlias.status).toStrictEqual(EmailAliasStatus.ENABLED)

    const disabledAlias = await instanceUnderTest.disableEmailAlias({
      emailAliasId: emailAlias.id,
    })

    expect(disabledAlias.id).toStrictEqual(emailAlias.id)
    expect(disabledAlias.status).toStrictEqual(EmailAliasStatus.DISABLED)
    expect(disabledAlias.aliasAddress).toStrictEqual(emailAlias.aliasAddress)
    expect(disabledAlias.realAddress).toStrictEqual(emailAlias.realAddress)
    expect(disabledAlias.version).toBeGreaterThan(emailAlias.version)

    const sub = await userClient.getSubject()
    expect(disabledAlias.owner).toStrictEqual(sub)
    expect(disabledAlias.owners[0].id).toStrictEqual(sudo.id)
    expect(disabledAlias.owners[0].issuer).toStrictEqual(sudoIssuer)
  })

  it('disabling an already disabled alias succeeds', async () => {
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
    emailAliases.push(emailAlias)

    // Disable once
    const disabledAlias = await instanceUnderTest.disableEmailAlias({
      emailAliasId: emailAlias.id,
    })
    expect(disabledAlias.status).toStrictEqual(EmailAliasStatus.DISABLED)

    // Disable again
    const stillDisabledAlias = await instanceUnderTest.disableEmailAlias({
      emailAliasId: emailAlias.id,
    })

    expect(stillDisabledAlias.id).toStrictEqual(emailAlias.id)
    expect(stillDisabledAlias.status).toStrictEqual(EmailAliasStatus.DISABLED)
  })
})
