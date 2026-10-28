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
import {
  EmailAddress,
  EmailAlias,
  EmailAliasStatus,
  InvalidAddressError,
  InvalidArgumentError,
  SudoEmailClient,
} from '../../../src'
import { secondsSinceEpoch } from '../../../src/private/util/date'
import {
  setupEmailClient,
  sudoIssuer,
  teardown,
} from '../util/emailClientLifecycle'
import { provisionEmailAddress } from '../util/provisionEmailAddress'
import { provisionEmailAlias } from '../util/provisionEmailAlias'

describe('SudoEmailClient UpdateEmailAlias Test Suite', async () => {
  const log = new DefaultLogger('SudoEmailClientIntegrationTests')

  let emailAliases: EmailAlias[] = []
  let provisionedEmailAddress: EmailAddress

  let instanceUnderTest: SudoEmailClient
  let userClient: SudoUserClient
  let profilesClient: SudoProfilesClient
  let sudo: Sudo
  let ownershipProofToken: string
  const result = await setupEmailClient(log)
  instanceUnderTest = result.emailClient
  const config = await instanceUnderTest.getConfigurationData()
  let runTests = config.emailAliasesEnabled

  beforeEach(async () => {
    if (runTests) {
      userClient = result.userClient
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

  describe.skipIf(!runTests)('running', () => {
    it('updates metadata successfully', async () => {
      const originalMetadata = { purpose: 'original', version: 1 }
      const emailAlias = await provisionEmailAlias(
        ownershipProofToken,
        instanceUnderTest,
        {
          metadata: originalMetadata,
          realAddress: provisionedEmailAddress.emailAddress,
        },
      )
      emailAliases.push(emailAlias)

      const updatedMetadata = { purpose: 'updated', version: 2, new: 'field' }
      const updatedAlias = await instanceUnderTest.updateEmailAlias({
        emailAliasId: emailAlias.id,
        metadata: updatedMetadata,
      })

      expect(updatedAlias.id).toStrictEqual(emailAlias.id)
      expect(updatedAlias.metadata).toEqual(updatedMetadata)
      expect(updatedAlias.version).toBeGreaterThan(emailAlias.version)
      expect(updatedAlias.status).toStrictEqual(EmailAliasStatus.ENABLED)

      const sub = await userClient.getSubject()
      expect(updatedAlias.owner).toStrictEqual(sub)
      expect(updatedAlias.owners[0].id).toStrictEqual(sudo.id)
      expect(updatedAlias.owners[0].issuer).toStrictEqual(sudoIssuer)
    })

    it('updates expiration date successfully', async () => {
      if (!runTests) {
        log.debug('Email Aliases not enabled. Skipping.')
        return
      }
      const originalExpiresAt = DateTime.now().plus({ days: 1 }).toJSDate()
      const emailAlias = await provisionEmailAlias(
        ownershipProofToken,
        instanceUnderTest,
        {
          expiresAt: originalExpiresAt,
          realAddress: provisionedEmailAddress.emailAddress,
        },
      )
      emailAliases.push(emailAlias)

      const newExpiresAt = DateTime.now().plus({ days: 7 }).toJSDate()
      const updatedAlias = await instanceUnderTest.updateEmailAlias({
        emailAliasId: emailAlias.id,
        expiresAt: newExpiresAt,
      })

      expect(updatedAlias.id).toStrictEqual(emailAlias.id)
      expect(updatedAlias.expiresAt).toBeDefined()
      expect(secondsSinceEpoch(updatedAlias.expiresAt!)).toEqual(
        secondsSinceEpoch(newExpiresAt),
      )
      expect(updatedAlias.version).toBeGreaterThan(emailAlias.version)
    })

    it('updates both metadata and expiration date', async () => {
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

      const newMetadata = { updated: 'both fields' }
      const newExpiresAt = DateTime.now().plus({ days: 14 }).toJSDate()
      const updatedAlias = await instanceUnderTest.updateEmailAlias({
        emailAliasId: emailAlias.id,
        metadata: newMetadata,
        expiresAt: newExpiresAt,
      })

      expect(updatedAlias.id).toStrictEqual(emailAlias.id)
      expect(updatedAlias.metadata).toEqual(newMetadata)
      expect(secondsSinceEpoch(updatedAlias.expiresAt!)).toEqual(
        secondsSinceEpoch(newExpiresAt),
      )
      expect(updatedAlias.version).toBeGreaterThan(emailAlias.version)
    })

    it('removes metadata by setting to null', async () => {
      if (!runTests) {
        log.debug('Email Aliases not enabled. Skipping.')
        return
      }
      const metadata = { toBeRemoved: 'yes' }
      const emailAlias = await provisionEmailAlias(
        ownershipProofToken,
        instanceUnderTest,
        {
          metadata,
          realAddress: provisionedEmailAddress.emailAddress,
        },
      )
      emailAliases.push(emailAlias)

      const expiry = DateTime.now().plus({ days: 14 }).toJSDate()
      const updatedExpiresAt = await instanceUnderTest.updateEmailAlias({
        emailAliasId: emailAlias.id,
        expiresAt: expiry,
      })

      expect(updatedExpiresAt.id).toStrictEqual(emailAlias.id)
      expect(updatedExpiresAt.metadata).toBeDefined()
      expect(updatedExpiresAt.metadata).toEqual(metadata)
      expect(updatedExpiresAt.version).toBeGreaterThan(emailAlias.version)
      expect(
        Math.floor(updatedExpiresAt.expiresAt?.getTime() ?? 0) / 1000,
      ).toBe(Math.floor(expiry.getTime() / 1000))

      const updatedAlias = await instanceUnderTest.updateEmailAlias({
        emailAliasId: emailAlias.id,
        metadata: null,
      })

      expect(updatedAlias.id).toStrictEqual(emailAlias.id)
      expect(updatedAlias.metadata).toBeUndefined()
      expect(updatedAlias.version).toBeGreaterThan(emailAlias.version)

      const aliasList = await instanceUnderTest.listEmailAliasesForOwner()
      const actualAlias = aliasList.items.find(
        (alias) => alias.id === emailAlias.id,
      )
      expect(actualAlias).toBeDefined()
      expect(actualAlias?.metadata).toBeUndefined()
    })

    it('removes expiration date by setting to null', async () => {
      if (!runTests) {
        log.debug('Email Aliases not enabled. Skipping.')
        return
      }
      const expiresAt = DateTime.now().plus({ days: 1 }).toJSDate()
      const emailAlias = await provisionEmailAlias(
        ownershipProofToken,
        instanceUnderTest,
        {
          expiresAt,
          realAddress: provisionedEmailAddress.emailAddress,
        },
      )
      emailAliases.push(emailAlias)

      const updatedAlias = await instanceUnderTest.updateEmailAlias({
        emailAliasId: emailAlias.id,
        expiresAt: null,
      })

      expect(updatedAlias.id).toStrictEqual(emailAlias.id)
      expect(updatedAlias.expiresAt).toBeUndefined()
      expect(updatedAlias.version).toBeGreaterThan(emailAlias.version)
    })

    it('handles multi-byte UTF-8 characters in metadata', async () => {
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

      const unicodeMetadata = {
        emoji: '🎉🔥',
        japanese: '日本語',
        description: 'Testing UTF-8 support 😎',
      }
      const updatedAlias = await instanceUnderTest.updateEmailAlias({
        emailAliasId: emailAlias.id,
        metadata: unicodeMetadata,
      })

      expect(updatedAlias.id).toStrictEqual(emailAlias.id)
      expect(updatedAlias.metadata).toEqual(unicodeMetadata)
    })

    describe.skipIf(!config.externalEmailAliasesEnabled)(
      'Updating external alias realAddress',
      () => {
        it('throws InvalidArgumentError if Alias is not external', async () => {
          const emailAlias = await provisionEmailAlias(
            ownershipProofToken,
            instanceUnderTest,
            {
              realAddress: provisionedEmailAddress.emailAddress,
            },
          )
          emailAliases.push(emailAlias)

          await expect(
            instanceUnderTest.updateEmailAlias({
              emailAliasId: emailAlias.id,
              realAddress: 'new@example.com',
            }),
          ).rejects.toBeInstanceOf(InvalidArgumentError)
        })

        it('throws InvalidAddressError if new address is not valid', async () => {
          const emailAlias = await provisionEmailAlias(
            ownershipProofToken,
            instanceUnderTest,
            {
              realAddress: 'test@sudoplatform.com',
            },
          )
          emailAliases.push(emailAlias)

          await expect(
            instanceUnderTest.updateEmailAlias({
              emailAliasId: emailAlias.id,
              realAddress: 'example.com',
            }),
          ).rejects.toBeInstanceOf(InvalidAddressError)
        })

        it('throws InvalidArgumentError if new address is internal', async () => {
          const emailAlias = await provisionEmailAlias(
            ownershipProofToken,
            instanceUnderTest,
            {
              realAddress: 'test@sudoplatform.com',
            },
          )
          emailAliases.push(emailAlias)

          await expect(
            instanceUnderTest.updateEmailAlias({
              emailAliasId: emailAlias.id,
              realAddress: provisionedEmailAddress.emailAddress,
            }),
          ).rejects.toBeInstanceOf(InvalidArgumentError)
        })

        it('successfully updates real address', async () => {
          const newAddress = 'new@example.com'
          const emailAlias = await provisionEmailAlias(
            ownershipProofToken,
            instanceUnderTest,
            {
              realAddress: 'test@sudoplatform.com',
            },
          )
          emailAliases.push(emailAlias)

          const updatedAlias = await instanceUnderTest.updateEmailAlias({
            emailAliasId: emailAlias.id,
            realAddress: newAddress,
          })

          expect(updatedAlias).toBeDefined()
          expect(updatedAlias.id).toBe(emailAlias.id)
          expect(updatedAlias.realAddress).toBe(newAddress)
        })
      },
    )
  })
})
