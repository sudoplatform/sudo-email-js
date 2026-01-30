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
import {
  EmailAddress,
  EmailMask,
  EmailMaskStatus,
  SudoEmailClient,
} from '../../../src'
import { secondsSinceEpoch } from '../../../src/private/util/date'
import {
  setupEmailClient,
  sudoIssuer,
  teardown,
} from '../util/emailClientLifecycle'
import { provisionEmailAddress } from '../util/provisionEmailAddress'
import { provisionEmailMask } from '../util/provisionEmailMask'

describe('SudoEmailClient UpdateEmailMask Test Suite', () => {
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

  it('updates metadata successfully', async () => {
    if (!runTests) {
      log.debug('Email Masks not enabled. Skipping.')
      return
    }
    const originalMetadata = { purpose: 'original', version: 1 }
    const emailMask = await provisionEmailMask(
      ownershipProofToken,
      instanceUnderTest,
      {
        metadata: originalMetadata,
        realAddress: provisionedEmailAddress.emailAddress,
      },
    )
    emailMasks.push(emailMask)

    const updatedMetadata = { purpose: 'updated', version: 2, new: 'field' }
    const updatedMask = await instanceUnderTest.updateEmailMask({
      emailMaskId: emailMask.id,
      metadata: updatedMetadata,
    })

    expect(updatedMask.id).toStrictEqual(emailMask.id)
    expect(updatedMask.metadata).toEqual(updatedMetadata)
    expect(updatedMask.version).toBeGreaterThan(emailMask.version)
    expect(updatedMask.status).toStrictEqual(EmailMaskStatus.ENABLED)

    const sub = await userClient.getSubject()
    expect(updatedMask.owner).toStrictEqual(sub)
    expect(updatedMask.owners[0].id).toStrictEqual(sudo.id)
    expect(updatedMask.owners[0].issuer).toStrictEqual(sudoIssuer)
  })

  it('updates expiration date successfully', async () => {
    if (!runTests) {
      log.debug('Email Masks not enabled. Skipping.')
      return
    }
    const originalExpiresAt = DateTime.now().plus({ days: 1 }).toJSDate()
    const emailMask = await provisionEmailMask(
      ownershipProofToken,
      instanceUnderTest,
      {
        expiresAt: originalExpiresAt,
        realAddress: provisionedEmailAddress.emailAddress,
      },
    )
    emailMasks.push(emailMask)

    const newExpiresAt = DateTime.now().plus({ days: 7 }).toJSDate()
    const updatedMask = await instanceUnderTest.updateEmailMask({
      emailMaskId: emailMask.id,
      expiresAt: newExpiresAt,
    })

    expect(updatedMask.id).toStrictEqual(emailMask.id)
    expect(updatedMask.expiresAt).toBeDefined()
    expect(secondsSinceEpoch(updatedMask.expiresAt!)).toEqual(
      secondsSinceEpoch(newExpiresAt),
    )
    expect(updatedMask.version).toBeGreaterThan(emailMask.version)
  })

  it('updates both metadata and expiration date', async () => {
    if (!runTests) {
      log.debug('Email Masks not enabled. Skipping.')
      return
    }
    const emailMask = await provisionEmailMask(
      ownershipProofToken,
      instanceUnderTest,
      {
        realAddress: provisionedEmailAddress.emailAddress,
      },
    )
    emailMasks.push(emailMask)

    const newMetadata = { updated: 'both fields' }
    const newExpiresAt = DateTime.now().plus({ days: 14 }).toJSDate()
    const updatedMask = await instanceUnderTest.updateEmailMask({
      emailMaskId: emailMask.id,
      metadata: newMetadata,
      expiresAt: newExpiresAt,
    })

    expect(updatedMask.id).toStrictEqual(emailMask.id)
    expect(updatedMask.metadata).toEqual(newMetadata)
    expect(secondsSinceEpoch(updatedMask.expiresAt!)).toEqual(
      secondsSinceEpoch(newExpiresAt),
    )
    expect(updatedMask.version).toBeGreaterThan(emailMask.version)
  })

  it('removes metadata by setting to null', async () => {
    if (!runTests) {
      log.debug('Email Masks not enabled. Skipping.')
      return
    }
    const metadata = { toBeRemoved: 'yes' }
    const emailMask = await provisionEmailMask(
      ownershipProofToken,
      instanceUnderTest,
      {
        metadata,
        realAddress: provisionedEmailAddress.emailAddress,
      },
    )
    emailMasks.push(emailMask)

    const expiry = DateTime.now().plus({ days: 14 }).toJSDate()
    const updatedExpiresAt = await instanceUnderTest.updateEmailMask({
      emailMaskId: emailMask.id,
      expiresAt: expiry,
    })

    expect(updatedExpiresAt.id).toStrictEqual(emailMask.id)
    expect(updatedExpiresAt.metadata).toBeDefined()
    expect(updatedExpiresAt.metadata).toEqual(metadata)
    expect(updatedExpiresAt.version).toBeGreaterThan(emailMask.version)
    expect(Math.floor(updatedExpiresAt.expiresAt?.getTime() ?? 0) / 1000).toBe(
      Math.floor(expiry.getTime() / 1000),
    )

    const updatedMask = await instanceUnderTest.updateEmailMask({
      emailMaskId: emailMask.id,
      metadata: null,
    })

    expect(updatedMask.id).toStrictEqual(emailMask.id)
    expect(updatedMask.metadata).toBeUndefined()
    expect(updatedMask.version).toBeGreaterThan(emailMask.version)

    const maskList = await instanceUnderTest.listEmailMasksForOwner()
    const actualMask = maskList.items.find((mask) => mask.id === emailMask.id)
    expect(actualMask).toBeDefined()
    expect(actualMask?.metadata).toBeUndefined()
  })

  it('removes expiration date by setting to null', async () => {
    if (!runTests) {
      log.debug('Email Masks not enabled. Skipping.')
      return
    }
    const expiresAt = DateTime.now().plus({ days: 1 }).toJSDate()
    const emailMask = await provisionEmailMask(
      ownershipProofToken,
      instanceUnderTest,
      {
        expiresAt,
        realAddress: provisionedEmailAddress.emailAddress,
      },
    )
    emailMasks.push(emailMask)

    const updatedMask = await instanceUnderTest.updateEmailMask({
      emailMaskId: emailMask.id,
      expiresAt: null,
    })

    expect(updatedMask.id).toStrictEqual(emailMask.id)
    expect(updatedMask.expiresAt).toBeUndefined()
    expect(updatedMask.version).toBeGreaterThan(emailMask.version)
  })

  it('handles multi-byte UTF-8 characters in metadata', async () => {
    if (!runTests) {
      log.debug('Email Masks not enabled. Skipping.')
      return
    }
    const emailMask = await provisionEmailMask(
      ownershipProofToken,
      instanceUnderTest,
      {
        realAddress: provisionedEmailAddress.emailAddress,
      },
    )
    emailMasks.push(emailMask)

    const unicodeMetadata = {
      emoji: '🎉🔥',
      japanese: '日本語',
      description: 'Testing UTF-8 support 😎',
    }
    const updatedMask = await instanceUnderTest.updateEmailMask({
      emailMaskId: emailMask.id,
      metadata: unicodeMetadata,
    })

    expect(updatedMask.id).toStrictEqual(emailMask.id)
    expect(updatedMask.metadata).toEqual(unicodeMetadata)
  })
})
