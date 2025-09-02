/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger } from '@sudoplatform/sudo-common'
import {
  BatchOperationResultStatus,
  BlockedEmailAddressAction,
  BlockedEmailAddressLevel,
  EmailAddress,
  SudoEmailClient,
  UnsealedBlockedAddress,
  UnsealedBlockedAddressStatus,
} from '../../../src'
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import { setupEmailClient, teardown } from '../util/emailClientLifecycle'
import {
  generateSafeLocalPart,
  provisionEmailAddress,
} from '../util/provisionEmailAddress'
import { v4 } from 'uuid'

describe('SudoEmailClient Get Email Address Blocklist Integration Test Suite', () => {
  jest.setTimeout(240000)
  const log = new DefaultLogger('SudoEmailClientIntegrationTests')

  let instanceUnderTest: SudoEmailClient
  let profilesClient: SudoProfilesClient
  let userClient: SudoUserClient
  let sudo: Sudo
  let sudoOwnershipProofToken: string
  let emailAddress: EmailAddress

  beforeAll(async () => {
    const result = await setupEmailClient(log)
    instanceUnderTest = result.emailClient
    profilesClient = result.profilesClient
    userClient = result.userClient
    sudo = result.sudo
    sudoOwnershipProofToken = result.ownershipProofToken
    emailAddress = await provisionEmailAddress(
      sudoOwnershipProofToken,
      instanceUnderTest,
      {
        localPart: generateSafeLocalPart('get-blocklist-test'),
      },
    )
  })

  afterAll(async () => {
    await teardown(
      {
        emailAddresses: [emailAddress],
        sudos: [sudo],
      },
      { emailClient: instanceUnderTest, profilesClient, userClient },
    )
  })

  afterEach(async () => {
    const blocklist = await instanceUnderTest.getEmailAddressBlocklist()
    if (blocklist.length) {
      await instanceUnderTest.unblockEmailAddressesByHashedValue({
        hashedValues: blocklist.map((entry) => entry.hashedBlockedValue),
      })
    }
  })

  const blockEmailAddresses = async (addresses: string[]) => {
    expect(
      await instanceUnderTest.blockEmailAddresses({
        addressesToBlock: addresses,
      }),
    ).toEqual({ status: BatchOperationResultStatus.Success })
  }

  it('Should return empty list if no addresses have been blocked', async () => {
    const result = await instanceUnderTest.getEmailAddressBlocklist()
    expect(result).toEqual([])
  })

  it('Should return a single address if only one has been blocked', async () => {
    const address = `spammer${v4()}@spambot.com`
    await blockEmailAddresses([address])
    const result = await instanceUnderTest.getEmailAddressBlocklist()
    expect(result).toHaveLength(1)
    expect(result[0].address).toEqual(address)
    expect(result[0].action).toEqual(BlockedEmailAddressAction.DROP)
    expect(result[0].hashedBlockedValue).toBeDefined()
    expect(result[0].status.type).toEqual('Completed')
  })

  it('Should return all addresses that have been blocked', async () => {
    const addresses = [
      `spammer${v4()}@spambot.com`,
      `spammer${v4()}@spambot.com`,
      `spammer${v4()}@spambot.com`,
    ]
    await blockEmailAddresses(addresses)
    const result = await instanceUnderTest.getEmailAddressBlocklist()
    expect(result).toHaveLength(addresses.length)
    addresses.forEach((address) => {
      expect(result).toContainEqual({
        address,
        action: BlockedEmailAddressAction.DROP,
        hashedBlockedValue: expect.any(String),
        status: { type: 'Completed' },
      })
    })
  })

  it('Should not return a blocked address if it has been unblocked', async () => {
    const addresses = [
      `spammer${v4()}@spambot.com`,
      `spammer${v4()}@spambot.com`,
      `spammer${v4()}@spambot.com`,
    ]
    await blockEmailAddresses(addresses)
    let preUnblockResult = await instanceUnderTest.getEmailAddressBlocklist()
    expect(preUnblockResult).toHaveLength(addresses.length)
    const addressToUnblock = addresses[1]
    expect(
      await instanceUnderTest.unblockEmailAddresses({
        addresses: [addressToUnblock],
      }),
    ).toEqual({ status: BatchOperationResultStatus.Success })
    const postUnblockResult = await instanceUnderTest.getEmailAddressBlocklist()
    expect(postUnblockResult).toHaveLength(addresses.length - 1)
    expect(
      postUnblockResult.find((result) => result.address === addressToUnblock),
    ).toBeUndefined()
  })

  it('Properly returns an address blocked at domain level', async () => {
    const domain = 'spambot.com'
    const address = `spammer${v4()}@${domain}`
    expect(
      await instanceUnderTest.blockEmailAddresses({
        addressesToBlock: [address],
        blockLevel: BlockedEmailAddressLevel.DOMAIN,
      }),
    ).toEqual({ status: BatchOperationResultStatus.Success })
    const result = await instanceUnderTest.getEmailAddressBlocklist()
    expect(result).toHaveLength(1)
    expect(result[0].address).toEqual(domain)
    expect(result[0].action).toEqual(BlockedEmailAddressAction.DROP)
    expect(result[0].hashedBlockedValue).toBeDefined()
    expect(result[0].status.type).toEqual('Completed')
  })
})
