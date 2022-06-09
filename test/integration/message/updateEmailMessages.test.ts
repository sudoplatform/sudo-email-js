import {
  CachePolicy,
  DefaultLogger,
  ListOperationResultStatus,
} from '@sudoplatform/sudo-common'
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import _ from 'lodash'
import { v4 } from 'uuid'
import waitForExpect from 'wait-for-expect'
import {
  BatchOperationResultStatus,
  Direction,
  EmailAddress,
  LimitExceededError,
  SudoEmailClient,
} from '../../../src'
import { str2ab } from '../../util/buffer'
import { createEmailMessageRfc822String } from '../util/createEmailMessage'
import { setupEmailClient, teardown } from '../util/emailClientLifecycle'
import { getFolderByName } from '../util/folder'
import { provisionEmailAddress } from '../util/provisionEmailAddress'

describe('SudoEmailClient UpdateEmailMessages Test Suite', () => {
  jest.setTimeout(240000)
  const log = new DefaultLogger('SudoEmailClientIntegrationTests')

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
    )
  })

  afterEach(async () => {
    await teardown(
      { emailAddresses: [emailAddress], sudos: [sudo] },
      { emailClient: instanceUnderTest, profilesClient, userClient },
    )
  })

  test('update seen status of single email message should return success status', async () => {
    const messageString = createEmailMessageRfc822String({
      from: [{ emailAddress: emailAddress.emailAddress }],
      to: [{ emailAddress: 'ooto@simulator.amazonses.com' }],
      cc: [],
      bcc: [],
      replyTo: [],
      subject: 'Important Subject',
      body: 'Hello, World',
      attachments: [],
    })
    const messageId = await instanceUnderTest.sendEmailMessage({
      rfc822Data: str2ab(messageString),
      senderEmailAddressId: emailAddress.id,
    })
    await waitForExpect(async () => {
      await expect(
        instanceUnderTest.updateEmailMessages({
          ids: [messageId],
          values: { seen: false },
        }),
      ).resolves.toMatchObject({ status: BatchOperationResultStatus.Success })
    })
    const messages = await instanceUnderTest.listEmailMessagesForEmailAddressId(
      {
        emailAddressId: emailAddress.id,
        cachePolicy: CachePolicy.RemoteOnly,
      },
    )
    if (messages.status !== ListOperationResultStatus.Success) {
      fail(`Expect result not returned: ${messages}`)
    }
    const outbound = messages.items.filter(
      (message) => message.direction === Direction.Outbound,
    )
    expect(outbound[0].seen).toEqual(false)
  })

  test('update seen status of multiple email messages should return success status', async () => {
    const messageStrings = _.range(2).map((i) =>
      createEmailMessageRfc822String({
        from: [{ emailAddress: emailAddress.emailAddress }],
        to: [{ emailAddress: 'ooto@simulator.amazonses.com' }],
        cc: [],
        bcc: [],
        replyTo: [],
        body: `Hello, World ${i}`,
        attachments: [],
      }),
    )
    const ids = await Promise.all(
      messageStrings.map(
        async (s) =>
          await instanceUnderTest.sendEmailMessage({
            rfc822Data: str2ab(s),
            senderEmailAddressId: emailAddress.id,
          }),
      ),
    )
    await waitForExpect(async () => {
      await expect(
        instanceUnderTest.updateEmailMessages({
          ids,
          values: { seen: false },
        }),
      ).resolves.toMatchObject({ status: BatchOperationResultStatus.Success })
    })
    const messages = await instanceUnderTest.listEmailMessagesForEmailAddressId(
      {
        emailAddressId: emailAddress.id,
        cachePolicy: CachePolicy.RemoteOnly,
      },
    )
    if (messages.status !== ListOperationResultStatus.Success) {
      fail(`Expect result not returned: ${messages}`)
    }
    const outbound = messages.items.filter(
      (message) => message.direction === Direction.Outbound,
    )
    expect(outbound[0].seen).toEqual(false)
    expect(outbound[1].seen).toEqual(false)
  })

  test('update folderId of multiple email messages should return success status', async () => {
    const messageStrings = _.range(2).map((i) =>
      createEmailMessageRfc822String({
        from: [{ emailAddress: emailAddress.emailAddress }],
        to: [{ emailAddress: 'ooto@simulator.amazonses.com' }],
        cc: [],
        bcc: [],
        replyTo: [],
        body: `Hello, World ${i}`,
        attachments: [],
      }),
    )
    const ids = await Promise.all(
      messageStrings.map(
        async (s) =>
          await instanceUnderTest.sendEmailMessage({
            rfc822Data: str2ab(s),
            senderEmailAddressId: emailAddress.id,
          }),
      ),
    )
    const trashFolder = await getFolderByName({
      emailClient: instanceUnderTest,
      emailAddressId: emailAddress.id,
      folderName: 'TRASH',
    })
    const sentFolder = emailAddress.folders.find((f) => f.folderName === 'SENT')
    expect(sentFolder).toBeDefined()
    expect(trashFolder).toBeDefined()
    await waitForExpect(async () => {
      await expect(
        instanceUnderTest.updateEmailMessages({
          ids,
          values: { folderId: trashFolder?.id ?? '' },
        }),
      ).resolves.toMatchObject({ status: BatchOperationResultStatus.Success })
    })
    const messages = await instanceUnderTest.listEmailMessagesForEmailAddressId(
      {
        emailAddressId: emailAddress.id,
        cachePolicy: CachePolicy.RemoteOnly,
      },
    )
    if (messages.status !== ListOperationResultStatus.Success) {
      fail(`Expect result not returned: ${messages}`)
    }
    const outbound = messages.items.filter(
      (message) => message.direction === Direction.Outbound,
    )
    expect(outbound[0].folderId).toEqual(trashFolder?.id)
    expect(outbound[1].folderId).toEqual(trashFolder?.id)
    // Test previousFolderId
    expect(outbound[0].previousFolderId).toEqual(sentFolder?.id)
    expect(outbound[1].previousFolderId).toEqual(sentFolder?.id)
  })

  test('previousFolderId does not change when message is moved to same folder', async () => {
    const messageString = createEmailMessageRfc822String({
      from: [{ emailAddress: emailAddress.emailAddress }],
      to: [{ emailAddress: 'ooto@simulator.amazonses.com' }],
      cc: [],
      bcc: [],
      replyTo: [],
      body: `Hello, World`,
      attachments: [],
    })
    const id = await instanceUnderTest.sendEmailMessage({
      rfc822Data: str2ab(messageString),
      senderEmailAddressId: emailAddress.id,
    })
    const sentFolder = emailAddress.folders.find((f) => f.folderName === 'SENT')
    expect(sentFolder).toBeDefined()

    await waitForExpect(async () => {
      await expect(
        instanceUnderTest.updateEmailMessages({
          ids: [id],
          values: { folderId: sentFolder?.id ?? '' },
        }),
      ).resolves.toMatchObject({ status: BatchOperationResultStatus.Success })
    })

    await waitForExpect(async () => {
      const messages =
        await instanceUnderTest.listEmailMessagesForEmailAddressId({
          emailAddressId: emailAddress.id,
          cachePolicy: CachePolicy.RemoteOnly,
        })
      if (messages.status !== ListOperationResultStatus.Success) {
        fail(`Expect result not returned: ${messages}`)
      }
      const outbound = messages.items.filter(
        (message) => message.direction === Direction.Outbound,
      )
      // Test previousFolderId hasn't changed
      expect(outbound[0].previousFolderId).toEqual(undefined)
    })
  })

  test('update non-existent email messages should return failed status', async () => {
    const nonExistentId = [v4()]
    const result = await instanceUnderTest.updateEmailMessages({
      ids: nonExistentId,
      values: { seen: true },
    })
    expect(result.status).toStrictEqual(BatchOperationResultStatus.Failure)
  })

  test('update list of non-existent email messages should return failed status', async () => {
    const nonExistentIds = [v4(), v4(), v4()]
    const result = await instanceUnderTest.updateEmailMessages({
      ids: nonExistentIds,
      values: { seen: true },
    })
    expect(result.status).toStrictEqual(BatchOperationResultStatus.Failure)
  })

  test('update email messages with mixture of failed and successful updates should return partial status', async () => {
    const messageString = createEmailMessageRfc822String({
      from: [{ emailAddress: emailAddress.emailAddress }],
      to: [{ emailAddress: 'ooto@simulator.amazonses.com' }],
      cc: [],
      bcc: [],
      replyTo: [],
      subject: 'Important Subject',
      body: 'Hello, World',
      attachments: [],
    })
    const messageId = await instanceUnderTest.sendEmailMessage({
      rfc822Data: str2ab(messageString),
      senderEmailAddressId: emailAddress.id,
    })
    const nonExistentId = v4()
    await waitForExpect(async () => {
      await expect(
        instanceUnderTest.updateEmailMessages({
          ids: [messageId, nonExistentId],
          values: { seen: false },
        }),
      ).resolves.toStrictEqual({
        status: BatchOperationResultStatus.Partial,
        successValues: [messageId],
        failureValues: [nonExistentId],
      })
    })
  })

  test('update email messages with empty input should return success status', async () => {
    const result = await instanceUnderTest.updateEmailMessages({
      ids: [],
      values: { seen: true },
    })
    expect(result.status).toStrictEqual(BatchOperationResultStatus.Success)
  })

  test('attempt to update 100 email messages should not throw LimitExceededError', async () => {
    const ids = _.range(100).map(() => v4())
    const result = await instanceUnderTest.updateEmailMessages({
      ids,
      values: { seen: true },
    })
    expect(result.status).toStrictEqual(BatchOperationResultStatus.Failure)
  })

  test('attempt to update more than 100 email messages throws LimitExceededError', async () => {
    const ids = _.range(101).map(() => v4())
    await expect(
      instanceUnderTest.updateEmailMessages({
        ids,
        values: { seen: true },
      }),
    ).rejects.toThrow(new LimitExceededError('Input cannot exceed 100'))
  })
})
