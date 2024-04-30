/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger } from '@sudoplatform/sudo-common'
import {
  EmailAddress,
  SendEmailMessageInput,
  SudoEmailClient,
} from '../../../src'
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import { setupEmailClient, teardown } from '../util/emailClientLifecycle'
import { provisionEmailAddress } from '../util/provisionEmailAddress'
import waitForExpect from 'wait-for-expect'
import { EmailMessageWithBody } from '../../../src/public/typings/emailMessageWithBody'

describe('getEmailMessageWithBody test suite', () => {
  jest.setTimeout(240000)
  const log = new DefaultLogger('SudoEmailClientIntegrationTests')

  let emailAddresses: EmailAddress[] = []

  let instanceUnderTest: SudoEmailClient
  let profilesClient: SudoProfilesClient
  let userClient: SudoUserClient
  let sudo: Sudo
  let ownershipProofToken: string

  let emailAddress: EmailAddress

  beforeAll(async () => {
    const result = await setupEmailClient(log)
    instanceUnderTest = result.emailClient
    profilesClient = result.profilesClient
    userClient = result.userClient
    sudo = result.sudo
    ownershipProofToken = result.ownershipProofToken

    emailAddress = await provisionEmailAddress(
      ownershipProofToken,
      instanceUnderTest,
    )
    emailAddresses.push(emailAddress)
  })

  afterAll(async () => {
    await teardown(
      { emailAddresses, sudos: [sudo] },
      { emailClient: instanceUnderTest, profilesClient, userClient },
    )
    emailAddresses = []
  })

  function generateSendInput(
    body: string,
    to = [{ emailAddress: 'success@simulator.amazonses.com' }],
  ): SendEmailMessageInput {
    return {
      senderEmailAddressId: emailAddress.id,
      emailMessageHeader: {
        from: { emailAddress: emailAddress.emailAddress },
        to,
        cc: [],
        bcc: [],
        replyTo: [],
        subject: 'Testing rfc822Data',
      },
      body,
      attachments: [],
      inlineAttachments: [],
    }
  }

  function waitForRfc822Data(emailMessageId: string): Promise<any> {
    return waitForExpect(
      () =>
        expect(
          instanceUnderTest.getEmailMessageRfc822Data({
            id: emailMessageId,
            emailAddressId: emailAddress.id,
          }),
        ).resolves.toBeDefined(),
      60000,
      10000,
    )
  }

  describe('unencrypted path', () => {
    it('gets message data successfully for multiple sent messages', async () => {
      const emailBodies = [
        'Hello, World',
        'I have come here to bury Caeser,\nNot to praise him.\nThe evil that men do lives after them.\nThe good is often interred with their bones.',
        'Life is not meant to be easy, my child; but take courage: it can be delightful.',
      ]
      const inputs = emailBodies.map((body) => generateSendInput(body))
      const results = await Promise.all(
        inputs.map(
          async (input) => await instanceUnderTest.sendEmailMessage(input),
        ),
      )
      const emailMessageIds = results.map((r) => r.id)
      expect(emailMessageIds.length).toEqual(emailBodies.length)

      for (let index = 0; index < emailMessageIds.length; ++index) {
        await waitForRfc822Data(emailMessageIds[index])
        const messageWithBody = await instanceUnderTest.getEmailMessageWithBody(
          {
            id: emailMessageIds[index],
            emailAddressId: emailAddress.id,
          },
        )

        expect(messageWithBody).toStrictEqual<EmailMessageWithBody>({
          id: emailMessageIds[index],
          body: emailBodies[index],
          attachments: [],
          inlineAttachments: [],
        })
      }
    })
  })

  describe('encrypted path', () => {
    it('gets message data successfully for multiple sent messages', async () => {
      const emailBodies = [
        'Hello, World',
        'I have come here to bury Caeser,\nNot to praise him.\nThe evil that men do lives after them.\nThe good is often interred with their bones.',
        'Life is not meant to be easy, my child; but take courage: it can be delightful.',
      ]
      const inputs = emailBodies.map((body) =>
        generateSendInput(body, [{ emailAddress: emailAddress.emailAddress }]),
      )
      const results = await Promise.all(
        inputs.map(
          async (input) => await instanceUnderTest.sendEmailMessage(input),
        ),
      )
      const emailMessageIds = results.map((r) => r.id)
      expect(emailMessageIds.length).toEqual(emailBodies.length)

      for (let index = 0; index < emailMessageIds.length; ++index) {
        await waitForRfc822Data(emailMessageIds[index])
        const messageWithBody = await instanceUnderTest.getEmailMessageWithBody(
          {
            id: emailMessageIds[index],
            emailAddressId: emailAddress.id,
          },
        )

        expect(messageWithBody).toStrictEqual<EmailMessageWithBody>({
          id: emailMessageIds[index],
          body: emailBodies[index],
          attachments: [],
          inlineAttachments: [],
        })
      }
    })
  })
})
