/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { CachePolicy, DefaultLogger } from '@sudoplatform/sudo-common'
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import waitForExpect from 'wait-for-expect'
import {
  EmailAddress,
  SendEmailMessageInput,
  SudoEmailClient,
} from '../../../src'
import { arrayBufferToString } from '../../../src/private/util/buffer'
import { setupEmailClient, teardown } from '../util/emailClientLifecycle'
import { provisionEmailAddress } from '../util/provisionEmailAddress'

describe('getEmailMessageRfc822Data test suite', () => {
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
    it('gets rfc822 data successfully for multiple sent messages', async () => {
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
        const rfc822Data = await instanceUnderTest.getEmailMessageRfc822Data({
          id: emailMessageIds[index],
          emailAddressId: emailAddress.id,
        })
        const arrBuf = rfc822Data?.rfc822Data
        expect(rfc822Data?.id).toStrictEqual(emailMessageIds[index])
        expect(arrBuf).toBeDefined()
        if (arrBuf) {
          const receivedRfc822String = arrayBufferToString(arrBuf)

          expect(receivedRfc822String).toContain(
            'To: <success@simulator.amazonses.com>',
          )
          expect(receivedRfc822String).toContain('Subject: Testing rfc822Data')
          expect(receivedRfc822String).toContain(emailBodies[index])
        }
      }
    })
  })

  describe('encrypted path', () => {
    it('gets rfc822 data successfully for multiple sent messages', async () => {
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
        const rfc822Data = await instanceUnderTest.getEmailMessageRfc822Data({
          id: emailMessageIds[index],
          emailAddressId: emailAddress.id,
        })
        const arrBuf = rfc822Data?.rfc822Data
        expect(rfc822Data?.id).toStrictEqual(emailMessageIds[index])
        expect(arrBuf).toBeDefined()
        if (arrBuf) {
          const receivedRfc822String = arrayBufferToString(arrBuf)

          expect(receivedRfc822String).toContain(
            `To: <${emailAddress.emailAddress}>`,
          )
          expect(receivedRfc822String).toContain('Subject: Testing rfc822Data')
          expect(receivedRfc822String).toContain(emailBodies[index])
        } else {
          throw new Error('arrBuf not defined')
        }
      }
    })
  })

  it('returns undefined for invalid email message ID', async () => {
    await expect(
      instanceUnderTest.getEmailMessageRfc822Data({
        id: 'invalidEmailMessageId',
        emailAddressId: emailAddress.id,
      }),
    ).resolves.toBeUndefined()
  })

  it('returns undefined for invalid email address ID', async () => {
    const input = generateSendInput('Hello, World')

    const result = await instanceUnderTest.sendEmailMessage(input)
    expect(result.id).toMatch(
      /^em-msg-[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
    )
    await waitForRfc822Data(result.id)
    await expect(
      instanceUnderTest.getEmailMessageRfc822Data({
        id: result.id,
        emailAddressId: 'invalidEmailAddressId',
      }),
    ).resolves.toBeUndefined()
  })

  it('does not return deleted messages', async () => {
    const sendInput = generateSendInput('Test body', [
      { emailAddress: emailAddress.emailAddress },
    ])
    const sendResult = await instanceUnderTest.sendEmailMessage(sendInput)

    await waitForExpect(
      async () => {
        await expect(
          instanceUnderTest.getEmailMessage({
            id: sendResult.id,
            cachePolicy: CachePolicy.RemoteOnly,
          }),
        ).resolves.toBeDefined()
      },
      60000,
      10000,
    )

    await expect(
      instanceUnderTest.deleteEmailMessage(sendResult.id),
    ).resolves.toEqual({ id: sendResult.id })

    await expect(
      instanceUnderTest.getEmailMessageRfc822Data({
        emailAddressId: emailAddress.id,
        id: sendResult.id,
      }),
    ).resolves.toBeUndefined()
  })
})
