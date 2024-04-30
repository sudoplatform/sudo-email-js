/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CachePolicy,
  DefaultLogger,
  ListOperationResultStatus,
} from '@sudoplatform/sudo-common'
import {
  BatchOperationResultStatus,
  EmailAddress,
  ListEmailMessagesResult,
  SudoEmailClient,
  UnsealedBlockedAddress,
} from '../../../src'
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import { setupEmailClient, teardown } from '../util/emailClientLifecycle'
import {
  generateSafeLocalPart,
  provisionEmailAddress,
} from '../util/provisionEmailAddress'
import waitForExpect from 'wait-for-expect'
import { getFolderByName } from '../util/folder'

describe('SudoEmailClient Email Blocklist Integration Test Suite', () => {
  jest.setTimeout(240000)
  const log = new DefaultLogger('SudoEmailClientIntegrationTests')
  const ootoSimulatorAddress = 'ooto@simulator.amazonses.com'
  const mailerDaemonAddress = 'MAILER-DAEMON@amazonses.com'
  const dummyAddress = 'spammymcspamface@spambot.com'

  let instanceUnderTest: SudoEmailClient
  let profilesClient: SudoProfilesClient
  let userClient: SudoUserClient
  let sudo: Sudo
  let sudoOwnershipProofToken: string
  let emailAddress: EmailAddress

  beforeEach(async () => {
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
        localPart: generateSafeLocalPart('receiver'),
      },
    )
  })

  afterEach(async () => {
    await teardown(
      {
        emailAddresses: [emailAddress],
        sudos: [sudo],
      },
      { emailClient: instanceUnderTest, profilesClient, userClient },
    )
  })

  const sendMessage = async (
    sender: EmailAddress,
    receiverEmail: string = ootoSimulatorAddress,
    subject?: string,
  ) => {
    const result = await instanceUnderTest.sendEmailMessage({
      senderEmailAddressId: sender.id,
      emailMessageHeader: {
        from: { emailAddress: emailAddress.emailAddress },
        to: [{ emailAddress: receiverEmail }],
        cc: [],
        bcc: [],
        replyTo: [],
        subject: subject ?? '',
      },
      body: 'Hello, World! This is spam!',
      attachments: [],
      inlineAttachments: [],
    })

    let sent
    await waitForExpect(async () => {
      sent = await instanceUnderTest.getEmailMessage({
        id: result.id,
        cachePolicy: CachePolicy.RemoteOnly,
      })
      expect(sent).toBeDefined()
    })
  }

  it('Should allow user to block and unblock email addresses and look up the blocklist', async () => {
    const expectedlyEmptyBlocklistResult =
      await instanceUnderTest.getEmailAddressBlocklist()

    expect(expectedlyEmptyBlocklistResult).toHaveLength(0)

    const blockingResult = await instanceUnderTest.blockEmailAddresses({
      addressesToBlock: [ootoSimulatorAddress, dummyAddress],
    })

    expect(blockingResult.status).toEqual(BatchOperationResultStatus.Success)

    const expectedlyFullBlocklist =
      await instanceUnderTest.getEmailAddressBlocklist()

    expect(expectedlyFullBlocklist).toHaveLength(2)
    expect(expectedlyFullBlocklist).toEqual<UnsealedBlockedAddress[]>(
      expect.arrayContaining<UnsealedBlockedAddress>([
        {
          address: ootoSimulatorAddress,
          hashedBlockedValue: expect.any(String),
          status: {
            type: 'Completed',
          },
        },
        {
          address: dummyAddress,
          hashedBlockedValue: expect.any(String),
          status: {
            type: 'Completed',
          },
        },
      ]),
    )

    const unblockingResult = await instanceUnderTest.unblockEmailAddresses({
      addresses: [ootoSimulatorAddress, dummyAddress],
    })

    expect(unblockingResult.status).toEqual(BatchOperationResultStatus.Success)

    const expectedlyAlsoEmptyBlocklistResult =
      await instanceUnderTest.getEmailAddressBlocklist()

    expect(expectedlyAlsoEmptyBlocklistResult).toHaveLength(0)
  })

  it('Should treat unblocking addresses that are not blocked as success', async () => {
    const unblockingResult = await instanceUnderTest.unblockEmailAddresses({
      addresses: [ootoSimulatorAddress, dummyAddress],
    })

    expect(unblockingResult.status).toEqual(BatchOperationResultStatus.Success)
  })

  it('Should treat blocking addresses that are already blocked as success', async () => {
    const blockingResult = await instanceUnderTest.blockEmailAddresses({
      addressesToBlock: [ootoSimulatorAddress, dummyAddress],
    })

    expect(blockingResult.status).toEqual(BatchOperationResultStatus.Success)

    const blockingResult2 = await instanceUnderTest.blockEmailAddresses({
      addressesToBlock: [ootoSimulatorAddress, dummyAddress],
    })

    expect(blockingResult2.status).toEqual(BatchOperationResultStatus.Success)
  })

  it('Allows unblocking by hashedValue', async () => {
    const blockingResult = await instanceUnderTest.blockEmailAddresses({
      addressesToBlock: [ootoSimulatorAddress, dummyAddress],
    })

    expect(blockingResult.status).toEqual(BatchOperationResultStatus.Success)

    const getResult = await instanceUnderTest.getEmailAddressBlocklist()

    expect(getResult.length).toEqual(2)

    const hashedValues = getResult.map((value) => value.hashedBlockedValue)

    const unblockingResult =
      await instanceUnderTest.unblockEmailAddressesByHashedValue({
        hashedValues,
      })

    expect(unblockingResult.status).toEqual(BatchOperationResultStatus.Success)
  })

  it('allows emails from unblocked addresses but not from blocked addresses', async () => {
    const inboxFolder = await getFolderByName({
      emailClient: instanceUnderTest,
      emailAddressId: emailAddress.id,
      folderName: 'INBOX',
    })
    await sendMessage(emailAddress, ootoSimulatorAddress, 'Block test 1')

    let messages: ListEmailMessagesResult | undefined
    await waitForExpect(
      async () => {
        messages = await instanceUnderTest.listEmailMessagesForEmailFolderId({
          folderId: inboxFolder!.id,
          cachePolicy: CachePolicy.RemoteOnly,
        })

        if (messages.status !== ListOperationResultStatus.Success) {
          fail(`Expect result not returned: ${messages}`)
        }
        expect(messages.items).toHaveLength(1)
      },
      30000,
      1000,
    )

    messages = undefined

    const blockingResult = await instanceUnderTest.blockEmailAddresses({
      addressesToBlock: [mailerDaemonAddress, dummyAddress],
    })

    expect(blockingResult.status).toEqual(BatchOperationResultStatus.Success)

    await sendMessage(emailAddress, ootoSimulatorAddress, 'Block test 2')

    await waitForExpect(
      async () => {
        messages = await instanceUnderTest.listEmailMessagesForEmailFolderId({
          folderId: inboxFolder!.id,
          cachePolicy: CachePolicy.RemoteOnly,
        })

        if (messages.status !== ListOperationResultStatus.Success) {
          fail(`Expect result not returned: ${messages}`)
        }
        // Original email from blocked address is still there
        expect(messages.items).toHaveLength(1)
      },
      30000,
      1000,
    )

    messages = undefined

    const unblockingResult = await instanceUnderTest.unblockEmailAddresses({
      addresses: [mailerDaemonAddress, dummyAddress],
    })

    expect(unblockingResult.status).toEqual(BatchOperationResultStatus.Success)

    await sendMessage(emailAddress, ootoSimulatorAddress, 'Block test 3')

    await waitForExpect(
      async () => {
        messages = await instanceUnderTest.listEmailMessagesForEmailFolderId({
          folderId: inboxFolder!.id,
          cachePolicy: CachePolicy.RemoteOnly,
        })

        if (messages.status !== ListOperationResultStatus.Success) {
          fail(`Expect result not returned: ${messages}`)
        }
        // Original message plus this last one
        expect(messages.items).toHaveLength(2)
      },
      30000,
      1000,
    )
  })
})
