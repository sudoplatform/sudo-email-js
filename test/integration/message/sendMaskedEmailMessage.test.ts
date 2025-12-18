/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Base64,
  Buffer as BufferUtil,
  DefaultLogger,
} from '@sudoplatform/sudo-common'
import {
  EmailAddress,
  EmailAttachment,
  EmailMask,
  EmailMessage,
  EncryptionStatus,
  InvalidEmailContentsError,
  MessageSizeLimitExceededError,
  SudoEmailClient,
  UnauthorizedAddressError,
} from '../../../src'
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import { EmailConfigurationDataService } from '../../../src/private/domain/entities/configuration/configurationDataService'
import { setupEmailClient, teardown } from '../util/emailClientLifecycle'
import {
  generateSafeLocalPart,
  provisionEmailAddress,
} from '../util/provisionEmailAddress'
import { provisionEmailMask } from '../util/provisionEmailMask'
import { constructSendMessageInputSansSenderId } from '../util/emailMessage'
import waitForExpect from 'wait-for-expect'
import { OOTO_SIMULATOR_ADDRESS, SUCCESS_SIMULATOR_ADDRESS } from '../util/data'
import { v4 } from 'uuid'
import { getRandomElement } from '../../../src/private/util/array'
import {
  emailAddressMaxPerSudoEntitlement,
  EntitlementsBuilder,
} from '../util/entitlements'
import { SudoEntitlementsClient } from '@sudoplatform/sudo-entitlements'
import { SudoEntitlementsAdminClient } from '@sudoplatform/sudo-entitlements-admin'
import { getImageFileData, getPdfFileData } from '../../util/files/fileData'

describe('SudoEmailClient SendMaskedEmailMessage Test Suite', () => {
  jest.setTimeout(240000)
  const log = new DefaultLogger('SudoEmailClientIntegrationTests')

  let emailAddresses: EmailAddress[] = []

  let instanceUnderTest: SudoEmailClient
  let profilesClient: SudoProfilesClient
  let userClient: SudoUserClient
  let entitlementsClient: SudoEntitlementsClient
  let entitlementsAdminClient: SudoEntitlementsAdminClient
  let sudo: Sudo
  let ownershipProofToken: string
  let sendEncryptedEmailEnabled: boolean

  let emailAddress: EmailAddress
  let emailMask: EmailMask
  let configurationDataService: EmailConfigurationDataService
  let beforeEachComplete = false
  let runTests = true

  const imageData = getImageFileData()
  const pdfData = getPdfFileData()

  beforeEach(async () => {
    beforeEachComplete = false
    const result = await setupEmailClient(log)
    instanceUnderTest = result.emailClient
    profilesClient = result.profilesClient
    userClient = result.userClient
    sudo = result.sudo
    ownershipProofToken = result.ownershipProofToken
    configurationDataService = result.configurationDataService
    entitlementsClient = result.entitlementsClient
    entitlementsAdminClient = result.entitlementsAdminClient

    await new EntitlementsBuilder()
      .setEntitlementsAdminClient(entitlementsAdminClient)
      .setEntitlementsClient(entitlementsClient)
      .setEntitlement({
        name: emailAddressMaxPerSudoEntitlement,
        description: 'Test Max Addresses Entitlement',
        value: 30,
      })
      .apply()

    const configuration = await instanceUnderTest.getConfigurationData()
    runTests = configuration.emailMasksEnabled
    sendEncryptedEmailEnabled = configuration.sendEncryptedEmailEnabled
    if (runTests) {
      emailAddress = await provisionEmailAddress(
        ownershipProofToken,
        instanceUnderTest,
      )
      emailAddresses.push(emailAddress)
      emailMask = await provisionEmailMask(
        ownershipProofToken,
        instanceUnderTest,
        {
          realAddress: emailAddress.emailAddress,
        },
      )
      beforeEachComplete = true
    }
  })

  afterAll(async () => {
    await teardown(
      { emailAddresses, sudos: [sudo] },
      { emailClient: instanceUnderTest, profilesClient, userClient },
    )
  })

  function expectSetupComplete() {
    expect(beforeEachComplete).toEqual(true)
  }

  describe('Error paths', () => {
    it('throws UnauthorizedAddressError if unknown mask id is used', async () => {
      if (!runTests) {
        log.debug('Email Masks not enabled. Skipping.')
        return
      }
      expectSetupComplete()
      const input = constructSendMessageInputSansSenderId({
        from: { emailAddress: emailMask.maskAddress },
        to: [{ emailAddress: SUCCESS_SIMULATOR_ADDRESS }],
      })

      await expect(
        instanceUnderTest.sendMaskedEmailMessage({
          ...input,
          senderEmailMaskId: v4(),
        }),
      ).rejects.toThrow(UnauthorizedAddressError)
    })

    it('throws UnauthorizedAddressError if from address does not match mask', async () => {
      if (!runTests) {
        log.debug('Email Masks not enabled. Skipping.')
        return
      }
      expectSetupComplete()
      const mask2 = await provisionEmailMask(
        ownershipProofToken,
        instanceUnderTest,
        {
          realAddress: emailAddress.emailAddress,
        },
      )
      const input = constructSendMessageInputSansSenderId({
        from: { emailAddress: mask2.maskAddress },
        to: [{ emailAddress: SUCCESS_SIMULATOR_ADDRESS }],
      })

      await expect(
        instanceUnderTest.sendMaskedEmailMessage({
          ...input,
          senderEmailMaskId: emailMask.id,
        }),
      ).rejects.toThrow(UnauthorizedAddressError)
    })

    it('throws InvalidEmailContentsError if passed no from address', async () => {
      if (!runTests) {
        log.debug('Email Masks not enabled. Skipping.')
        return
      }
      expectSetupComplete()
      const input = constructSendMessageInputSansSenderId({
        from: { emailAddress: emailMask.maskAddress },
        to: [{ emailAddress: SUCCESS_SIMULATOR_ADDRESS }],
      })

      await expect(
        instanceUnderTest.sendMaskedEmailMessage({
          ...input,
          emailMessageHeader: {
            ...input.emailMessageHeader,
            from: { emailAddress: '' },
          },
          senderEmailMaskId: emailMask.id,
        }),
      ).rejects.toThrow(InvalidEmailContentsError)
    })

    it('throws MessageSizeLimitExceededError if message exceeds max size', async () => {
      if (!runTests) {
        log.debug('Email Masks not enabled. Skipping.')
        return
      }
      expectSetupComplete()
      const { emailMessageMaxOutboundMessageSize } =
        await configurationDataService.getConfigurationData()

      const largeAttachmentData = Buffer.alloc(
        emailMessageMaxOutboundMessageSize,
      )
      const attachment: EmailAttachment = {
        data: BufferUtil.toString(largeAttachmentData),
        filename: 'large-attachment.txt',
        inlineAttachment: false,
        mimeType: 'text/plain',
        contentTransferEncoding: 'quoted-printable',
        contentId: undefined,
      }
      const input = constructSendMessageInputSansSenderId({
        from: { emailAddress: emailMask.maskAddress },
        to: [{ emailAddress: SUCCESS_SIMULATOR_ADDRESS }],
        attachments: [attachment],
      })

      await expect(
        instanceUnderTest.sendMaskedEmailMessage({
          ...input,
          senderEmailMaskId: emailMask.id,
        }),
      ).rejects.toThrow(MessageSizeLimitExceededError)
    })

    it('throws InvalidEmailContentsError if message has no recipients', async () => {
      if (!runTests) {
        log.debug('Email Masks not enabled. Skipping.')
        return
      }
      expectSetupComplete()
      const input = constructSendMessageInputSansSenderId({
        from: { emailAddress: emailMask.maskAddress },
      })

      await expect(
        instanceUnderTest.sendMaskedEmailMessage({
          ...input,
          senderEmailMaskId: emailMask.id,
        }),
      ).rejects.toThrow(InvalidEmailContentsError)
    })

    it('throws InvalidEmailContentsError for various prohibited attachment file extensions', async () => {
      if (!runTests) {
        log.debug('Email Masks not enabled. Skipping.')
        return
      }
      expectSetupComplete()
      const { prohibitedFileExtensions } =
        await configurationDataService.getConfigurationData()

      for (let i = 0; i < 3; i++) {
        const extensionType = getRandomElement(prohibitedFileExtensions)
        log.info(`Type: ${extensionType}`)

        const attachment: EmailAttachment = {
          data: Base64.encodeString('Attachment content'),
          filename: `bad.${extensionType}`,
          inlineAttachment: false,
          mimeType: 'text/plain',
          contentTransferEncoding: 'quoted-printable',
          contentId: undefined,
        }
        const input = constructSendMessageInputSansSenderId({
          from: { emailAddress: emailMask.maskAddress },
          to: [{ emailAddress: SUCCESS_SIMULATOR_ADDRESS }],
          attachments: [attachment],
        })

        await expect(
          instanceUnderTest.sendMaskedEmailMessage({
            ...input,
            senderEmailMaskId: emailMask.id,
          }),
        ).rejects.toThrow(InvalidEmailContentsError)
      }
    })
  })

  enum Paths {
    IN_NETWORK = 'IN_NETWORK',
    OUT_NETWORK = 'OUT_NETWORK',
  }
  describe.each(Object.values(Paths))('%p path', (path) => {
    let emailAddress2: EmailAddress
    let emailMask2: EmailMask
    let expectedEncryptionStatus: EncryptionStatus
    let isInNetwork: boolean
    beforeEach(async () => {
      isInNetwork = path === Paths.IN_NETWORK
      expectedEncryptionStatus =
        isInNetwork && sendEncryptedEmailEnabled
          ? EncryptionStatus.ENCRYPTED
          : EncryptionStatus.UNENCRYPTED
      if (runTests && isInNetwork) {
        emailAddress2 = await provisionEmailAddress(
          ownershipProofToken,
          instanceUnderTest,
        )
        emailAddresses.push(emailAddress2)
        emailMask2 = await provisionEmailMask(
          ownershipProofToken,
          instanceUnderTest,
          {
            realAddress: emailAddress2.emailAddress,
          },
        )
      }
    })

    it('returns expected output when sending single message to success simulator', async () => {
      if (!runTests) {
        log.debug('Email Masks not enabled. Skipping.')
        return
      }
      expectSetupComplete()
      const input = constructSendMessageInputSansSenderId({
        from: { emailAddress: emailMask.maskAddress },
        to: [
          {
            emailAddress: isInNetwork
              ? emailAddress2.emailAddress
              : SUCCESS_SIMULATOR_ADDRESS,
          },
        ],
      })

      const result = await instanceUnderTest.sendMaskedEmailMessage({
        ...input,
        senderEmailMaskId: emailMask.id,
      })
      const { id: sentId } = result

      expect(sentId).toMatch(
        /^em-msg-[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
      )

      let sent: EmailMessage | undefined
      await waitForExpect(async () => {
        sent = await instanceUnderTest.getEmailMessage({
          id: sentId,
        })
        expect(sent).toBeDefined()
      })

      expect(sent).toMatchObject({
        id: sentId,
        hasAttachments: false,
        date: expect.any(Date),
        ...input.emailMessageHeader,
        from: [input.emailMessageHeader.from],
        encryptionStatus: expectedEncryptionStatus,
      })

      const messageWithBody = await instanceUnderTest.getEmailMessageWithBody({
        emailAddressId: emailAddress.id,
        id: sentId,
      })

      expect(messageWithBody).toBeDefined()
      expect(messageWithBody!.body).toEqual(input.body)
      expect(messageWithBody!.attachments).toHaveLength(0)
      expect(messageWithBody!.inlineAttachments).toHaveLength(0)
    })

    it('successfully sends a message with multiple recipients', async () => {
      if (!runTests) {
        log.debug('Email Masks not enabled. Skipping.')
        return
      }
      expectSetupComplete()
      const recipientAddress = await provisionEmailAddress(
        ownershipProofToken,
        instanceUnderTest,
        {
          localPart: generateSafeLocalPart('mask-send-test-recip'),
        },
      )
      const input = constructSendMessageInputSansSenderId({
        from: { emailAddress: emailMask.maskAddress },
        to: [
          {
            emailAddress: isInNetwork
              ? emailAddress2.emailAddress
              : SUCCESS_SIMULATOR_ADDRESS,
          },
          {
            emailAddress: isInNetwork
              ? emailMask2.maskAddress
              : OOTO_SIMULATOR_ADDRESS,
          },
          { emailAddress: recipientAddress.emailAddress },
        ],
      })

      const result = await instanceUnderTest.sendMaskedEmailMessage({
        ...input,
        senderEmailMaskId: emailMask.id,
      })
      const { id: sentId } = result

      expect(sentId).toMatch(
        /^em-msg-[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
      )

      let sent: EmailMessage | undefined
      await waitForExpect(async () => {
        sent = await instanceUnderTest.getEmailMessage({
          id: sentId,
        })
        expect(sent).toBeDefined()
      })

      expect(sent).toMatchObject({
        id: sentId,
        hasAttachments: false,
        date: expect.any(Date),
        ...input.emailMessageHeader,
        from: [input.emailMessageHeader.from],
        encryptionStatus: expectedEncryptionStatus,
      })

      const messageWithBody = await instanceUnderTest.getEmailMessageWithBody({
        emailAddressId: emailAddress.id,
        id: sentId,
      })

      expect(messageWithBody).toBeDefined()
      expect(messageWithBody!.body).toEqual(input.body)
      expect(messageWithBody!.attachments).toHaveLength(0)
      expect(messageWithBody!.inlineAttachments).toHaveLength(0)
    })

    it('successully sends a message with a cc recipient', async () => {
      if (!runTests) {
        log.debug('Email Masks not enabled. Skipping.')
        return
      }
      expectSetupComplete()
      const input = constructSendMessageInputSansSenderId({
        from: { emailAddress: emailMask.maskAddress },
        cc: [
          {
            emailAddress: isInNetwork
              ? emailAddress2.emailAddress
              : SUCCESS_SIMULATOR_ADDRESS,
          },
        ],
      })

      const result = await instanceUnderTest.sendMaskedEmailMessage({
        ...input,
        senderEmailMaskId: emailMask.id,
      })
      const { id: sentId } = result

      expect(sentId).toMatch(
        /^em-msg-[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
      )

      let sent: EmailMessage | undefined
      await waitForExpect(async () => {
        sent = await instanceUnderTest.getEmailMessage({
          id: sentId,
        })
        expect(sent).toBeDefined()
      })

      expect(sent).toMatchObject({
        id: sentId,
        hasAttachments: false,
        date: expect.any(Date),
        ...input.emailMessageHeader,
        from: [input.emailMessageHeader.from],
        encryptionStatus: expectedEncryptionStatus,
      })

      const messageWithBody = await instanceUnderTest.getEmailMessageWithBody({
        emailAddressId: emailAddress.id,
        id: sentId,
      })

      expect(messageWithBody).toBeDefined()
      expect(messageWithBody!.body).toEqual(input.body)
      expect(messageWithBody!.attachments).toHaveLength(0)
      expect(messageWithBody!.inlineAttachments).toHaveLength(0)
    })

    it('successfully sends a message with a bcc recipient', async () => {
      if (!runTests) {
        log.debug('Email Masks not enabled. Skipping.')
        return
      }
      expectSetupComplete()
      const input = constructSendMessageInputSansSenderId({
        from: { emailAddress: emailMask.maskAddress },
        bcc: [
          {
            emailAddress: isInNetwork
              ? emailAddress2.emailAddress
              : SUCCESS_SIMULATOR_ADDRESS,
          },
        ],
      })

      const result = await instanceUnderTest.sendMaskedEmailMessage({
        ...input,
        senderEmailMaskId: emailMask.id,
      })
      const { id: sentId } = result

      expect(sentId).toMatch(
        /^em-msg-[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
      )

      let sent: EmailMessage | undefined
      await waitForExpect(async () => {
        sent = await instanceUnderTest.getEmailMessage({
          id: sentId,
        })
        expect(sent).toBeDefined()
      })

      expect(sent).toMatchObject({
        id: sentId,
        hasAttachments: false,
        date: expect.any(Date),
        ...input.emailMessageHeader,
        from: [input.emailMessageHeader.from],
        encryptionStatus: expectedEncryptionStatus,
      })

      const messageWithBody = await instanceUnderTest.getEmailMessageWithBody({
        emailAddressId: emailAddress.id,
        id: sentId,
      })

      expect(messageWithBody).toBeDefined()
      expect(messageWithBody!.body).toEqual(input.body)
      expect(messageWithBody!.attachments).toHaveLength(0)
      expect(messageWithBody!.inlineAttachments).toHaveLength(0)
    })

    it('successfully sends a message with all types of recipients', async () => {
      if (!runTests) {
        log.debug('Email Masks not enabled. Skipping.')
        return
      }
      expectSetupComplete()
      const recipient = isInNetwork
        ? emailAddress2.emailAddress
        : SUCCESS_SIMULATOR_ADDRESS
      const input = constructSendMessageInputSansSenderId({
        from: { emailAddress: emailMask.maskAddress },
        to: [{ emailAddress: recipient }],
        cc: [{ emailAddress: recipient }],
        bcc: [{ emailAddress: recipient }],
      })

      const result = await instanceUnderTest.sendMaskedEmailMessage({
        ...input,
        senderEmailMaskId: emailMask.id,
      })
      const { id: sentId } = result

      expect(sentId).toMatch(
        /^em-msg-[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
      )

      let sent: EmailMessage | undefined
      await waitForExpect(async () => {
        sent = await instanceUnderTest.getEmailMessage({
          id: sentId,
        })
        expect(sent).toBeDefined()
      })

      expect(sent).toMatchObject({
        id: sentId,
        hasAttachments: false,
        date: expect.any(Date),
        ...input.emailMessageHeader,
        from: [input.emailMessageHeader.from],
        encryptionStatus: expectedEncryptionStatus,
      })

      const messageWithBody = await instanceUnderTest.getEmailMessageWithBody({
        emailAddressId: emailAddress.id,
        id: sentId,
      })

      expect(messageWithBody).toBeDefined()
      expect(messageWithBody!.body).toEqual(input.body)
      expect(messageWithBody!.attachments).toHaveLength(0)
      expect(messageWithBody!.inlineAttachments).toHaveLength(0)
    })

    it('successfully sends unencrypted message with mix of in- and out- network addresses', async () => {
      if (!runTests) {
        log.debug('Email Masks not enabled. Skipping.')
        return
      }
      expectSetupComplete()
      const recipientAddress = await provisionEmailAddress(
        ownershipProofToken,
        instanceUnderTest,
        {
          localPart: generateSafeLocalPart('mask-send-test-recip'),
        },
      )
      emailAddresses.push(recipientAddress)
      const input = constructSendMessageInputSansSenderId({
        from: { emailAddress: emailMask.maskAddress },
        to: [
          { emailAddress: SUCCESS_SIMULATOR_ADDRESS },
          { emailAddress: recipientAddress.emailAddress },
        ],
      })

      const result = await instanceUnderTest.sendMaskedEmailMessage({
        ...input,
        senderEmailMaskId: emailMask.id,
      })
      const { id: sentId } = result

      expect(sentId).toMatch(
        /^em-msg-[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
      )

      let sent: EmailMessage | undefined
      await waitForExpect(async () => {
        sent = await instanceUnderTest.getEmailMessage({
          id: sentId,
        })
        expect(sent).toBeDefined()
      })

      expect(sent).toMatchObject({
        id: sentId,
        hasAttachments: false,
        date: expect.any(Date),
        ...input.emailMessageHeader,
        from: [input.emailMessageHeader.from],
        // This includes an out-network address so should always be unencrypted
        encryptionStatus: EncryptionStatus.UNENCRYPTED,
      })

      const messageWithBody = await instanceUnderTest.getEmailMessageWithBody({
        emailAddressId: emailAddress.id,
        id: sentId,
      })

      expect(messageWithBody).toBeDefined()
      expect(messageWithBody!.body).toEqual(input.body)
      expect(messageWithBody!.attachments).toHaveLength(0)
      expect(messageWithBody!.inlineAttachments).toHaveLength(0)
    })

    it('successfully sends message that includes another mask as recipient', async () => {
      if (!runTests) {
        log.debug('Email Masks not enabled. Skipping.')
        return
      }
      expectSetupComplete()
      const recipientAddress = await provisionEmailAddress(
        ownershipProofToken,
        instanceUnderTest,
      )
      emailAddresses.push(recipientAddress)
      const recipientMask = await provisionEmailMask(
        ownershipProofToken,
        instanceUnderTest,
        {
          realAddress: recipientAddress.emailAddress,
        },
      )
      const input = constructSendMessageInputSansSenderId({
        from: { emailAddress: emailMask.maskAddress },
        to: [
          { emailAddress: SUCCESS_SIMULATOR_ADDRESS },
          { emailAddress: recipientMask.maskAddress },
        ],
      })

      const result = await instanceUnderTest.sendMaskedEmailMessage({
        ...input,
        senderEmailMaskId: emailMask.id,
      })
      const { id: sentId } = result

      expect(sentId).toMatch(
        /^em-msg-[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
      )

      let sent: EmailMessage | undefined
      await waitForExpect(async () => {
        sent = await instanceUnderTest.getEmailMessage({
          id: sentId,
        })
        expect(sent).toBeDefined()
      })

      expect(sent).toMatchObject({
        id: sentId,
        hasAttachments: false,
        date: expect.any(Date),
        ...input.emailMessageHeader,
        from: [input.emailMessageHeader.from],
        // This includes an out-network address so should always be unencrypted
        encryptionStatus: EncryptionStatus.UNENCRYPTED,
      })

      const messageWithBody = await instanceUnderTest.getEmailMessageWithBody({
        emailAddressId: emailAddress.id,
        id: sentId,
      })

      expect(messageWithBody).toBeDefined()
      expect(messageWithBody!.body).toEqual(input.body)
      expect(messageWithBody!.attachments).toHaveLength(0)
      expect(messageWithBody!.inlineAttachments).toHaveLength(0)
    })

    it('successfully sends a message with special characters', async () => {
      if (!runTests) {
        log.debug('Email Masks not enabled. Skipping.')
        return
      }
      expectSetupComplete()
      const emojiSubject = 'emoji me: 😎 ¡ ™ £ ¢ ∞ § ¶ • ª.'
      const emojiBody =
        "Let's put emojis in the body as well: for example 😱, 💐 and special chars  ¡ ™ £ ¢ ∞ § ¶ • ª."

      const input = constructSendMessageInputSansSenderId({
        from: { emailAddress: emailMask.maskAddress },
        to: [
          {
            emailAddress: isInNetwork
              ? emailAddress2.emailAddress
              : SUCCESS_SIMULATOR_ADDRESS,
          },
        ],
        subject: emojiSubject,
        body: emojiBody,
      })

      const result = await instanceUnderTest.sendMaskedEmailMessage({
        ...input,
        senderEmailMaskId: emailMask.id,
      })
      const { id: sentId } = result

      expect(sentId).toMatch(
        /^em-msg-[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
      )

      let sent: EmailMessage | undefined
      await waitForExpect(async () => {
        sent = await instanceUnderTest.getEmailMessage({
          id: sentId,
        })
        expect(sent).toBeDefined()
      })

      expect(sent).toMatchObject({
        id: sentId,
        hasAttachments: false,
        date: expect.any(Date),
        ...input.emailMessageHeader,
        from: [input.emailMessageHeader.from],
        encryptionStatus: expectedEncryptionStatus,
      })

      const messageWithBody = await instanceUnderTest.getEmailMessageWithBody({
        emailAddressId: emailAddress.id,
        id: sentId,
      })

      expect(messageWithBody).toBeDefined()
      expect(messageWithBody!.body).toEqual(input.body)
      expect(messageWithBody!.attachments).toHaveLength(0)
      expect(messageWithBody!.inlineAttachments).toHaveLength(0)
    })

    it('successfully sends a message with attachments', async () => {
      if (!runTests) {
        log.debug('Email Masks not enabled. Skipping.')
        return
      }
      expectSetupComplete()
      const imageAttachment: EmailAttachment = {
        data: imageData,
        filename: 'dogImage.jpg',
        inlineAttachment: false,
        mimeType: 'image/jpg',
        contentTransferEncoding: 'base64',
        contentId: undefined,
      }
      const pdfAttachment: EmailAttachment = {
        data: pdfData,
        filename: 'lorem-ipsum.pdf',
        inlineAttachment: false,
        mimeType: 'application/pdf',
        contentTransferEncoding: 'base64',
        contentId: undefined,
      }
      const input = constructSendMessageInputSansSenderId({
        from: { emailAddress: emailMask.maskAddress },
        to: [
          {
            emailAddress: isInNetwork
              ? emailAddress2.emailAddress
              : SUCCESS_SIMULATOR_ADDRESS,
          },
        ],
        attachments: [imageAttachment, pdfAttachment],
      })

      const result = await instanceUnderTest.sendMaskedEmailMessage({
        ...input,
        senderEmailMaskId: emailMask.id,
      })
      const { id: sentId } = result

      expect(sentId).toMatch(
        /^em-msg-[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
      )

      let sent: EmailMessage | undefined
      await waitForExpect(async () => {
        sent = await instanceUnderTest.getEmailMessage({
          id: sentId,
        })
        expect(sent).toBeDefined()
      })

      expect(sent).toMatchObject({
        id: sentId,
        hasAttachments: true,
        date: expect.any(Date),
        ...input.emailMessageHeader,
        from: [input.emailMessageHeader.from],
        encryptionStatus: expectedEncryptionStatus,
      })

      const messageWithBody = await instanceUnderTest.getEmailMessageWithBody({
        emailAddressId: emailAddress.id,
        id: sentId,
      })

      expect(messageWithBody).toBeDefined()
      expect(messageWithBody!.body).toEqual(input.body)
      expect(messageWithBody!.attachments).toHaveLength(
        input.attachments.length,
      )
      expect(
        messageWithBody?.attachments.find(
          (a) => a.filename === imageAttachment.filename,
        ),
      ).toBeDefined()
      expect(
        messageWithBody?.attachments.find(
          (a) => a.filename === pdfAttachment.filename,
        ),
      ).toBeDefined()
      expect(messageWithBody!.inlineAttachments).toHaveLength(0)
    })

    it('successfully sends a message an inline attachment', async () => {
      if (!runTests) {
        log.debug('Email Masks not enabled. Skipping.')
        return
      }
      expectSetupComplete()
      const contentId = `content-id-${v4()}`
      const imageAttachment: EmailAttachment = {
        data: imageData,
        filename: 'dogImage.jpg',
        inlineAttachment: true,
        mimeType: 'image/jpg',
        contentTransferEncoding: 'base64',
        contentId,
      }
      const input = constructSendMessageInputSansSenderId({
        from: { emailAddress: emailMask.maskAddress },
        to: [
          {
            emailAddress: isInNetwork
              ? emailAddress2.emailAddress
              : SUCCESS_SIMULATOR_ADDRESS,
          },
        ],
        inlineAttachments: [imageAttachment],
        body: `<div>Hello, world! Here is a dog photo! <img src="cid:${contentId}">`,
      })

      const result = await instanceUnderTest.sendMaskedEmailMessage({
        ...input,
        senderEmailMaskId: emailMask.id,
      })
      const { id: sentId } = result

      expect(sentId).toMatch(
        /^em-msg-[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
      )

      let sent: EmailMessage | undefined
      await waitForExpect(async () => {
        sent = await instanceUnderTest.getEmailMessage({
          id: sentId,
        })
        expect(sent).toBeDefined()
      })

      expect(sent).toMatchObject({
        id: sentId,
        hasAttachments: true,
        date: expect.any(Date),
        ...input.emailMessageHeader,
        from: [input.emailMessageHeader.from],
        encryptionStatus: expectedEncryptionStatus,
      })

      const messageWithBody = await instanceUnderTest.getEmailMessageWithBody({
        emailAddressId: emailAddress.id,
        id: sentId,
      })

      expect(messageWithBody).toBeDefined()
      expect(messageWithBody!.body).toEqual(input.body)
      expect(messageWithBody!.attachments).toHaveLength(0)
      expect(messageWithBody!.inlineAttachments).toHaveLength(
        input.inlineAttachments.length,
      )
      expect(
        messageWithBody?.inlineAttachments.find(
          (a) => a.filename === imageAttachment.filename,
        ),
      ).toBeDefined()
    })

    it('successfully sends a message with sender and recipient display names', async () => {
      if (!runTests) {
        log.debug('Email Masks not enabled. Skipping.')
        return
      }
      expectSetupComplete()
      const input = constructSendMessageInputSansSenderId({
        from: {
          emailAddress: emailMask.maskAddress,
          displayName: 'Anony Mouse',
        },
        to: [
          {
            emailAddress: isInNetwork
              ? emailAddress2.emailAddress
              : SUCCESS_SIMULATOR_ADDRESS,
            displayName: 'Display McNameface',
          },
        ],
      })

      const result = await instanceUnderTest.sendMaskedEmailMessage({
        ...input,
        senderEmailMaskId: emailMask.id,
      })
      const { id: sentId } = result

      expect(sentId).toMatch(
        /^em-msg-[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
      )

      let sent: EmailMessage | undefined
      await waitForExpect(async () => {
        sent = await instanceUnderTest.getEmailMessage({
          id: sentId,
        })
        expect(sent).toBeDefined()
      })

      expect(sent).toMatchObject({
        id: sentId,
        hasAttachments: false,
        date: expect.any(Date),
        ...input.emailMessageHeader,
        from: [input.emailMessageHeader.from],
        encryptionStatus: expectedEncryptionStatus,
      })

      const messageWithBody = await instanceUnderTest.getEmailMessageWithBody({
        emailAddressId: emailAddress.id,
        id: sentId,
      })

      expect(messageWithBody).toBeDefined()
      expect(messageWithBody!.body).toEqual(input.body)
      expect(messageWithBody!.attachments).toHaveLength(0)
      expect(messageWithBody!.inlineAttachments).toHaveLength(0)
    })
  })
})
