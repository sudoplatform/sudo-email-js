/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EntityDataFactory } from '../../data-factory/entity'
import { DecodeError, PublicKeyFormat } from '@sudoplatform/sudo-common'
import { EmailMessageUtil } from '../../../../src/private/util/emailMessageUtil'
import { EmailAccountService } from '../../../../src/private/domain/entities/account/emailAccountService'
import { EmailCryptoService } from '../../../../src/private/domain/entities/secure/emailCryptoService'
import { EmailDomainService } from '../../../../src/private/domain/entities/emailDomain/emailDomainService'
import { EmailConfigurationDataEntity } from '../../../../src/private/domain/entities/configuration/emailConfigurationDataEntity'
import { EmailDomainEntity } from '../../../../src/private/domain/entities/emailDomain/emailDomainEntity'
import { EmailAddressPublicInfoEntity } from '../../../../src/private/domain/entities/account/emailAddressPublicInfoEntity'
import {
  EmailAddressDetail,
  EmailAttachment,
  InNetworkAddressNotFoundError,
  InternalError,
  InvalidEmailContentsError,
  LimitExceededError,
  MessageSizeLimitExceededError,
} from '../../../../src/public'
import {
  Rfc822MessageDataProcessor,
  EmailMessageDetails,
} from '../../../../src/private/util/rfc822MessageDataProcessor'
import {
  SecureEmailAttachmentType,
  LEGACY_BODY_CONTENT_ID,
  LEGACY_KEY_EXCHANGE_CONTENT_ID,
} from '../../../../src/private/domain/entities/secure/secureEmailAttachmentType'
import {
  anything,
  capture,
  instance,
  mock,
  reset,
  verify,
  when,
} from 'ts-mockito'

describe('EmailMessageUtil', () => {
  let mockAccountService = mock<EmailAccountService>()
  let mockEmailCryptoService = mock<EmailCryptoService>()
  let mockDomainService = mock<EmailDomainService>()
  let emailMessageUtil: EmailMessageUtil

  const unitTestConfig: EmailConfigurationDataEntity = {
    ...EntityDataFactory.configurationData,
    emailMessageRecipientsLimit: 50,
    encryptedEmailMessageRecipientsLimit: 25,
  }

  const unitTestDomains: EmailDomainEntity[] = [
    EntityDataFactory.emailDomain,
    { domain: 'test.com' },
    { domain: 'example.com' },
  ]

  const emailAddressPublicInfos: EmailAddressPublicInfoEntity[] = [
    ...EntityDataFactory.emailAddressesPublicInfo,
    {
      emailAddress: 'user1@example.com',
      keyId: 'key1',
      publicKeyDetails: {
        publicKey: 'publicKey1',
        keyFormat: PublicKeyFormat.RSAPublicKey,
        algorithm: 'algorithm',
      },
    },
    {
      emailAddress: 'user2@example.com',
      keyId: 'key2',
      publicKeyDetails: {
        publicKey: 'publicKey2',
        keyFormat: PublicKeyFormat.RSAPublicKey,
        algorithm: 'algorithm',
      },
    },
  ]

  beforeEach(() => {
    reset(mockAccountService)
    reset(mockEmailCryptoService)
    reset(mockDomainService)

    emailMessageUtil = new EmailMessageUtil({
      accountService: instance(mockAccountService),
      emailCryptoService: instance(mockEmailCryptoService),
      domainService: instance(mockDomainService),
    })
  })

  describe('constructor', () => {
    it('should initialize with all services', () => {
      const util = new EmailMessageUtil({
        accountService: mockAccountService,
        emailCryptoService: mockEmailCryptoService,
        domainService: mockDomainService,
      })
      expect(util).toBeInstanceOf(EmailMessageUtil)
    })

    it('should initialize with optional services', () => {
      const util = new EmailMessageUtil({})
      expect(util).toBeInstanceOf(EmailMessageUtil)
    })
  })

  describe('allRecipientsInternal', () => {
    it('should return true when all recipients are internal', () => {
      const recipients = ['user1@example.com', 'user2@example.com']
      const result = EmailMessageUtil.allRecipientsInternal(
        recipients,
        unitTestDomains,
      )
      expect(result).toBe(true)
    })

    it('should return false when some recipients are external', () => {
      const recipients = ['user1@example.com', 'external@external.com']
      const result = EmailMessageUtil.allRecipientsInternal(
        recipients,
        unitTestDomains,
      )
      expect(result).toBe(false)
    })

    it('should return false when no recipients', () => {
      const recipients: string[] = []
      const result = EmailMessageUtil.allRecipientsInternal(
        recipients,
        unitTestDomains,
      )
      expect(result).toBe(false)
    })

    it('should handle case insensitive domain matching', () => {
      const recipients = ['user1@EXAMPLE.COM', 'user2@unitTest.OrG']
      const result = EmailMessageUtil.allRecipientsInternal(
        recipients,
        unitTestDomains,
      )
      expect(result).toBe(true)
    })
  })

  describe('verifyAttachmentValidity', () => {
    const prohibitedExtensions = ['.exe', '.bat', '.scr']

    it('should not throw for allowed file extensions', () => {
      const attachments: EmailAttachment[] = [
        {
          filename: 'document.pdf',
          mimeType: 'application/pdf',
          inlineAttachment: false,
          contentId: '1',
          data: 'data',
        },
        {
          filename: 'image.jpg',
          mimeType: 'image/jpeg',
          inlineAttachment: true,
          contentId: '2',
          data: 'data',
        },
      ]
      const inlineAttachments: EmailAttachment[] = [
        {
          filename: 'logo.png',
          mimeType: 'image/png',
          data: 'content3',
          contentId: '3',
          inlineAttachment: true,
        },
      ]

      expect(() => {
        emailMessageUtil.verifyAttachmentValidity(
          prohibitedExtensions,
          attachments,
          inlineAttachments,
        )
      }).not.toThrow()
    })

    it('should throw for prohibited file extensions', () => {
      const attachments: EmailAttachment[] = [
        {
          filename: 'malware.exe',
          mimeType: 'application/octet-stream',
          data: 'content1',
          contentId: '1',
          inlineAttachment: false,
        },
      ]

      expect(() => {
        emailMessageUtil.verifyAttachmentValidity(
          prohibitedExtensions,
          attachments,
          [],
        )
      }).toThrow(InvalidEmailContentsError)
    })

    it('should throw for prohibited inline attachments', () => {
      const inlineAttachments: EmailAttachment[] = [
        {
          filename: 'script.bat',
          mimeType: 'application/octet-stream',
          data: 'content1',
          contentId: '1',
          inlineAttachment: true,
        },
      ]

      expect(() => {
        emailMessageUtil.verifyAttachmentValidity(
          prohibitedExtensions,
          [],
          inlineAttachments,
        )
      }).toThrow(InvalidEmailContentsError)
    })

    it('should handle case insensitive extension checking', () => {
      const attachments: EmailAttachment[] = [
        {
          filename: 'file.EXE',
          mimeType: 'application/octet-stream',
          data: 'content1',
          contentId: '1',
          inlineAttachment: false,
        },
      ]

      expect(() => {
        emailMessageUtil.verifyAttachmentValidity(
          prohibitedExtensions,
          attachments,
          [],
        )
      }).toThrow(InvalidEmailContentsError)
    })

    it('should handle files without extensions', () => {
      const attachments: EmailAttachment[] = [
        {
          filename: 'README',
          mimeType: 'text/plain',
          data: 'content1',
          contentId: '1',
          inlineAttachment: false,
        },
      ]

      expect(() => {
        emailMessageUtil.verifyAttachmentValidity(
          prohibitedExtensions,
          attachments,
          [],
        )
      }).not.toThrow()
    })
  })

  describe('retrieveAndVerifyPublicInfo', () => {
    const recipients = ['user1@example.com', 'user2@example.com']
    const sender = 'sender@example.com'

    it('should throw error when accountService is not provided', async () => {
      const utilWithoutService = new EmailMessageUtil({})

      await expect(
        utilWithoutService.retrieveAndVerifyPublicInfo(recipients, sender),
      ).rejects.toThrow(InternalError)
    })

    it('should successfully retrieve and verify public info for all addresses', async () => {
      const expectedAddresses = [...recipients, sender]
      const mockPublicInfo = [
        ...emailAddressPublicInfos,
        {
          emailAddress: sender,
          keyId: 'senderKey',
          publicKeyDetails: {
            publicKey: 'senderPublicKey',
            keyFormat: PublicKeyFormat.RSAPublicKey,
            algorithm: 'RSA',
          },
        },
      ]

      when(mockAccountService.lookupPublicInfo(anything())).thenResolve(
        mockPublicInfo,
      )

      const result = await emailMessageUtil.retrieveAndVerifyPublicInfo(
        recipients,
        sender,
      )

      verify(mockAccountService.lookupPublicInfo(anything())).once()
      const [capturedArg] = capture(mockAccountService.lookupPublicInfo).last()
      expect(capturedArg).toEqual({
        emailAddresses: expectedAddresses,
      })
      expect(result).toEqual(mockPublicInfo)
    })

    it('should throw InNetworkAddressNotFoundError when some recipients not found', async () => {
      const incompletePublicInfo = [emailAddressPublicInfos[0]] // Missing some addresses

      when(mockAccountService.lookupPublicInfo(anything())).thenResolve(
        incompletePublicInfo,
      )

      await expect(
        emailMessageUtil.retrieveAndVerifyPublicInfo(recipients, sender),
      ).rejects.toThrow(InNetworkAddressNotFoundError)
    })
  })

  describe('processDownloadedEncryptedMessage', () => {
    const mockEncryptedMessage = `Content-Type: multipart/mixed; boundary="boundary123"

--boundary123
Content-Type: application/octet-stream
Content-ID: <${SecureEmailAttachmentType.KEY_EXCHANGE.contentId}>

keyData
--boundary123
Content-Type: application/octet-stream
Content-ID: <${SecureEmailAttachmentType.BODY.contentId}>

bodyData
--boundary123--`

    beforeEach(() => {
      jest
        .spyOn(Rfc822MessageDataProcessor, 'parseInternetMessageData')
        .mockResolvedValue({
          from: [{ emailAddress: 'sender@example.com' }],
          to: [{ emailAddress: 'recipient@example.com' }],
          attachments: [
            {
              contentId: SecureEmailAttachmentType.KEY_EXCHANGE.contentId,
              data: 'keyData',
              filename: 'key.dat',
              mimeType: 'application/octet-stream',
              inlineAttachment: false,
            },
            {
              contentId: SecureEmailAttachmentType.BODY.contentId,
              data: 'bodyData',
              filename: 'body.dat',
              mimeType: 'application/octet-stream',
              inlineAttachment: false,
            },
          ],
        })
    })

    it('should throw error when emailCryptoService is not provided', async () => {
      const utilWithoutService = new EmailMessageUtil({})

      await expect(
        utilWithoutService.processDownloadedEncryptedMessage(
          mockEncryptedMessage,
        ),
      ).rejects.toThrow(InternalError)
    })

    it('should successfully decrypt encrypted message', async () => {
      const expectedDecryptedData = new ArrayBuffer(100)
      when(mockEmailCryptoService.decrypt(anything())).thenResolve(
        expectedDecryptedData,
      )

      const result =
        await emailMessageUtil.processDownloadedEncryptedMessage(
          mockEncryptedMessage,
        )

      expect(result).toBe(expectedDecryptedData)
    })

    it('should throw DecodeError when no attachments found', async () => {
      jest
        .spyOn(Rfc822MessageDataProcessor, 'parseInternetMessageData')
        .mockResolvedValue({
          from: [{ emailAddress: 'sender@example.com' }],
          attachments: [],
        })

      await expect(
        emailMessageUtil.processDownloadedEncryptedMessage(
          mockEncryptedMessage,
        ),
      ).rejects.toThrow(DecodeError)
    })

    it('should throw DecodeError when no key attachments found', async () => {
      jest
        .spyOn(Rfc822MessageDataProcessor, 'parseInternetMessageData')
        .mockResolvedValue({
          from: [{ emailAddress: 'sender@example.com' }],
          attachments: [
            {
              contentId: 'some-other-content',
              data: 'data',
              filename: 'file.dat',
              mimeType: 'application/octet-stream',
              inlineAttachment: false,
            },
          ],
        })

      await expect(
        emailMessageUtil.processDownloadedEncryptedMessage(
          mockEncryptedMessage,
        ),
      ).rejects.toThrow(DecodeError)
    })

    it('should throw DecodeError when no body attachment found', async () => {
      jest
        .spyOn(Rfc822MessageDataProcessor, 'parseInternetMessageData')
        .mockResolvedValue({
          from: [{ emailAddress: 'sender@example.com' }],
          attachments: [
            {
              contentId: SecureEmailAttachmentType.KEY_EXCHANGE.contentId,
              data: 'keyData',
              filename: 'key.dat',
              mimeType: 'application/octet-stream',
              inlineAttachment: false,
            },
          ],
        })

      await expect(
        emailMessageUtil.processDownloadedEncryptedMessage(
          mockEncryptedMessage,
        ),
      ).rejects.toThrow(DecodeError)
    })

    it('should handle legacy content IDs', async () => {
      jest
        .spyOn(Rfc822MessageDataProcessor, 'parseInternetMessageData')
        .mockResolvedValue({
          from: [{ emailAddress: 'sender@example.com' }],
          attachments: [
            {
              contentId: LEGACY_KEY_EXCHANGE_CONTENT_ID,
              data: 'keyData',
              filename: 'key.dat',
              mimeType: 'application/octet-stream',
              inlineAttachment: false,
            },
            {
              contentId: LEGACY_BODY_CONTENT_ID,
              data: 'bodyData',
              filename: 'body.dat',
              mimeType: 'application/octet-stream',
              inlineAttachment: false,
            },
          ],
        })

      const expectedDecryptedData = new ArrayBuffer(100)
      when(mockEmailCryptoService.decrypt(anything())).thenResolve(
        expectedDecryptedData,
      )

      const result =
        await emailMessageUtil.processDownloadedEncryptedMessage(
          mockEncryptedMessage,
        )

      expect(result).toBe(expectedDecryptedData)
    })
  })

  describe('encryptInNetworkMessage', () => {
    const mockMessage: EmailMessageDetails = {
      from: [{ emailAddress: 'sender@example.com' }],
      to: [
        { emailAddress: 'user1@example.com' },
        { emailAddress: 'user2@example.com' },
      ],
      subject: 'Test Subject',
      body: 'Test body',
    }

    beforeEach(() => {
      jest
        .spyOn(Rfc822MessageDataProcessor, 'encodeToInternetMessageBuffer')
        .mockReturnValue(new ArrayBuffer(500))
    })

    it('should throw error when emailCryptoService is not provided', async () => {
      const utilWithoutService = new EmailMessageUtil({})

      await expect(
        utilWithoutService.encryptInNetworkMessage(
          mockMessage,
          emailAddressPublicInfos,
        ),
      ).rejects.toThrow(InternalError)
    })

    it('should successfully encrypt message', async () => {
      const mockSecurePackage = {
        toArray: jest.fn().mockReturnValue([
          {
            contentId: 'key1',
            data: 'keyData',
            filename: 'key.dat',
            mimeType: 'application/octet-stream',
            inlineAttachment: false,
          },
          {
            contentId: 'body1',
            data: 'bodyData',
            filename: 'body.dat',
            mimeType: 'application/octet-stream',
            inlineAttachment: false,
          },
        ]),
      }
      when(mockEmailCryptoService.encrypt(anything(), anything())).thenResolve(
        mockSecurePackage as any,
      )

      const result = await emailMessageUtil.encryptInNetworkMessage(
        mockMessage,
        emailAddressPublicInfos,
      )

      expect(result).toBeInstanceOf(ArrayBuffer)
      expect(
        Rfc822MessageDataProcessor.encodeToInternetMessageBuffer,
      ).toHaveBeenCalledTimes(2)
    })

    it('should deduplicate email addresses with same keyId', async () => {
      const duplicateAddresses = [
        ...emailAddressPublicInfos,
        {
          emailAddress: 'user3@example.com',
          keyId: 'key1',
          publicKeyDetails: {
            publicKey: 'publicKey1',
            keyFormat: PublicKeyFormat.RSAPublicKey,
            algorithm: 'RSA',
          },
        }, // Same keyId as first
      ]

      const mockSecurePackage = {
        toArray: jest.fn().mockReturnValue([]),
      }
      when(mockEmailCryptoService.encrypt(anything(), anything())).thenResolve(
        mockSecurePackage as any,
      )

      await emailMessageUtil.encryptInNetworkMessage(
        mockMessage,
        duplicateAddresses,
      )
    })
  })

  describe('processMessageForS3Upload', () => {
    const mockRfc822Data = new ArrayBuffer(1000)

    const createMockMessageDetails = (
      recipients: {
        to?: EmailAddressDetail[]
        cc?: EmailAddressDetail[]
        bcc?: EmailAddressDetail[]
      } = {},
    ): EmailMessageDetails => ({
      from: [{ emailAddress: 'sender@example.com' }],
      to: recipients.to || [{ emailAddress: 'user1@example.com' }],
      cc: recipients.cc || [],
      bcc: recipients.bcc || [],
      subject: 'Test Subject',
      body: 'Test body',
    })

    beforeEach(() => {
      jest
        .spyOn(Rfc822MessageDataProcessor, 'parseInternetMessageData')
        .mockResolvedValue(createMockMessageDetails())
      when(mockDomainService.getConfiguredEmailDomains()).thenResolve(
        unitTestDomains,
      )
      when(mockAccountService.lookupPublicInfo(anything())).thenResolve([
        ...emailAddressPublicInfos,
        {
          emailAddress: 'sender@example.com',
          keyId: 'senderKey',
          publicKeyDetails: {
            publicKey: 'senderPublicKey',
            keyFormat: PublicKeyFormat.RSAPublicKey,
            algorithm: 'RSA',
          },
        },
      ])

      const mockSecurePackage = {
        toArray: jest.fn().mockReturnValue([]),
      }
      when(mockEmailCryptoService.encrypt(anything(), anything())).thenResolve(
        mockSecurePackage as any,
      )

      jest
        .spyOn(Rfc822MessageDataProcessor, 'encodeToInternetMessageBuffer')
        .mockReturnValue(new ArrayBuffer(500))
    })

    it('should throw error when domainService is not provided', async () => {
      const utilWithoutService = new EmailMessageUtil({})

      await expect(
        utilWithoutService.processMessageForS3Upload(
          mockRfc822Data,
          unitTestConfig,
        ),
      ).rejects.toThrow(InternalError)
    })

    it('should process external email without encryption', async () => {
      const externalMessage = createMockMessageDetails({
        to: [{ emailAddress: 'external@external.com' }],
      })
      jest
        .spyOn(Rfc822MessageDataProcessor, 'parseInternetMessageData')
        .mockResolvedValue(externalMessage)

      const result = await emailMessageUtil.processMessageForS3Upload(
        mockRfc822Data,
        unitTestConfig,
      )

      expect(result).toBe(mockRfc822Data) // Should return original data
      verify(mockEmailCryptoService.encrypt(anything(), anything())).never()
    })

    it('should encrypt internal email when encryption is enabled', async () => {
      const result = await emailMessageUtil.processMessageForS3Upload(
        mockRfc822Data,
        unitTestConfig,
      )

      expect(result).toBeInstanceOf(ArrayBuffer)
      verify(mockEmailCryptoService.encrypt(anything(), anything())).once()
    })

    it('should enforce encrypted email recipients limit', async () => {
      const manyRecipients = Array.from({ length: 30 }, (_, i) => ({
        emailAddress: `user${i}@example.com`,
      }))
      const messageWithManyRecipients = createMockMessageDetails({
        to: manyRecipients,
      })
      jest
        .spyOn(Rfc822MessageDataProcessor, 'parseInternetMessageData')
        .mockResolvedValue(messageWithManyRecipients)

      await expect(
        emailMessageUtil.processMessageForS3Upload(
          mockRfc822Data,
          unitTestConfig,
        ),
      ).rejects.toThrow(LimitExceededError)
    })

    it('should enforce external email recipients limit', async () => {
      const manyExternalRecipients = Array.from({ length: 60 }, (_, i) => ({
        emailAddress: `user${i}@external.com`,
      }))
      const messageWithManyRecipients = createMockMessageDetails({
        to: manyExternalRecipients,
      })
      jest
        .spyOn(Rfc822MessageDataProcessor, 'parseInternetMessageData')
        .mockResolvedValue(messageWithManyRecipients)

      await expect(
        emailMessageUtil.processMessageForS3Upload(
          mockRfc822Data,
          unitTestConfig,
        ),
      ).rejects.toThrow(LimitExceededError)
    })

    it('should enforce message size limit', async () => {
      const largeMockRfc822Data = new ArrayBuffer(20000000) // 20MB, larger than limit
      jest
        .spyOn(Rfc822MessageDataProcessor, 'encodeToInternetMessageBuffer')
        .mockReturnValue(new ArrayBuffer(20000000))
      await expect(
        emailMessageUtil.processMessageForS3Upload(
          largeMockRfc822Data,
          unitTestConfig,
        ),
      ).rejects.toThrow(MessageSizeLimitExceededError)
    })

    it('should collect recipients from to, cc, and bcc fields', async () => {
      const messageWithAllRecipients = createMockMessageDetails({
        to: [{ emailAddress: 'to@example.com' }],
        cc: [{ emailAddress: 'cc@example.com' }],
        bcc: [{ emailAddress: 'bcc@example.com' }],
      })
      jest
        .spyOn(Rfc822MessageDataProcessor, 'parseInternetMessageData')
        .mockResolvedValue(messageWithAllRecipients)

      // Mock additional public info for new addresses
      when(mockAccountService.lookupPublicInfo(anything())).thenResolve([
        {
          emailAddress: 'to@example.com',
          keyId: 'toKey',
          publicKeyDetails: {
            publicKey: 'toPublicKey',
            keyFormat: PublicKeyFormat.RSAPublicKey,
            algorithm: 'RSA',
          },
        },
        {
          emailAddress: 'cc@example.com',
          keyId: 'ccKey',
          publicKeyDetails: {
            publicKey: 'ccPublicKey',
            keyFormat: PublicKeyFormat.RSAPublicKey,
            algorithm: 'RSA',
          },
        },
        {
          emailAddress: 'bcc@example.com',
          keyId: 'bccKey',
          publicKeyDetails: {
            publicKey: 'bccPublicKey',
            keyFormat: PublicKeyFormat.RSAPublicKey,
            algorithm: 'RSA',
          },
        },
        {
          emailAddress: 'sender@example.com',
          keyId: 'senderKey',
          publicKeyDetails: {
            publicKey: 'senderPublicKey',
            keyFormat: PublicKeyFormat.RSAPublicKey,
            algorithm: 'RSA',
          },
        },
      ])

      await emailMessageUtil.processMessageForS3Upload(
        mockRfc822Data,
        unitTestConfig,
      )

      verify(mockAccountService.lookupPublicInfo(anything())).once()
      const [capturedArg] = capture(mockAccountService.lookupPublicInfo).last()
      expect(capturedArg).toEqual({
        emailAddresses: [
          'to@example.com',
          'cc@example.com',
          'bcc@example.com',
          'sender@example.com',
        ],
      })
    })

    it('should validate attachments before processing', async () => {
      const messageWithBadAttachment = createMockMessageDetails()
      messageWithBadAttachment.attachments = [
        {
          filename: 'malware.exe',
          mimeType: 'application/octet-stream',
          data: 'content1',
          contentId: '1',
          inlineAttachment: false,
        },
      ]
      jest
        .spyOn(Rfc822MessageDataProcessor, 'parseInternetMessageData')
        .mockResolvedValue(messageWithBadAttachment)

      await expect(
        emailMessageUtil.processMessageForS3Upload(
          mockRfc822Data,
          unitTestConfig,
        ),
      ).rejects.toThrow(InvalidEmailContentsError)
    })

    it('should skip encryption when sendEncryptedEmailEnabled is false', async () => {
      const configWithoutEncryption = {
        ...unitTestConfig,
        sendEncryptedEmailEnabled: false,
      }

      const result = await emailMessageUtil.processMessageForS3Upload(
        mockRfc822Data,
        configWithoutEncryption,
      )

      expect(result).toBe(mockRfc822Data) // Should return original data
      verify(mockEmailCryptoService.encrypt(anything(), anything())).never()
    })
  })
})
