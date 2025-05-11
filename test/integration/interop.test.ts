/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  CachePolicy,
  DefaultLogger,
  ListOperationResultStatus,
} from '@sudoplatform/sudo-common'
import {
  EmailAddress,
  EmailFolder,
  EmailMessage,
  SudoEmailClient,
} from '../../src'
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import { setupEmailClient, teardown } from './util/emailClientLifecycle'
import { provisionEmailAddress } from './util/provisionEmailAddress'
import waitForExpect from 'wait-for-expect'
import _ from 'lodash'
import { v4 } from 'uuid'
import fs from 'node:fs/promises'
import { delay } from '../util/delay'

export const externalAccounts = [
  'sudo.platform.testing@gmail.com',
  'sudo_platform_testing@yahoo.com',
  'sudo.platform.testing@outlook.com',
  'sudo.platform.testing@proton.me',
  // 'sudoplatformtesting@icloud.com', // No iCloud testing for now until we can get a long-lived user with a consistent address
]
/**
 * These tests are designed to ensure that our service is able to successfully send and
 * receive emails between us and Gmail, Yahoo, Outlook, iCloud, and Proton. We have set up accounts
 * in each of those services (credentials can be found in the Sudo Platform Engineering
 * vault of 1Password). They each have an auto-reply message set up (except Proton
 * because they charge you for that feature), so we send a message to each account
 * and await the auto-reply, ensuring that they body text is as expected.
 */
describe('SudoEmailClient Interoperability Test Suite', () => {
  jest.setTimeout(240000)
  const log = new DefaultLogger('SudoEmailClientInteropTests')

  let instanceUnderTest: SudoEmailClient
  let profilesClient: SudoProfilesClient
  let userClient: SudoUserClient
  let sudo: Sudo
  let ownershipProofToken: string

  let emailAddress: EmailAddress
  let inboxFolder: EmailFolder

  let attachmentData: string = ''

  const emailInteropTestsEnabled = !!process.env.ENABLE_EMAIL_INTEROP_TESTS

  beforeAll(async () => {
    attachmentData = await fs.readFile('test/util/files/lorem-ipsum.pdf', {
      encoding: 'base64',
    })
  })

  beforeEach(async () => {
    const result = await setupEmailClient(log)
    instanceUnderTest = result.emailClient
    profilesClient = result.profilesClient
    userClient = result.userClient
    sudo = result.sudo
    ownershipProofToken = result.ownershipProofToken

    emailAddress = await provisionEmailAddress(
      ownershipProofToken,
      instanceUnderTest,
      { localPart: `em-test-interop-js-${v4()}` },
    )

    // Pause here to make sure every part of the system sees the new email address we just
    // created.
    await delay(3000)

    const folder = emailAddress.folders.find((f) => f.folderName === 'INBOX')
    if (!folder) {
      fail(`Could not find INBOX folder for ${emailAddress.id}`)
    }
    inboxFolder = folder
  })

  afterEach(async () => {
    await teardown(
      { emailAddresses: [emailAddress], sudos: [sudo] },
      { emailClient: instanceUnderTest, profilesClient, userClient },
    )
  })

  // Will run tests only if enabled, otherwise will skip
  const runTest = emailInteropTestsEnabled ? it : it.skip

  runTest.each(externalAccounts)(
    'it can send to and receive from %p',
    async (externalAccount) => {
      const timestamp = new Date()
      console.info(timestamp.toUTCString(), externalAccount)
      const { id: sentId } = await instanceUnderTest.sendEmailMessage({
        senderEmailAddressId: emailAddress.id,
        emailMessageHeader: {
          from: { emailAddress: emailAddress.emailAddress },
          to: [{ emailAddress: externalAccount }],
          cc: [],
          bcc: [],
          replyTo: [],
          subject: `Test ${timestamp.toUTCString()}`,
        },
        body:
          'Hi Alison, \r\n Can you please let me know a good time to discuss your next project?\r\n' +
          'We need to get moving on it pretty much straight away. \r\nChris\r\n' +
          ` ${timestamp.toUTCString()}`,
        attachments: [
          {
            mimeType: 'application/pdf',
            contentTransferEncoding: 'base64',
            filename: 'lorem-ipsum.pdf',
            data: attachmentData,
            inlineAttachment: false,
          },
        ],
        inlineAttachments: [],
      })

      expect(sentId).toMatch(
        /^em-msg-[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
      )
      let sent: EmailMessage | undefined
      await waitForExpect(async () => {
        sent = await instanceUnderTest.getEmailMessage({
          id: sentId,
          cachePolicy: CachePolicy.RemoteOnly,
        })
        expect(sent).toBeDefined()
      })

      if (sent === undefined) {
        fail('Sent message unexpectedly undefined')
      }
      expect(sent.id).toEqual(sentId)
      expect(sent.subject).toEqual(`Test ${timestamp.toUTCString()}`)

      if (
        // Disabling this for now. Keep getting sent to spam in Gmail and Outlook
        false &&
        // Auto-replies are a paid feature in proton, so not looking for it here
        !externalAccount.endsWith('proton.me') &&
        // And yahoo keeps sending us to spam and not sending the auto-reply
        !externalAccount.endsWith('yahoo.com')
      ) {
        let receivedMessages: EmailMessage[] = []
        await waitForExpect(
          async () => {
            const result =
              await instanceUnderTest.listEmailMessagesForEmailFolderId({
                folderId: inboxFolder.id,
              })

            expect({
              status: result.status,
              emailAddress: emailAddress.emailAddress,
            }).toEqual({
              status: ListOperationResultStatus.Success,
              emailAddress: emailAddress.emailAddress,
            })
            if (result.status !== ListOperationResultStatus.Success) {
              fail(`result.status unexpectedly not success`)
            }

            expect({
              emailAddress: emailAddress.emailAddress,
              items: result.items,
            }).toEqual({
              emailAddress: emailAddress.emailAddress,
              items: expect.arrayContaining([expect.anything()]),
            })

            receivedMessages.push(result.items[0])
          },
          100000,
          1000,
        )

        expect(receivedMessages).toHaveLength(1)

        const messageWithBody = await instanceUnderTest.getEmailMessageWithBody(
          {
            emailAddressId: emailAddress.id,
            id: receivedMessages[0].id,
          },
        )

        expect({
          emailAddress: emailAddress.emailAddress,
          messageId: messageWithBody?.id,
          messageBody: messageWithBody?.body,
          messageAttachments: messageWithBody?.attachments.length,
          messageInlineAttachments: messageWithBody?.inlineAttachments.length,
        }).toEqual({
          emailAddress: emailAddress.emailAddress,
          messageId: expect.anything(),
          messageBody: expect.stringContaining(
            'Message received. This is an auto-reply',
          ),
          messageAttachments: 0,
          messageInlineAttachments: 0,
        })
      }
    },
  )
})
