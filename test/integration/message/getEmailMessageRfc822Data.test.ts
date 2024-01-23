/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger } from '@sudoplatform/sudo-common'
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import waitForExpect from 'wait-for-expect'
import { EmailAddress, SudoEmailClient } from '../../../src'
import { ab2str, str2ab } from '../../util/buffer'
import { createEmailMessageRfc822String } from '../util/createEmailMessage'
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

  function generateRfc822String(body: string): string {
    return createEmailMessageRfc822String({
      from: [{ emailAddress: emailAddress.emailAddress }],
      to: [{ emailAddress: 'success@simulator.amazonses.com' }],
      cc: [],
      bcc: [],
      replyTo: [],
      subject: 'Testing rfc822Data',
      body,
      attachments: [],
    })
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

  it('gets rfc822 data successfully for multiple sent messages', async () => {
    const emailBodies = [
      'Hello, World',
      'I have come here to bury Caeser,\nNot to praise him.\nThe evil that men do lives after them.\nThe good is often interred with their bones.',
      'Life is not meant to be easy, my child; but take courage: it can be delightful.',
    ]
    const rfc822Strings = emailBodies.map((body) => generateRfc822String(body))
    const emailMessageIds = await Promise.all(
      rfc822Strings.map(
        async (string) =>
          await instanceUnderTest.sendEmailMessage({
            rfc822Data: str2ab(string),
            senderEmailAddressId: emailAddress.id,
          }),
      ),
    )
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
        const receivedRfc822String = ab2str(arrBuf)
        log.debug('rfc822string', { rfc822string: receivedRfc822String })
        expect(receivedRfc822String).toContain(
          'to: success@simulator.amazonses.com\n',
        )
        expect(receivedRfc822String).toContain('subject: Testing rfc822Data\n')
        expect(receivedRfc822String).toContain(emailBodies[index])
      }
    }
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
    const rfc822String = generateRfc822String('Hello, World')

    const emailMessageId = await instanceUnderTest.sendEmailMessage({
      rfc822Data: str2ab(rfc822String),
      senderEmailAddressId: emailAddress.id,
    })
    expect(emailMessageId).toMatch(
      /^em-msg-[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
    )
    await waitForRfc822Data(emailMessageId)
    await expect(
      instanceUnderTest.getEmailMessageRfc822Data({
        id: emailMessageId,
        emailAddressId: 'invalidEmailAddressId',
      }),
    ).resolves.toBeUndefined()
  })
})
