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
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import _ from 'lodash'
import {
  BatchOperationResultStatus,
  EmailAddress,
  EmailFolder,
  ListEmailMessagesResult,
  SendEmailMessageInput,
  SudoEmailClient,
} from '../../../src'
import {
  setupEmailClient,
  sudoIssuer,
  teardown,
} from '../util/emailClientLifecycle'
import { provisionEmailAddress } from '../util/provisionEmailAddress'
import waitForExpect from 'wait-for-expect'
import { delay } from '../../util/delay'

describe('SudoEmailClient DeleteCustomEmailFolder Test Suite', () => {
  jest.setTimeout(240000)
  const log = new DefaultLogger('SudoEmailClientIntegrationTests')

  const ootoSimulatorAddress = 'ooto@simulator.amazonses.com'
  let instanceUnderTest: SudoEmailClient
  let profilesClient: SudoProfilesClient
  let userClient: SudoUserClient
  let sudo: Sudo
  let sudoOwnershipProofToken: string
  let emailAddress: EmailAddress
  const customFolderName = 'CUSTOM_FOLDER'
  let customFolder: EmailFolder

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
    customFolder = await instanceUnderTest.createCustomEmailFolder({
      emailAddressId: emailAddress.id,
      customFolderName: customFolderName,
    })
  })

  afterEach(async () => {
    await teardown(
      { emailAddresses: [emailAddress], sudos: [sudo] },
      { emailClient: instanceUnderTest, profilesClient, userClient },
    )
  })

  test('delete custom email folder should return success', async () => {
    await expect(
      instanceUnderTest.deleteCustomEmailFolder({
        emailFolderId: customFolder.id,
        emailAddressId: emailAddress.id,
      }),
    ).resolves.toStrictEqual(customFolder)
  })

  test('should succeed and return undefined for non-existant folder id', async () => {
    await expect(
      instanceUnderTest.deleteCustomEmailFolder({
        emailFolderId: 'bad-id',
        emailAddressId: emailAddress.id,
      }),
    ).resolves.toStrictEqual(undefined)
  })

  test('should move any messages in the deleted folder to TRASH', async () => {
    const sendInput: SendEmailMessageInput = {
      senderEmailAddressId: emailAddress.id,
      emailMessageHeader: {
        from: { emailAddress: emailAddress.emailAddress },
        to: [{ emailAddress: ootoSimulatorAddress }],
        cc: [],
        bcc: [],
        replyTo: [],
        subject: 'Send Email Message Test',
      },
      body: 'Hello, World',
      attachments: [],
      inlineAttachments: [],
    }
    const sendResult = await instanceUnderTest.sendEmailMessage(sendInput)

    expect(sendResult).toBeDefined()

    await waitForExpect(async () => {
      await expect(
        instanceUnderTest.updateEmailMessages({
          ids: [sendResult.id],
          values: { folderId: customFolder.id },
        }),
      ).resolves.toMatchObject({ status: BatchOperationResultStatus.Success })
    })

    await delay(5000)

    await waitForExpect(async () => {
      await expect(
        instanceUnderTest.listEmailMessagesForEmailFolderId({
          folderId: customFolder.id,
          cachePolicy: CachePolicy.RemoteOnly,
        }),
      ).resolves.toStrictEqual<ListEmailMessagesResult>({
        nextToken: undefined,
        status: ListOperationResultStatus.Success,
        items: expect.arrayContaining([
          expect.objectContaining({ id: sendResult.id }),
        ]),
      })
    })

    await expect(
      instanceUnderTest.deleteCustomEmailFolder({
        emailFolderId: customFolder.id,
        emailAddressId: emailAddress.id,
      }),
    ).resolves.toEqual(expect.objectContaining({ id: customFolder.id }))

    const folders = await instanceUnderTest.listEmailFoldersForEmailAddressId({
      emailAddressId: emailAddress.id,
    })
    const trashFolder = folders.items.find(
      (folder) => folder.folderName === 'TRASH',
    )

    if (!trashFolder) {
      fail('Trash folder unexpectedly falsy')
    }

    await delay(5000)

    await waitForExpect(async () => {
      await expect(
        instanceUnderTest.listEmailMessagesForEmailFolderId({
          folderId: trashFolder.id,
          cachePolicy: CachePolicy.RemoteOnly,
        }),
      ).resolves.toStrictEqual<ListEmailMessagesResult>({
        nextToken: undefined,
        status: ListOperationResultStatus.Success,
        items: expect.arrayContaining([
          expect.objectContaining({ id: sendResult.id }),
        ]),
      })
    })
  })
})
