/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger } from '@sudoplatform/sudo-common'
import {
  BatchOperationResultStatus,
  EmailAddress,
  SudoEmailClient,
} from '../../../src'
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import { setupEmailClient, teardown } from '../util/emailClientLifecycle'
import {
  generateSafeLocalPart,
  provisionEmailAddress,
} from '../util/provisionEmailAddress'

describe('SudoEmailClient Email Blocklist Integration Test Suite', () => {
  jest.setTimeout(240000)
  const log = new DefaultLogger('SudoEmailClientIntegrationTests')

  let instanceUnderTest: SudoEmailClient
  let profilesClient: SudoProfilesClient
  let userClient: SudoUserClient
  let sudo: Sudo
  let sudoOwnershipProofToken: string
  let receivingEmailAddress: EmailAddress
  let blockedEmailAddress1: EmailAddress
  let blockedEmailAddress2: EmailAddress

  beforeEach(async () => {
    const result = await setupEmailClient(log)
    instanceUnderTest = result.emailClient
    profilesClient = result.profilesClient
    userClient = result.userClient
    sudo = result.sudo
    sudoOwnershipProofToken = result.ownershipProofToken
    receivingEmailAddress = await provisionEmailAddress(
      sudoOwnershipProofToken,
      instanceUnderTest,
      {
        localPart: generateSafeLocalPart('receiver'),
      },
    )
    blockedEmailAddress1 = await provisionEmailAddress(
      sudoOwnershipProofToken,
      instanceUnderTest,
      {
        localPart: generateSafeLocalPart('sender'),
      },
    )
    blockedEmailAddress2 = await provisionEmailAddress(
      sudoOwnershipProofToken,
      instanceUnderTest,
      {
        localPart: generateSafeLocalPart('sender'),
      },
    )
  })

  afterEach(async () => {
    await teardown(
      {
        emailAddresses: [
          blockedEmailAddress1,
          blockedEmailAddress2,
          receivingEmailAddress,
        ],
        sudos: [sudo],
      },
      { emailClient: instanceUnderTest, profilesClient, userClient },
    )
  })

  it('Should allow user to block and unblock email addresses and look up the blocklist', async () => {
    const expectedlyEmptyBlocklistResult =
      await instanceUnderTest.getEmailAddressBlocklist({
        owner: receivingEmailAddress.owner,
      })

    expect(expectedlyEmptyBlocklistResult).toHaveLength(0)

    const blockingResult = await instanceUnderTest.blockEmailAddresses({
      owner: receivingEmailAddress.owner,
      addresses: [
        blockedEmailAddress1.emailAddress,
        blockedEmailAddress2.emailAddress,
      ],
    })

    expect(blockingResult.status).toEqual(BatchOperationResultStatus.Success)

    const expectedlyFullBlocklist =
      await instanceUnderTest.getEmailAddressBlocklist({
        owner: receivingEmailAddress.owner,
      })

    expect(expectedlyFullBlocklist).toHaveLength(2)
    expect(expectedlyFullBlocklist).toEqual([
      blockedEmailAddress1.emailAddress,
      blockedEmailAddress2.emailAddress,
    ])

    const unblockingResult = await instanceUnderTest.unblockEmailAddresses({
      owner: receivingEmailAddress.owner,
      addresses: [
        blockedEmailAddress1.emailAddress,
        blockedEmailAddress2.emailAddress,
      ],
    })

    expect(unblockingResult.status).toEqual(BatchOperationResultStatus.Success)

    const expectedlyAlsoEmptyBlocklistResult =
      await instanceUnderTest.getEmailAddressBlocklist({
        owner: receivingEmailAddress.owner,
      })

    expect(expectedlyAlsoEmptyBlocklistResult).toHaveLength(0)
  })

  it('Should treat unblocking addresses that are not blocked as success', async () => {
    const unblockingResult = await instanceUnderTest.unblockEmailAddresses({
      owner: receivingEmailAddress.owner,
      addresses: [
        blockedEmailAddress1.emailAddress,
        blockedEmailAddress2.emailAddress,
      ],
    })

    expect(unblockingResult.status).toEqual(BatchOperationResultStatus.Success)
  })

  it('Should treat blocking addresses that are already blocked as success', async () => {
    const blockingResult = await instanceUnderTest.blockEmailAddresses({
      owner: receivingEmailAddress.owner,
      addresses: [
        blockedEmailAddress1.emailAddress,
        blockedEmailAddress2.emailAddress,
      ],
    })

    expect(blockingResult.status).toEqual(BatchOperationResultStatus.Success)

    const blockingResult2 = await instanceUnderTest.blockEmailAddresses({
      owner: receivingEmailAddress.owner,
      addresses: [
        blockedEmailAddress1.emailAddress,
        blockedEmailAddress2.emailAddress,
      ],
    })

    expect(blockingResult2.status).toEqual(BatchOperationResultStatus.Success)
  })
})
