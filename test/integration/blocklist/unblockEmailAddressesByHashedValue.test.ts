/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Base64, DefaultLogger } from '@sudoplatform/sudo-common'
import { SudoProfilesClient, Sudo } from '@sudoplatform/sudo-profiles'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import {
  BatchOperationResultStatus,
  EmailAddress,
  SudoEmailClient,
} from '../../../src'
import { setupEmailClient, teardown } from '../util/emailClientLifecycle'
import {
  provisionEmailAddress,
  generateSafeLocalPart,
} from '../util/provisionEmailAddress'
import { v4 } from 'uuid'
import waitForExpect from 'wait-for-expect'

describe('SudoEmailClient Unblock Email Addresses By Hashed Value Integration Test Suite', () => {
  jest.setTimeout(240000)
  const log = new DefaultLogger('SudoEmailClientIntegrationTests')
  const dummyAddress = 'spammymcspamface@spambot.com'

  let instanceUnderTest: SudoEmailClient
  let profilesClient: SudoProfilesClient
  let userClient: SudoUserClient
  let sudo: Sudo
  let sudoOwnershipProofToken: string
  let emailAddresses: EmailAddress[] = []
  let receiverAddress: EmailAddress
  let senderAddress: EmailAddress

  beforeEach(async () => {
    const result = await setupEmailClient(log)
    instanceUnderTest = result.emailClient
    profilesClient = result.profilesClient
    userClient = result.userClient
    sudo = result.sudo
    sudoOwnershipProofToken = result.ownershipProofToken
    receiverAddress = await provisionEmailAddress(
      sudoOwnershipProofToken,
      instanceUnderTest,
      {
        localPart: generateSafeLocalPart('unblock-test-receiver'),
      },
    )
    emailAddresses.push(receiverAddress)
    senderAddress = await provisionEmailAddress(
      sudoOwnershipProofToken,
      instanceUnderTest,
      {
        localPart: generateSafeLocalPart('unblock-test-sender'),
      },
    )
    emailAddresses.push(senderAddress)
  })

  afterEach(async () => {
    const blocklist = await instanceUnderTest.getEmailAddressBlocklist()
    if (blocklist.length) {
      await instanceUnderTest.unblockEmailAddressesByHashedValue({
        hashedValues: blocklist.map((entry) => entry.hashedBlockedValue),
      })
    }
    await teardown(
      {
        emailAddresses,
        sudos: [sudo],
      },
      { emailClient: instanceUnderTest, profilesClient, userClient },
    )
  })

  const blockEmailAddresses = async (
    addresses: string[],
    blockingAddressId?: string,
  ) => {
    expect(
      await instanceUnderTest.blockEmailAddresses({
        addressesToBlock: addresses,
        emailAddressId: blockingAddressId,
      }),
    ).toEqual({ status: BatchOperationResultStatus.Success })
  }

  const sendMessage = async (
    sender: EmailAddress,
    receiverEmail: string,
    subject?: string,
  ): Promise<string> => {
    const result = await instanceUnderTest.sendEmailMessage({
      senderEmailAddressId: sender.id,
      emailMessageHeader: {
        from: { emailAddress: sender.emailAddress },
        to: [{ emailAddress: receiverEmail }],
        cc: [],
        bcc: [],
        replyTo: [],
        subject: subject ?? '',
      },
      body: 'Hello, World!',
      attachments: [],
      inlineAttachments: [],
    })
    return result.id
  }

  it('Should successfully unblock a single address', async () => {
    await blockEmailAddresses([senderAddress.emailAddress])

    const blocklist = await instanceUnderTest.getEmailAddressBlocklist()

    const unblockingResult =
      await instanceUnderTest.unblockEmailAddressesByHashedValue({
        hashedValues: blocklist.map((e) => e.hashedBlockedValue),
      })

    expect(unblockingResult.status).toEqual(BatchOperationResultStatus.Success)
  })

  it('Should successfully unblock multiple addresses', async () => {
    await blockEmailAddresses([senderAddress.emailAddress, dummyAddress])

    const blocklist = await instanceUnderTest.getEmailAddressBlocklist()

    const unblockingResult =
      await instanceUnderTest.unblockEmailAddressesByHashedValue({
        hashedValues: blocklist.map((e) => e.hashedBlockedValue),
      })

    expect(unblockingResult.status).toEqual(BatchOperationResultStatus.Success)
  })

  it('Should successfully unblock an address blocked by email address id', async () => {
    await blockEmailAddresses([senderAddress.emailAddress], senderAddress.id)

    const blocklist = await instanceUnderTest.getEmailAddressBlocklist()

    const unblockingResult =
      await instanceUnderTest.unblockEmailAddressesByHashedValue({
        hashedValues: blocklist.map((e) => e.hashedBlockedValue),
      })

    expect(unblockingResult.status).toEqual(BatchOperationResultStatus.Success)
  })

  it('Should treat unblocking addresses that are not blocked as success', async () => {
    const unblockingResult =
      await instanceUnderTest.unblockEmailAddressesByHashedValue({
        hashedValues: [Base64.encodeString(v4())],
      })

    expect(unblockingResult.status).toEqual(BatchOperationResultStatus.Success)
  })

  it('Should allow messages to be received once sender has been unblocked', async () => {
    await blockEmailAddresses([senderAddress.emailAddress])

    const blocklist = await instanceUnderTest.getEmailAddressBlocklist()

    const unblockingResult =
      await instanceUnderTest.unblockEmailAddressesByHashedValue({
        hashedValues: blocklist.map((e) => e.hashedBlockedValue),
      })

    expect(unblockingResult.status).toEqual(BatchOperationResultStatus.Success)

    const sentMessageId = await sendMessage(
      senderAddress,
      receiverAddress.emailAddress,
    )
    expect(sentMessageId).toBeDefined()

    let sentMessage
    await waitForExpect(async () => {
      sentMessage = await instanceUnderTest.getEmailMessage({
        id: sentMessageId,
      })
      expect(sentMessage).toBeDefined()
    })
  })
})
