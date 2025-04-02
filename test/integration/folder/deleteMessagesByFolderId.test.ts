/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CachePolicy,
  DefaultLogger,
  ListOperationResultStatus,
  ServiceError,
} from '@sudoplatform/sudo-common'
import {
  AddressNotFoundError,
  EmailAddress,
  EmailFolderNotFoundError,
  ListEmailMessagesResult,
  SendEmailMessageInput,
  SendEmailMessageResult,
  SudoEmailClient,
} from '../../../src'
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import { EmailConfigurationData } from '../../../src/gen/graphqlTypes'
import { setupEmailClient, teardown } from '../util/emailClientLifecycle'
import { provisionEmailAddress } from '../util/provisionEmailAddress'
import { v4 } from 'uuid'
import { getFolderByName } from '../util/folder'
import waitForExpect from 'wait-for-expect'

describe('SudoEmailClient DeleteMessagesByFolderId Test Suite', () => {
  jest.setTimeout(240000)
  const log = new DefaultLogger(
    'SudoEmailClient DeleteMessagesByFolderId Test Suite',
  )

  let instanceUnderTest: SudoEmailClient
  let profilesClient: SudoProfilesClient
  let userClient: SudoUserClient
  let sudo: Sudo
  let sudoOwnershipProofToken: string
  let emailAddress: EmailAddress
  let config: EmailConfigurationData

  beforeEach(async () => {
    const result = await setupEmailClient(log)
    instanceUnderTest = result.emailClient
    if (!config) {
      config = await instanceUnderTest.getConfigurationData()
    }
    profilesClient = result.profilesClient
    userClient = result.userClient
    sudo = result.sudo
    sudoOwnershipProofToken = result.ownershipProofToken
    emailAddress = await provisionEmailAddress(
      sudoOwnershipProofToken,
      instanceUnderTest,
    )
  })

  afterEach(async () => {
    await teardown(
      { emailAddresses: [emailAddress], sudos: [sudo] },
      { emailClient: instanceUnderTest, profilesClient, userClient },
    )
  })

  test('fails if passed invalid folder id', async () => {
    await expect(
      instanceUnderTest.deleteMessagesForFolderId({
        emailAddressId: emailAddress.id,
        emailFolderId: v4(),
      }),
    ).rejects.toBeInstanceOf(EmailFolderNotFoundError)
  })

  test('fails if passed invalid email address id', async () => {
    await expect(
      instanceUnderTest.deleteMessagesForFolderId({
        emailAddressId: v4(),
        emailFolderId: emailAddress.folders[0].id,
      }),
    ).rejects.toBeInstanceOf(AddressNotFoundError)
  })

  test('deletes a single message successfully', async () => {
    const sendInput: SendEmailMessageInput = {
      senderEmailAddressId: emailAddress.id,
      emailMessageHeader: {
        to: [{ emailAddress: emailAddress.emailAddress }],
        from: { emailAddress: emailAddress.emailAddress },
        replyTo: [],
        cc: [],
        bcc: [],
        subject: 'Test',
      },
      body: 'Test Body',
      attachments: [],
      inlineAttachments: [],
    }
    const sendResult = await instanceUnderTest.sendEmailMessage(sendInput)

    expect(sendResult).toBeDefined()

    const inboxFolder = await getFolderByName({
      folderName: 'INBOX',
      emailAddressId: emailAddress.id,
      emailClient: instanceUnderTest,
    })

    if (!inboxFolder) {
      fail('Inbox unexpectedly falsy')
    }

    await waitForExpect(async () => {
      const listResult =
        await instanceUnderTest.listEmailMessagesForEmailFolderId({
          folderId: inboxFolder.id,
          cachePolicy: CachePolicy.RemoteOnly,
        })
      if (listResult.status !== ListOperationResultStatus.Success) {
        fail('List result not successful')
      }
      expect(listResult.items).toHaveLength(1)
    })

    const result = await instanceUnderTest.deleteMessagesForFolderId({
      emailAddressId: emailAddress.id,
      emailFolderId: inboxFolder.id,
    })

    expect(result).toEqual(inboxFolder.id)

    await waitForExpect(async () => {
      await expect(
        instanceUnderTest.listEmailMessagesForEmailFolderId({
          folderId: inboxFolder.id,
          cachePolicy: CachePolicy.RemoteOnly,
        }),
      ).resolves.toStrictEqual<ListEmailMessagesResult>({
        nextToken: undefined,
        status: ListOperationResultStatus.Success,
        items: [],
      })
    })
  })

  test('deletes multiple messages successfully', async () => {
    const numMessages = 25

    try {
      const promises: Promise<SendEmailMessageResult>[] = []
      for (let i = 0; i < numMessages; i++) {
        const sendInput: SendEmailMessageInput = {
          senderEmailAddressId: emailAddress.id,
          emailMessageHeader: {
            to: [{ emailAddress: emailAddress.emailAddress }],
            from: { emailAddress: emailAddress.emailAddress },
            replyTo: [],
            cc: [],
            bcc: [],
            subject: 'Test',
          },
          body: `Test ${i} ${v4()}`,
          attachments: [],
          inlineAttachments: [],
        }
        promises.push(instanceUnderTest.sendEmailMessage(sendInput))
      }
      await Promise.all(promises)
    } catch (err) {
      log.error('sending failed', { err })
      fail('sending failed')
    }

    const inboxFolder = await getFolderByName({
      folderName: 'INBOX',
      emailAddressId: emailAddress.id,
      emailClient: instanceUnderTest,
    })

    if (!inboxFolder) {
      fail('Inbox unexpectedly falsy')
    }

    await waitForExpect(async () => {
      const listResult =
        await instanceUnderTest.listEmailMessagesForEmailFolderId({
          folderId: inboxFolder.id,
          cachePolicy: CachePolicy.RemoteOnly,
        })
      if (listResult.status !== ListOperationResultStatus.Success) {
        fail('list result not successful')
      }
      expect(listResult.items).toHaveLength(numMessages)
    }, 9000)

    const result = await instanceUnderTest.deleteMessagesForFolderId({
      emailAddressId: emailAddress.id,
      emailFolderId: inboxFolder.id,
    })

    expect(result).toEqual(inboxFolder.id)

    await waitForExpect(async () => {
      await expect(
        instanceUnderTest.listEmailMessagesForEmailFolderId({
          folderId: inboxFolder.id,
          cachePolicy: CachePolicy.RemoteOnly,
        }),
      ).resolves.toStrictEqual<ListEmailMessagesResult>({
        nextToken: undefined,
        status: ListOperationResultStatus.Success,
        items: [],
      })
    })
  })

  test('moves messages to TRASH if hardDelete is false', async () => {
    const numMessages = 5

    try {
      const promises: Promise<SendEmailMessageResult>[] = []
      for (let i = 0; i < numMessages; i++) {
        const sendInput: SendEmailMessageInput = {
          senderEmailAddressId: emailAddress.id,
          emailMessageHeader: {
            to: [{ emailAddress: emailAddress.emailAddress }],
            from: { emailAddress: emailAddress.emailAddress },
            replyTo: [],
            cc: [],
            bcc: [],
            subject: 'Test',
          },
          body: `Test ${i} ${v4()}`,
          attachments: [],
          inlineAttachments: [],
        }
        promises.push(instanceUnderTest.sendEmailMessage(sendInput))
      }
      await Promise.all(promises)
    } catch (err) {
      log.error('sending failed', { err })
      fail('sending failed')
    }

    const inboxFolder = await getFolderByName({
      folderName: 'INBOX',
      emailAddressId: emailAddress.id,
      emailClient: instanceUnderTest,
    })

    if (!inboxFolder) {
      fail('Inbox unexpectedly falsy')
    }

    const trashFolder = await getFolderByName({
      folderName: 'TRASH',
      emailAddressId: emailAddress.id,
      emailClient: instanceUnderTest,
    })

    if (!trashFolder) {
      fail('Trash unexpectedly falsy')
    }

    await waitForExpect(async () => {
      const listResult =
        await instanceUnderTest.listEmailMessagesForEmailFolderId({
          folderId: inboxFolder.id,
          cachePolicy: CachePolicy.RemoteOnly,
        })
      if (listResult.status !== ListOperationResultStatus.Success) {
        fail('list result not successful')
      }
      expect(listResult.items).toHaveLength(numMessages)
    }, 9000)

    const result = await instanceUnderTest.deleteMessagesForFolderId({
      emailAddressId: emailAddress.id,
      emailFolderId: inboxFolder.id,
      hardDelete: false,
    })

    expect(result).toEqual(inboxFolder.id)

    await waitForExpect(async () => {
      await expect(
        instanceUnderTest.listEmailMessagesForEmailFolderId({
          folderId: inboxFolder.id,
          cachePolicy: CachePolicy.RemoteOnly,
        }),
      ).resolves.toStrictEqual<ListEmailMessagesResult>({
        nextToken: undefined,
        status: ListOperationResultStatus.Success,
        items: [],
      })
    })

    await waitForExpect(async () => {
      const listResult =
        await instanceUnderTest.listEmailMessagesForEmailFolderId({
          folderId: trashFolder.id,
          cachePolicy: CachePolicy.RemoteOnly,
        })
      if (listResult.status !== ListOperationResultStatus.Success) {
        fail('list result not successful')
      }
      expect(listResult.items).toHaveLength(numMessages)
    })
  })

  test('always hard deletes from trash folder', async () => {
    const sendInput: SendEmailMessageInput = {
      senderEmailAddressId: emailAddress.id,
      emailMessageHeader: {
        to: [{ emailAddress: emailAddress.emailAddress }],
        from: { emailAddress: emailAddress.emailAddress },
        replyTo: [],
        cc: [],
        bcc: [],
        subject: 'Test',
      },
      body: 'Test Body',
      attachments: [],
      inlineAttachments: [],
    }
    const sendResult = await instanceUnderTest.sendEmailMessage(sendInput)

    expect(sendResult).toBeDefined()

    const inboxFolder = await getFolderByName({
      folderName: 'INBOX',
      emailAddressId: emailAddress.id,
      emailClient: instanceUnderTest,
    })

    if (!inboxFolder) {
      fail('Inbox unexpectedly falsy')
    }

    const trashFolder = await getFolderByName({
      folderName: 'TRASH',
      emailAddressId: emailAddress.id,
      emailClient: instanceUnderTest,
    })

    if (!trashFolder) {
      fail('Trash unexpectedly falsy')
    }

    await waitForExpect(async () => {
      const listResult =
        await instanceUnderTest.listEmailMessagesForEmailFolderId({
          folderId: inboxFolder.id,
          cachePolicy: CachePolicy.RemoteOnly,
        })
      if (listResult.status !== ListOperationResultStatus.Success) {
        fail('List result not successful')
      }
      expect(listResult.items).toHaveLength(1)
    })

    await instanceUnderTest.updateEmailMessages({
      ids: [sendResult.id],
      values: {
        folderId: trashFolder.id,
      },
    })

    await waitForExpect(async () => {
      const listResult =
        await instanceUnderTest.listEmailMessagesForEmailFolderId({
          folderId: trashFolder.id,
          cachePolicy: CachePolicy.RemoteOnly,
        })
      if (listResult.status !== ListOperationResultStatus.Success) {
        fail('List result not successful')
      }
      expect(listResult.items).toHaveLength(1)
    })

    const result = await instanceUnderTest.deleteMessagesForFolderId({
      emailAddressId: emailAddress.id,
      emailFolderId: trashFolder.id,
      hardDelete: false,
    })

    expect(result).toEqual(trashFolder.id)

    await waitForExpect(async () => {
      await expect(
        instanceUnderTest.listEmailMessagesForEmailFolderId({
          folderId: trashFolder.id,
          cachePolicy: CachePolicy.RemoteOnly,
        }),
      ).resolves.toStrictEqual<ListEmailMessagesResult>({
        nextToken: undefined,
        status: ListOperationResultStatus.Success,
        items: [],
      })
    })
  })

  test('works with custom folders', async () => {
    const sendInput: SendEmailMessageInput = {
      senderEmailAddressId: emailAddress.id,
      emailMessageHeader: {
        to: [{ emailAddress: emailAddress.emailAddress }],
        from: { emailAddress: emailAddress.emailAddress },
        replyTo: [],
        cc: [],
        bcc: [],
        subject: 'Test',
      },
      body: 'Test Body',
      attachments: [],
      inlineAttachments: [],
    }
    const sendResult = await instanceUnderTest.sendEmailMessage(sendInput)

    expect(sendResult).toBeDefined()

    const inboxFolder = await getFolderByName({
      folderName: 'INBOX',
      emailAddressId: emailAddress.id,
      emailClient: instanceUnderTest,
    })

    if (!inboxFolder) {
      fail('Inbox unexpectedly falsy')
    }

    const customFolder = await instanceUnderTest.createCustomEmailFolder({
      customFolderName: 'TEST',
      emailAddressId: emailAddress.id,
    })

    await waitForExpect(async () => {
      const listResult =
        await instanceUnderTest.listEmailMessagesForEmailFolderId({
          folderId: inboxFolder.id,
          cachePolicy: CachePolicy.RemoteOnly,
        })
      if (listResult.status !== ListOperationResultStatus.Success) {
        fail('List result not successful')
      }
      expect(listResult.items).toHaveLength(1)
    })

    await instanceUnderTest.updateEmailMessages({
      ids: [sendResult.id],
      values: {
        folderId: customFolder.id,
      },
    })

    await waitForExpect(async () => {
      const listResult =
        await instanceUnderTest.listEmailMessagesForEmailFolderId({
          folderId: customFolder.id,
          cachePolicy: CachePolicy.RemoteOnly,
        })
      if (listResult.status !== ListOperationResultStatus.Success) {
        fail('List result not successful')
      }
      expect(listResult.items).toHaveLength(1)
    })

    const result = await instanceUnderTest.deleteMessagesForFolderId({
      emailAddressId: emailAddress.id,
      emailFolderId: customFolder.id,
      hardDelete: false,
    })

    expect(result).toEqual(customFolder.id)

    await waitForExpect(async () => {
      await expect(
        instanceUnderTest.listEmailMessagesForEmailFolderId({
          folderId: customFolder.id,
          cachePolicy: CachePolicy.RemoteOnly,
        }),
      ).resolves.toStrictEqual<ListEmailMessagesResult>({
        nextToken: undefined,
        status: ListOperationResultStatus.Success,
        items: [],
      })
    })
  })
})
