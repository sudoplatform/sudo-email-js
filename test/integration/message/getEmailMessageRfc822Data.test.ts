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
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import waitForExpect from 'wait-for-expect'
import {
  EmailAddress,
  EncryptionStatus,
  SendEmailMessageInput,
  SudoEmailClient,
} from '../../../src'
import { arrayBufferToString } from '../../../src/private/util/buffer'
import { encodeWordIfRequired } from '../../util/encoding'
import { setupEmailClient, teardown } from '../util/emailClientLifecycle'
import { getFolderByName } from '../util/folder'
import { provisionEmailAddress } from '../util/provisionEmailAddress'
import { provisionEmailMask } from '../util/provisionEmailMask'

describe('getEmailMessageRfc822Data test suite', () => {
  jest.setTimeout(240000)
  const log = new DefaultLogger('SudoEmailClientIntegrationTests')

  let emailAddresses: EmailAddress[] = []

  let instanceUnderTest: SudoEmailClient
  let profilesClient: SudoProfilesClient
  let userClient: SudoUserClient
  let sudo: Sudo
  let ownershipProofToken: string
  let emailMasksEnabled: boolean

  let emailAddress: EmailAddress

  beforeAll(async () => {
    const result = await setupEmailClient(log)
    instanceUnderTest = result.emailClient
    profilesClient = result.profilesClient
    userClient = result.userClient
    sudo = result.sudo
    ownershipProofToken = result.ownershipProofToken
    const config = await instanceUnderTest.getConfigurationData()
    emailMasksEnabled = config.emailMasksEnabled

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
    from = { emailAddress: emailAddress.emailAddress },
  ): SendEmailMessageInput {
    return {
      senderEmailAddressId: emailAddress.id,
      emailMessageHeader: {
        from,
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

  function waitForRfc822Data(
    emailMessageId: string,
    emailAddressId?: string,
  ): Promise<any> {
    return waitForExpect(
      () =>
        expect(
          instanceUnderTest.getEmailMessageRfc822Data({
            id: emailMessageId,
            emailAddressId: emailAddressId ?? emailAddress.id,
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
          expect(receivedRfc822String).toContain(
            `Subject: ${encodeWordIfRequired('Testing rfc822Data', EncryptionStatus.UNENCRYPTED)}`,
          )
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

  describe('email masks', () => {
    it('can get an email sent by a mask', async () => {
      if (!emailMasksEnabled) {
        log.debug('Email Masks not enabled. Skipping.')
        return
      }
      const receiverInbox = await getFolderByName({
        emailClient: instanceUnderTest,
        emailAddressId: emailAddress.id,
        folderName: 'INBOX',
      })
      if (!receiverInbox) {
        throw new Error('Receiver INBOX not found')
      }
      const senderEmailAddress = await provisionEmailAddress(
        ownershipProofToken,
        instanceUnderTest,
      )
      emailAddresses.push(senderEmailAddress)
      const senderEmailMask = await provisionEmailMask(
        ownershipProofToken,
        instanceUnderTest,
        {
          realAddress: senderEmailAddress.emailAddress,
        },
      )
      const sendInput = generateSendInput(
        'Test body',
        [{ emailAddress: emailAddress.emailAddress }],
        { emailAddress: senderEmailMask.maskAddress },
      )

      const sendResult = await instanceUnderTest.sendMaskedEmailMessage({
        ...sendInput,
        senderEmailMaskId: senderEmailMask.id,
      })

      await waitForRfc822Data(sendResult.id, senderEmailAddress.id)
      const sentRfc822Data = await instanceUnderTest.getEmailMessageRfc822Data({
        id: sendResult.id,
        emailAddressId: senderEmailAddress.id,
      })
      const sentArrBuf = sentRfc822Data?.rfc822Data
      expect(sentRfc822Data?.id).toStrictEqual(sendResult.id)
      expect(sentArrBuf).toBeDefined()
      if (sentArrBuf) {
        const sentRfc822String = arrayBufferToString(sentArrBuf)

        expect(sentRfc822String).toContain(`To: <${emailAddress.emailAddress}>`)
        expect(sentRfc822String).toContain(
          `From: <${senderEmailMask.maskAddress}>`,
        )
        expect(sentRfc822String).not.toContain(senderEmailAddress.emailAddress)
        expect(sentRfc822String).toContain('Subject: Testing rfc822Data')
        expect(sentRfc822String).toContain('Test body')
      } else {
        throw new Error('arrBuf not defined')
      }

      let receivedMessageId: string | undefined = undefined
      await waitForExpect(async () => {
        const receiverMessages =
          await instanceUnderTest.listEmailMessagesForEmailFolderId({
            folderId: receiverInbox.id,
          })
        expect(receiverMessages.status).toEqual(
          ListOperationResultStatus.Success,
        )
        if (receiverMessages.status !== ListOperationResultStatus.Success) {
          fail(`result status unexpectedly not Success`)
        }
        const receivedMessage = receiverMessages.items.find(
          (m) => m.from[0].emailAddress === senderEmailMask.maskAddress,
        )
        expect(receivedMessage).toBeDefined()
        receivedMessageId = receivedMessage!.id
      })

      const receivedRfc822Data =
        await instanceUnderTest.getEmailMessageRfc822Data({
          id: receivedMessageId!,
          emailAddressId: emailAddress.id,
        })
      const receivedArrBuf = receivedRfc822Data?.rfc822Data
      expect(receivedRfc822Data?.id).toStrictEqual(receivedMessageId!)
      expect(receivedArrBuf).toBeDefined()
      if (receivedArrBuf) {
        const receivedRfc822String = arrayBufferToString(receivedArrBuf)

        expect(receivedRfc822String).toContain(
          `To: <${emailAddress.emailAddress}>`,
        )
        expect(receivedRfc822String).toContain(
          `From: <${senderEmailMask.maskAddress}>`,
        )
        expect(receivedRfc822String).not.toContain(
          senderEmailAddress.emailAddress,
        )
        expect(receivedRfc822String).toContain('Subject: Testing rfc822Data')
        expect(receivedRfc822String).toContain('Test body')
      } else {
        throw new Error('arrBuf not defined')
      }
    })

    it('can get an email sent to a mask', async () => {
      if (!emailMasksEnabled) {
        log.debug('Email Masks not enabled. Skipping.')
        return
      }
      const receiverEmailAddress = await provisionEmailAddress(
        ownershipProofToken,
        instanceUnderTest,
      )
      emailAddresses.push(receiverEmailAddress)
      const receiverInbox = await getFolderByName({
        emailClient: instanceUnderTest,
        emailAddressId: receiverEmailAddress.id,
        folderName: 'INBOX',
      })
      if (!receiverInbox) {
        throw new Error('Receiver INBOX not found')
      }
      const receiverMask = await provisionEmailMask(
        ownershipProofToken,
        instanceUnderTest,
        {
          realAddress: receiverEmailAddress.emailAddress,
        },
      )
      const sendInput = generateSendInput('Test body', [
        { emailAddress: receiverMask.maskAddress },
      ])

      const sendResult = await instanceUnderTest.sendEmailMessage(sendInput)

      await waitForRfc822Data(sendResult.id)
      const sentRfc822Data = await instanceUnderTest.getEmailMessageRfc822Data({
        id: sendResult.id,
        emailAddressId: emailAddress.id,
      })
      const sentArrBuf = sentRfc822Data?.rfc822Data
      expect(sentRfc822Data?.id).toStrictEqual(sendResult.id)
      expect(sentArrBuf).toBeDefined()
      if (sentArrBuf) {
        const sentRfc822String = arrayBufferToString(sentArrBuf)

        expect(sentRfc822String).toContain(`To: <${receiverMask.maskAddress}>`)
        expect(sentRfc822String).not.toContain(
          receiverEmailAddress.emailAddress,
        )
        expect(sentRfc822String).toContain(
          `From: <${emailAddress.emailAddress}>`,
        )
        expect(sentRfc822String).toContain('Test body')
      } else {
        throw new Error('arrBuf not defined')
      }

      let receivedMessageId: string | undefined = undefined
      await waitForExpect(async () => {
        const receiverMessages =
          await instanceUnderTest.listEmailMessagesForEmailFolderId({
            folderId: receiverInbox.id,
          })
        expect(receiverMessages.status).toEqual(
          ListOperationResultStatus.Success,
        )
        if (receiverMessages.status !== ListOperationResultStatus.Success) {
          fail(`result status unexpectedly not Success`)
        }
        const receivedMessage = receiverMessages.items.find(
          (m) => m.to[0].emailAddress === receiverMask.maskAddress,
        )
        expect(receivedMessage).toBeDefined()
        receivedMessageId = receivedMessage!.id
      })

      const receivedRfc822Data =
        await instanceUnderTest.getEmailMessageRfc822Data({
          id: receivedMessageId!,
          emailAddressId: receiverMask.id,
        })
      const receivedArrBuf = receivedRfc822Data?.rfc822Data
      expect(receivedRfc822Data?.id).toStrictEqual(receivedMessageId)
      expect(receivedArrBuf).toBeDefined()
      if (receivedArrBuf) {
        const sentRfc822String = arrayBufferToString(sentArrBuf)

        expect(sentRfc822String).toContain(`To: <${receiverMask.maskAddress}>`)
        expect(sentRfc822String).not.toContain(
          receiverEmailAddress.emailAddress,
        )
        expect(sentRfc822String).toContain(
          `From: <${emailAddress.emailAddress}>`,
        )
        expect(sentRfc822String).toContain('Subject: Testing rfc822Data')
        expect(sentRfc822String).toContain('Test body')
      } else {
        throw new Error('arrBuf not defined')
      }
    })
  })
})
