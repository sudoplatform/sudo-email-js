/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
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
  ConfigurationData,
  EmailAddress,
  EmailAlias,
  EmailAliasRealAddressType,
  EmailAliasStatus,
  InvalidArgumentError,
  SudoEmailClient,
} from '../../../src'
import { secondsSinceEpoch } from '../../../src/private/util/date'
import {
  getEmailAliasDomains,
  setupEmailClient,
  sudoIssuer,
  teardown,
} from '../util/emailClientLifecycle'
import {
  generateSafeLocalPart,
  provisionEmailAddress,
} from '../util/provisionEmailAddress'

describe('SudoEmailClient ProvisionEmailAlias Test Suite', () => {
  const log = new DefaultLogger('SudoEmailClientIntegrationTests')

  let emailAddresses: EmailAddress[] = []
  let emailAliases: EmailAlias[] = []

  let instanceUnderTest: SudoEmailClient
  let userClient: SudoUserClient
  let entitlementsClient: SudoEntitlementsClient
  let profilesClient: SudoProfilesClient
  let sudo: Sudo
  let ownershipProofToken: string
  let aliasDomain: string
  let runTests = true
  let config: ConfigurationData

  beforeEach(async () => {
    const result = await setupEmailClient(log)
    instanceUnderTest = result.emailClient
    config = await instanceUnderTest.getConfigurationData()
    runTests = config.emailAliasesEnabled
    if (runTests) {
      userClient = result.userClient
      entitlementsClient = result.entitlementsClient
      profilesClient = result.profilesClient
      sudo = result.sudo
      ownershipProofToken = result.ownershipProofToken
      aliasDomain = (await getEmailAliasDomains(result.emailClient))[0]
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
      { emailAddresses, sudos: [sudo] },
      { emailClient: instanceUnderTest, profilesClient, userClient },
    )
    emailAddresses = []
  })

  it('returns expected output with internal real address', async () => {
    if (!runTests) {
      log.debug('Email Aliases not enabled. Skipping.')
      return
    }
    const realEmailAddress = await provisionEmailAddress(
      ownershipProofToken,
      instanceUnderTest,
    )
    emailAddresses.push(realEmailAddress)

    const aliasAddress = `${generateSafeLocalPart()}@${aliasDomain}`
    const metadata = { purpose: 'testing', environment: 'integration' }
    const expiresAt = DateTime.now().plus({ days: 1 }).toJSDate() // 1 day from now

    const emailAlias = await instanceUnderTest.provisionEmailAlias({
      aliasAddress,
      realAddress: realEmailAddress.emailAddress,
      ownershipProofToken,
      metadata,
      expiresAt,
    })
    emailAliases.push(emailAlias)

    expect(emailAlias.id).toBeDefined()
    expect(emailAlias.aliasAddress).toStrictEqual(aliasAddress)
    expect(emailAlias.realAddress).toStrictEqual(realEmailAddress.emailAddress)
    expect(emailAlias.realAddressType).toStrictEqual(
      EmailAliasRealAddressType.INTERNAL,
    )
    expect(emailAlias.status).toStrictEqual(EmailAliasStatus.ENABLED)

    const sub = await userClient.getSubject()
    expect(emailAlias.owner).toStrictEqual(sub)
    expect(emailAlias.owners[0].id).toStrictEqual(sudo.id)
    expect(emailAlias.owners[0].issuer).toStrictEqual(sudoIssuer)

    expect(emailAlias.identityId).toBeDefined()
    expect(emailAlias.version).toStrictEqual(0)

    // Check counters are initialized to zero
    expect(emailAlias.inboundReceived).toStrictEqual(0)
    expect(emailAlias.inboundDelivered).toStrictEqual(0)
    expect(emailAlias.outboundReceived).toStrictEqual(0)
    expect(emailAlias.outboundDelivered).toStrictEqual(0)
    expect(emailAlias.spamCount).toStrictEqual(0)
    expect(emailAlias.virusCount).toStrictEqual(0)

    // Check metadata and expiration
    expect(emailAlias.metadata).toEqual(metadata)
    expect(emailAlias.expiresAt).toBeDefined()
    expect(secondsSinceEpoch(emailAlias.expiresAt!)).toEqual(
      secondsSinceEpoch(expiresAt),
    )
  })

  it('handles attempts to provision alias with external real address appropriately', async () => {
    if (!runTests) {
      log.debug('Email Aliases not enabled. Skipping.')
      return
    }
    const aliasAddress = `${generateSafeLocalPart()}@${aliasDomain}`
    const externalRealAddress = `${v4()}@anonyome.com`

    if (!config.externalEmailAliasesEnabled) {
      await expect(
        instanceUnderTest.provisionEmailAlias({
          aliasAddress,
          realAddress: externalRealAddress,
          ownershipProofToken,
        }),
      ).rejects.toThrow(InvalidArgumentError)
    } else {
      const aliasAddress = `${generateSafeLocalPart()}@${aliasDomain}`

      const emailAlias = await instanceUnderTest.provisionEmailAlias({
        aliasAddress,
        realAddress: externalRealAddress,
        ownershipProofToken,
      })
      emailAliases.push(emailAlias)

      expect(emailAlias.id).toBeDefined()
      expect(emailAlias.aliasAddress).toStrictEqual(aliasAddress)
      expect(emailAlias.realAddress).toStrictEqual(externalRealAddress)
      expect(emailAlias.status).toStrictEqual(EmailAliasStatus.PENDING)
      expect(emailAlias.realAddressType).toStrictEqual(
        EmailAliasRealAddressType.EXTERNAL,
      )
      expect(emailAlias.metadata).toBeUndefined()
      expect(emailAlias.expiresAt).toBeUndefined()
    }
  })

  it('provisions a alias without optional metadata and expiration', async () => {
    if (!runTests) {
      log.debug('Email Aliases not enabled. Skipping.')
      return
    }
    const realEmailAddress = await provisionEmailAddress(
      ownershipProofToken,
      instanceUnderTest,
    )
    emailAddresses.push(realEmailAddress)

    const aliasAddress = `${generateSafeLocalPart()}@${aliasDomain}`

    const emailAlias = await instanceUnderTest.provisionEmailAlias({
      aliasAddress,
      realAddress: realEmailAddress.emailAddress,
      ownershipProofToken,
    })
    emailAliases.push(emailAlias)

    expect(emailAlias.id).toBeDefined()
    expect(emailAlias.aliasAddress).toStrictEqual(aliasAddress)
    expect(emailAlias.realAddress).toStrictEqual(realEmailAddress.emailAddress)
    expect(emailAlias.status).toStrictEqual(EmailAliasStatus.ENABLED)
    expect(emailAlias.metadata).toBeUndefined()
    expect(emailAlias.expiresAt).toBeUndefined()
  })

  it('provisions a alias with multi-byte UTF-8 characters in metadata', async () => {
    if (!runTests) {
      log.debug('Email Aliases not enabled. Skipping.')
      return
    }
    const realEmailAddress = await provisionEmailAddress(
      ownershipProofToken,
      instanceUnderTest,
    )
    emailAddresses.push(realEmailAddress)

    const aliasAddress = `${generateSafeLocalPart()}@${aliasDomain}`
    const metadata = {
      emoji: '😎🎉',
      unicode: '日本語',
      description: 'Test with UTF-8 🔥',
    }

    const emailAlias = await instanceUnderTest.provisionEmailAlias({
      aliasAddress,
      realAddress: realEmailAddress.emailAddress,
      ownershipProofToken,
      metadata,
    })
    emailAliases.push(emailAlias)

    expect(emailAlias.id).toBeDefined()
    expect(emailAlias.metadata).toEqual(metadata)
  })

  it('can provision multiple email aliases', async () => {
    if (!runTests) {
      log.debug('Email Aliases not enabled. Skipping.')
      return
    }
    const realEmailAddress = await provisionEmailAddress(
      ownershipProofToken,
      instanceUnderTest,
    )
    emailAddresses.push(realEmailAddress)

    const aliasAddress1 = `${generateSafeLocalPart()}@${aliasDomain}`
    const aliasAddress2 = `${generateSafeLocalPart()}@${aliasDomain}`

    const emailAlias1 = await instanceUnderTest.provisionEmailAlias({
      aliasAddress: aliasAddress1,
      realAddress: realEmailAddress.emailAddress,
      ownershipProofToken,
    })

    const emailAlias2 = await instanceUnderTest.provisionEmailAlias({
      aliasAddress: aliasAddress2,
      realAddress: realEmailAddress.emailAddress,
      ownershipProofToken,
    })

    emailAliases.push(emailAlias1, emailAlias2)

    expect(emailAlias1.id).not.toStrictEqual(emailAlias2.id)
    expect(emailAlias1.aliasAddress).toStrictEqual(aliasAddress1)
    expect(emailAlias2.aliasAddress).toStrictEqual(aliasAddress2)
    expect(emailAlias1.realAddress).toStrictEqual(emailAlias2.realAddress)
    expect(emailAlias1.owner).toStrictEqual(emailAlias2.owner)
    expect(emailAlias1.owners[0].id).toStrictEqual(emailAlias2.owners[0].id)
  })
})
