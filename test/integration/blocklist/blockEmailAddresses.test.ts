/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DefaultLogger,
  ListOperationResultStatus,
} from '@sudoplatform/sudo-common'
import {
  BatchOperationResultStatus,
  BlockedEmailAddressAction,
  BlockedEmailAddressLevel,
  EmailAddress,
  InvalidArgumentError,
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
import { delay } from '../../util/delay'

describe('SudoEmailClient Block Email Addresses Integration Test Suite', () => {
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
        localPart: generateSafeLocalPart('receiver'),
      },
    )
    emailAddresses.push(receiverAddress)
    senderAddress = await provisionEmailAddress(
      sudoOwnershipProofToken,
      instanceUnderTest,
      {
        localPart: generateSafeLocalPart('sender'),
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

  const sendMessage = async (
    sender: EmailAddress,
    receiverEmail: string,
    subject?: string,
  ) => {
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
      body: 'Hello, World! This is spam!',
      attachments: [],
      inlineAttachments: [],
    })

    let sent
    await waitForExpect(async () => {
      sent = await instanceUnderTest.getEmailMessage({
        id: result.id,
      })
      expect(sent).toBeDefined()
    })
  }

  it('Should successfully block a single address', async () => {
    const blockingResult = await instanceUnderTest.blockEmailAddresses({
      addressesToBlock: [dummyAddress],
    })

    expect(blockingResult.status).toEqual(BatchOperationResultStatus.Success)
  })

  it('Should successfully block multiple addresses', async () => {
    const blockingResult = await instanceUnderTest.blockEmailAddresses({
      addressesToBlock: [senderAddress.emailAddress, dummyAddress],
    })

    expect(blockingResult.status).toEqual(BatchOperationResultStatus.Success)
  })

  it('Should treat blocking addresses that are already blocked as success', async () => {
    const blockingResult = await instanceUnderTest.blockEmailAddresses({
      addressesToBlock: [senderAddress.emailAddress, dummyAddress],
    })

    expect(blockingResult.status).toEqual(BatchOperationResultStatus.Success)

    const blockingResult2 = await instanceUnderTest.blockEmailAddresses({
      addressesToBlock: [senderAddress.emailAddress, dummyAddress],
    })

    expect(blockingResult2.status).toEqual(BatchOperationResultStatus.Success)
  })

  it('allows blocking by emailAddressId', async () => {
    const blockingResult = await instanceUnderTest.blockEmailAddresses({
      addressesToBlock: [senderAddress.emailAddress, dummyAddress],
      emailAddressId: receiverAddress.id,
    })

    expect(blockingResult.status).toEqual(BatchOperationResultStatus.Success)

    const getResult = await instanceUnderTest.getEmailAddressBlocklist()

    expect(getResult.length).toEqual(2)

    getResult.forEach((result) => {
      expect(result.emailAddressId).toEqual(receiverAddress.id)
    })

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
      emailAddressId: receiverAddress.id,
      folderName: 'INBOX',
    })
    await sendMessage(
      senderAddress,
      receiverAddress.emailAddress,
      'Block test 1',
    )

    let messages: ListEmailMessagesResult | undefined
    await waitForExpect(
      async () => {
        messages = await instanceUnderTest.listEmailMessagesForEmailFolderId({
          folderId: inboxFolder!.id,
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
      addressesToBlock: [senderAddress.emailAddress, dummyAddress],
    })

    expect(blockingResult.status).toEqual(BatchOperationResultStatus.Success)

    // Ensure new block is consistently read
    await delay(3000)

    await sendMessage(
      senderAddress,
      receiverAddress.emailAddress,
      'Block test 2',
    )

    await waitForExpect(
      async () => {
        messages = await instanceUnderTest.listEmailMessagesForEmailFolderId({
          folderId: inboxFolder!.id,
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
      addresses: [senderAddress.emailAddress, dummyAddress],
    })

    expect(unblockingResult.status).toEqual(BatchOperationResultStatus.Success)

    // Ensure block deletion is consistently read
    await delay(3000)

    await sendMessage(
      senderAddress,
      receiverAddress.emailAddress,
      'Block test 3',
    )

    await waitForExpect(
      async () => {
        messages = await instanceUnderTest.listEmailMessagesForEmailFolderId({
          folderId: inboxFolder!.id,
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

  it('blocks with SPAM action appropriately', async () => {
    let folder = await getFolderByName({
      emailClient: instanceUnderTest,
      emailAddressId: receiverAddress.id,
      folderName: 'SPAM',
    })

    if (!folder) {
      folder = await getFolderByName({
        emailClient: instanceUnderTest,
        emailAddressId: receiverAddress.id,
        folderName: 'INBOX',
      })
    }

    if (!folder) {
      fail('Could not find folder')
    }

    const blockingResult = await instanceUnderTest.blockEmailAddresses({
      addressesToBlock: [senderAddress.emailAddress, dummyAddress],
      action: BlockedEmailAddressAction.SPAM,
    })

    expect(blockingResult.status).toEqual(BatchOperationResultStatus.Success)

    const blocklistResult = await instanceUnderTest.getEmailAddressBlocklist()

    expect(blocklistResult).toHaveLength(2)
    expect(blocklistResult).toEqual<UnsealedBlockedAddress[]>(
      expect.arrayContaining<UnsealedBlockedAddress>([
        {
          address: senderAddress.emailAddress,
          hashedBlockedValue: expect.any(String),
          status: {
            type: 'Completed',
          },
          action: BlockedEmailAddressAction.SPAM,
        },
        {
          address: dummyAddress,
          hashedBlockedValue: expect.any(String),
          status: {
            type: 'Completed',
          },
          action: BlockedEmailAddressAction.SPAM,
        },
      ]),
    )

    // Ensure new block is consistently read
    await delay(3000)

    await sendMessage(
      senderAddress,
      receiverAddress.emailAddress,
      'Block test 2',
    )

    let messages: ListEmailMessagesResult | undefined
    await waitForExpect(
      async () => {
        messages = await instanceUnderTest.listEmailMessagesForEmailFolderId({
          folderId: folder.id,
        })

        if (messages.status !== ListOperationResultStatus.Success) {
          fail(`Expect result not returned: ${messages}`)
        }
        if (folder.folderName === 'SPAM') {
          // We're looking in spam, so it should appear
          expect(messages.items).toHaveLength(1)
        } else {
          // We're looking is inbox, so it should not
          expect(messages.items).toHaveLength(0)
        }
      },
      30000,
      1000,
    )
  })

  it('blocking by emailAddressId does not block for other email addresses', async () => {
    const receiverAddress2 = await provisionEmailAddress(
      sudoOwnershipProofToken,
      instanceUnderTest,
      {
        localPart: generateSafeLocalPart('receiver2'),
      },
    )
    emailAddresses.push(receiverAddress2)

    const receiverInboxFolder = await getFolderByName({
      emailClient: instanceUnderTest,
      emailAddressId: receiverAddress.id,
      folderName: 'INBOX',
    })

    const receiver2InboxFolder = await getFolderByName({
      emailClient: instanceUnderTest,
      emailAddressId: receiverAddress2.id,
      folderName: 'INBOX',
    })

    const blockingResult = await instanceUnderTest.blockEmailAddresses({
      addressesToBlock: [senderAddress.emailAddress],
      emailAddressId: receiverAddress.id,
    })

    expect(blockingResult.status).toEqual(BatchOperationResultStatus.Success)

    const result = await instanceUnderTest.sendEmailMessage({
      senderEmailAddressId: senderAddress.id,
      emailMessageHeader: {
        from: { emailAddress: senderAddress.emailAddress },
        to: [
          { emailAddress: receiverAddress.emailAddress },
          { emailAddress: receiverAddress2.emailAddress },
        ],
        cc: [],
        bcc: [],
        replyTo: [],
        subject: 'Block Test',
      },
      body: 'Hello, World! This is spam!',
      attachments: [],
      inlineAttachments: [],
    })

    let sent
    await waitForExpect(async () => {
      sent = await instanceUnderTest.getEmailMessage({
        id: result.id,
      })
      expect(sent).toBeDefined()
    })

    await delay(2000)

    // Make sure receiver2 did receive
    await waitForExpect(
      async () => {
        const messages =
          await instanceUnderTest.listEmailMessagesForEmailFolderId({
            folderId: receiver2InboxFolder!.id,
          })

        if (messages.status !== ListOperationResultStatus.Success) {
          fail(`Expect result not returned: ${messages}`)
        }
        expect(messages.items).toHaveLength(1)
      },
      30000,
      1000,
    )

    // Make sure receiver1 did not receive
    await waitForExpect(
      async () => {
        const messages =
          await instanceUnderTest.listEmailMessagesForEmailFolderId({
            folderId: receiverInboxFolder!.id,
          })

        if (messages.status !== ListOperationResultStatus.Success) {
          fail(`Expect result not returned: ${messages.status}`)
        }
        expect(messages.items).toHaveLength(0)
      },
      30000,
      1000,
    )
  })

  it('properly blocks with block level as domain', async () => {
    const sender2 = await provisionEmailAddress(
      sudoOwnershipProofToken,
      instanceUnderTest,
      {
        localPart: generateSafeLocalPart('sender2'),
      },
    )
    emailAddresses.push(sender2)

    const blockingResult = await instanceUnderTest.blockEmailAddresses({
      addressesToBlock: [senderAddress.emailAddress],
      blockLevel: BlockedEmailAddressLevel.DOMAIN,
    })

    expect(blockingResult.status).toEqual(BatchOperationResultStatus.Success)

    const inboxFolder = await getFolderByName({
      emailClient: instanceUnderTest,
      emailAddressId: receiverAddress.id,
      folderName: 'INBOX',
    })
    await sendMessage(
      sender2,
      receiverAddress.emailAddress,
      'Block by domain test',
    )
    await delay(3000)

    let messages: ListEmailMessagesResult | undefined
    await waitForExpect(
      async () => {
        messages = await instanceUnderTest.listEmailMessagesForEmailFolderId({
          folderId: inboxFolder!.id,
        })

        if (messages.status !== ListOperationResultStatus.Success) {
          fail(`Expect result not returned: ${messages.status}`)
        }
        expect(messages.items).toHaveLength(0)
      },
      30000,
      1000,
    )
  })

  it('throws InvalidArgumentError if passed an invalid email address', async () => {
    await expect(
      instanceUnderTest.blockEmailAddresses({
        addressesToBlock: ['foo'],
      }),
    ).rejects.toBeInstanceOf(InvalidArgumentError)
  })
})
