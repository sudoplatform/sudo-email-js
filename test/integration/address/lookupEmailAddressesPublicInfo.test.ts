/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger } from '@sudoplatform/sudo-common'
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import _ from 'lodash'
import { EmailAddress, LimitExceededError, SudoEmailClient } from '../../../src'
import { setupEmailClient, teardown } from '../util/emailClientLifecycle'
import { provisionEmailAddress } from '../util/provisionEmailAddress'

describe('SudoEmailClient LookupEmailAddressesPublicInfo Test Suite', () => {
  jest.setTimeout(240000)
  const log = new DefaultLogger(
    'SudoEmailClientIntegrationTests-LookupEmailAddressesPublicInfo',
  )

  let emailAddresses: EmailAddress[] = []

  let instanceUnderTest: SudoEmailClient
  let profilesClient: SudoProfilesClient
  let userClient: SudoUserClient
  let sudo: Sudo
  let sudoOwnershipProofToken: string

  let beforeEachComplete = false

  beforeEach(async () => {
    const result = await setupEmailClient(log)
    instanceUnderTest = result.emailClient
    profilesClient = result.profilesClient
    userClient = result.userClient
    sudo = result.sudo
    sudoOwnershipProofToken = result.ownershipProofToken

    beforeEachComplete = true
  })

  afterEach(async () => {
    beforeEachComplete = false

    await teardown(
      { emailAddresses, sudos: [sudo] },
      { emailClient: instanceUnderTest, profilesClient, userClient },
    )

    emailAddresses = []
  })

  function expectSetupComplete(): void {
    expect({ beforeEachComplete }).toEqual({ beforeEachComplete: true })
  }

  describe('lookupEmailAddressesPublicInfo', () => {
    it('returns public info for provided email addresses', async () => {
      expectSetupComplete()

      const emailAddress = await provisionEmailAddress(
        sudoOwnershipProofToken,
        instanceUnderTest,
      )
      emailAddresses.push(emailAddress)

      await expect(
        instanceUnderTest.lookupEmailAddressesPublicInfo({
          emailAddresses: emailAddresses.map(
            ({ emailAddress }) => emailAddress,
          ),
        }),
      ).resolves.toContainEqual({
        emailAddress: emailAddress.emailAddress,
        keyId: expect.any(String),
        publicKey: expect.any(String),
      })
    })
  })

  it('returns an empty array if email address not found', async () => {
    expectSetupComplete()

    await expect(
      instanceUnderTest.lookupEmailAddressesPublicInfo({
        emailAddresses: ['fake@email.com'],
      }),
    ).resolves.toEqual([])
  })

  it('throws a limit exceeded error if more than 50 email addresses are requested', async () => {
    expectSetupComplete()

    await expect(
      instanceUnderTest.lookupEmailAddressesPublicInfo({
        emailAddresses: Array(51).fill('fake@email.com'),
      }),
    ).rejects.toThrow(new LimitExceededError())
  })
})
