/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  anything,
  capture,
  instance,
  mock,
  reset,
  verify,
  when,
} from 'ts-mockito'
import { v4 } from 'uuid'
import { S3Client } from '../../../../../../src/private/data/common/s3Client'
import { EmailAccountService } from '../../../../../../src/private/domain/entities/account/emailAccountService'
import { EmailMessageService } from '../../../../../../src/private/domain/entities/message/emailMessageService'
import { UpdateDraftEmailMessageUseCase } from '../../../../../../src/private/domain/use-cases/draft/updateDraftEmailMessageUseCase'
import {
  AddressNotFoundError,
  InNetworkAddressNotFoundError,
  InvalidEmailContentsError,
  LimitExceededError,
  MessageNotFoundError,
  MessageSizeLimitExceededError,
} from '../../../../../../src/public/errors'
import { stringToArrayBuffer } from '../../../../../../src/private/util/buffer'
import { EntityDataFactory } from '../../../../data-factory/entity'
import { EmailDomainService } from '../../../../../../src/private/domain/entities/emailDomain/emailDomainService'
import { EmailConfigurationDataService } from '../../../../../../src/private/domain/entities/configuration/configurationDataService'
import { EmailCryptoService } from '../../../../../../src/private/domain/entities/secure/emailCryptoService'
import { EmailConfigurationDataEntity } from '../../../../../../src/private/domain/entities/configuration/emailConfigurationDataEntity'
import { Rfc822MessageDataProcessor } from '../../../../../../src/private/util/rfc822MessageDataProcessor'
import { EmailMessageRfc822DataFactory } from '../../../../data-factory/emailMessageRfc822Data'
import { PublicKeyFormat } from '@sudoplatform/sudo-common'
import { SecurePackageDataFactory } from '../../../../data-factory/securePackage'
import { EmailAddressDetail } from '../../../../../../src'

describe('UpdateDraftEmailMessageUseCase Test Suite', () => {
  const emailMessageMaxOutboundMessageSize = 9999999
  const mockEmailAccountService = mock<EmailAccountService>()
  const mockEmailMessageService = mock<EmailMessageService>()
  const mockEmailDomainService = mock<EmailDomainService>()
  const mockEmailConfigurationDataService =
    mock<EmailConfigurationDataService>()
  const mockEmailCryptoService = mock<EmailCryptoService>()
  const mockS3Client = mock<S3Client>()

  const parseInternetMessageDataSpy = jest.spyOn(
    Rfc822MessageDataProcessor,
    'parseInternetMessageData',
  )
  const encodeToInternetMessageBufferSpy = jest.spyOn(
    Rfc822MessageDataProcessor,
    'encodeToInternetMessageBuffer',
  )

  let instanceUnderTest: UpdateDraftEmailMessageUseCase
  let emailMessageDetails = EmailMessageRfc822DataFactory.emailMessageDetails()

  beforeEach(() => {
    reset(mockEmailAccountService)
    reset(mockEmailMessageService)
    reset(mockEmailDomainService)
    reset(mockEmailConfigurationDataService)
    reset(mockEmailCryptoService)
    reset(mockS3Client)
    parseInternetMessageDataSpy.mockReset()
    encodeToInternetMessageBufferSpy.mockReset()

    instanceUnderTest = new UpdateDraftEmailMessageUseCase(
      instance(mockEmailAccountService),
      instance(mockEmailMessageService),
      instance(mockEmailDomainService),
      instance(mockEmailConfigurationDataService),
      instance(mockEmailCryptoService),
    )
    when(mockEmailAccountService.get(anything())).thenResolve(
      EntityDataFactory.emailAccount,
    )
    when(
      mockEmailDomainService.getConfiguredEmailDomains(anything()),
    ).thenResolve([EntityDataFactory.emailDomain])
    when(mockEmailConfigurationDataService.getConfigurationData()).thenResolve({
      ...EntityDataFactory.configurationData,
      sendEncryptedEmailEnabled: true,
      emailMessageMaxOutboundMessageSize,
    })
    when(mockEmailMessageService.getDraft(anything())).thenCall((id) =>
      Promise.resolve({
        id,
        updatedAt: new Date(),
        rfc822Data: stringToArrayBuffer('test'),
      }),
    )

    when(mockEmailMessageService.saveDraft(anything())).thenResolve({
      id: '',
      emailAddressId: '',
      updatedAt: new Date(),
    })
    parseInternetMessageDataSpy.mockResolvedValue(emailMessageDetails)
  })

  describe('execute', () => {
    it('completes successfully with expected draft id output', async () => {
      const id = v4()
      const rfc822Data = stringToArrayBuffer(v4())
      const senderEmailAddressId = v4()
      const updatedAt = new Date()

      when(mockEmailMessageService.getDraft(anything())).thenResolve({
        id,
        emailAddressId: senderEmailAddressId,
        updatedAt: new Date(),
        rfc822Data,
      })

      when(mockEmailMessageService.saveDraft(anything())).thenResolve({
        id,
        emailAddressId: senderEmailAddressId,
        updatedAt,
      })

      await expect(
        instanceUnderTest.execute({ id, senderEmailAddressId, rfc822Data }),
      ).resolves.toStrictEqual({
        id,
        emailAddressId: senderEmailAddressId,
        updatedAt,
      })

      verify(mockEmailAccountService.get(anything())).once()
      verify(mockEmailMessageService.getDraft(anything())).once()
      verify(mockEmailConfigurationDataService.getConfigurationData()).once()
      expect(parseInternetMessageDataSpy).toHaveBeenCalledTimes(1)
      verify(
        mockEmailDomainService.getConfiguredEmailDomains(anything()),
      ).once()
      verify(mockEmailMessageService.saveDraft(anything())).once()
    })

    it('throws AddressNotFound error for non-existent email address input', async () => {
      const id = v4()
      const rfc822Data = stringToArrayBuffer(v4())
      const senderEmailAddressId = v4()
      when(mockEmailAccountService.get(anything())).thenThrow(
        new AddressNotFoundError(),
      )
      await expect(
        instanceUnderTest.execute({ id, senderEmailAddressId, rfc822Data }),
      ).rejects.toThrow(new AddressNotFoundError())

      verify(mockEmailAccountService.get(anything())).once()
      verify(mockEmailMessageService.getDraft(anything())).never()
      verify(mockEmailConfigurationDataService.getConfigurationData()).never()
      expect(parseInternetMessageDataSpy).toHaveBeenCalledTimes(0)
      verify(
        mockEmailDomainService.getConfiguredEmailDomains(anything()),
      ).never()
      verify(mockEmailMessageService.saveDraft(anything())).never()
    })

    it('throws MessageNotFound error for non-existent draft email message input', async () => {
      const id = v4()
      const rfc822Data = stringToArrayBuffer(v4())
      const senderEmailAddressId = v4()
      when(mockEmailMessageService.getDraft(anything())).thenThrow(
        new MessageNotFoundError(),
      )
      await expect(
        instanceUnderTest.execute({ id, senderEmailAddressId, rfc822Data }),
      ).rejects.toThrow(new MessageNotFoundError())

      verify(mockEmailAccountService.get(anything())).once()
      verify(mockEmailMessageService.getDraft(anything())).once()
      verify(mockEmailConfigurationDataService.getConfigurationData()).never()
      expect(parseInternetMessageDataSpy).toHaveBeenCalledTimes(0)
      verify(
        mockEmailDomainService.getConfiguredEmailDomains(anything()),
      ).never()
      verify(mockEmailMessageService.saveDraft(anything())).never()
    })

    it('throws InvalidEmailContentsError if message has prohibited attachments', async () => {
      const messageDetailsWithProhibitedAttachment =
        EmailMessageRfc822DataFactory.emailMessageDetails({
          attachments: [
            {
              ...EntityDataFactory.emailAttachment,
              filename: 'malicious.exe',
            },
          ],
        })
      parseInternetMessageDataSpy.mockResolvedValue(
        messageDetailsWithProhibitedAttachment,
      )
      const id = v4()
      const senderEmailAddressId = v4()
      const rfc822Data = stringToArrayBuffer(v4())
      await expect(
        instanceUnderTest.execute({ id, senderEmailAddressId, rfc822Data }),
      ).rejects.toBeInstanceOf(InvalidEmailContentsError)

      verify(mockEmailAccountService.get(anything())).once()
      verify(mockEmailMessageService.getDraft(anything())).once()
      verify(mockEmailConfigurationDataService.getConfigurationData()).once()
      expect(parseInternetMessageDataSpy).toHaveBeenCalledTimes(1)
      verify(
        mockEmailDomainService.getConfiguredEmailDomains(anything()),
      ).never()
      verify(mockEmailMessageService.saveDraft(anything())).never()
    })

    it('throws LimitExceededError if too many recipients', async () => {
      const to: EmailAddressDetail[] = []
      for (
        let i = 0;
        i < EntityDataFactory.configurationData.emailMessageRecipientsLimit + 1;
        i++
      ) {
        to.push({
          emailAddress: `recipient${i}@${EntityDataFactory.emailDomain.domain}`,
        })
      }
      const messageDetailsWithTooManyRecipients =
        EmailMessageRfc822DataFactory.emailMessageDetails({
          to,
        })
      parseInternetMessageDataSpy.mockResolvedValue(
        messageDetailsWithTooManyRecipients,
      )
      const id = v4()
      const senderEmailAddressId = v4()
      const rfc822Data = stringToArrayBuffer(v4())
      await expect(
        instanceUnderTest.execute({ id, senderEmailAddressId, rfc822Data }),
      ).rejects.toBeInstanceOf(LimitExceededError)

      verify(mockEmailAccountService.get(anything())).once()
      verify(mockEmailMessageService.getDraft(anything())).once()
      verify(mockEmailConfigurationDataService.getConfigurationData()).once()
      expect(parseInternetMessageDataSpy).toHaveBeenCalledTimes(1)
      verify(
        mockEmailDomainService.getConfiguredEmailDomains(anything()),
      ).once()
      verify(mockEmailMessageService.saveDraft(anything())).never()
    })

    it('throws MessageSizeLimitExceededError if message exceeds size limit', async () => {
      const emailMessageMaxOutboundMessageSize = 100
      when(
        mockEmailConfigurationDataService.getConfigurationData(),
      ).thenResolve({
        ...EntityDataFactory.configurationData,
        sendEncryptedEmailEnabled: true,
        emailMessageMaxOutboundMessageSize,
      })

      const mockData = 'a'.repeat(emailMessageMaxOutboundMessageSize + 1)
      const rfc822Data = stringToArrayBuffer(mockData)

      const id = v4()
      const senderEmailAddressId = v4()
      await expect(
        instanceUnderTest.execute({ id, senderEmailAddressId, rfc822Data }),
      ).rejects.toBeInstanceOf(MessageSizeLimitExceededError)

      verify(mockEmailAccountService.get(anything())).once()
      verify(mockEmailMessageService.getDraft(anything())).once()
      verify(mockEmailConfigurationDataService.getConfigurationData()).once()
      expect(parseInternetMessageDataSpy).toHaveBeenCalledTimes(1)
      verify(
        mockEmailDomainService.getConfiguredEmailDomains(anything()),
      ).once()
      verify(mockEmailMessageService.saveDraft(anything())).never()
    })

    describe('E2EE path', () => {
      const senderAddress = `sender@${EntityDataFactory.emailDomain.domain}`
      const recipientAddress = `recipient@${EntityDataFactory.emailDomain.domain}`
      const mockEncryptedData = stringToArrayBuffer('mockEncryptedData')
      const mockDecryptedData = stringToArrayBuffer('mockDecryptedData')
      beforeEach(() => {
        emailMessageDetails = EmailMessageRfc822DataFactory.emailMessageDetails(
          {
            from: [{ emailAddress: senderAddress }],
            to: [{ emailAddress: recipientAddress }],
          },
        )
        parseInternetMessageDataSpy.mockResolvedValue(emailMessageDetails)
        when(mockEmailAccountService.lookupPublicInfo(anything())).thenResolve([
          {
            emailAddress: senderAddress,
            keyId: 'testKeyId',
            publicKeyDetails: {
              publicKey: 'testPublicKey',
              keyFormat: PublicKeyFormat.RSAPublicKey,
              algorithm: 'testAlgorithm',
            },
          },
          {
            emailAddress: recipientAddress,
            keyId: 'testKeyId_2',
            publicKeyDetails: {
              publicKey: 'testPublicKey_2',
              keyFormat: PublicKeyFormat.SPKI,
              algorithm: 'testAlgorithm_2',
            },
          },
        ])
        when(
          mockEmailCryptoService.encrypt(anything(), anything()),
        ).thenResolve(SecurePackageDataFactory.securePackage())
        encodeToInternetMessageBufferSpy
          .mockReturnValueOnce(mockEncryptedData)
          .mockReturnValue(mockDecryptedData)
      })

      it('returns expected id and calls appropriate functions for successful E2EE save draft', async () => {
        const id = v4()
        const senderEmailAddressId = v4()
        const updatedAt = new Date()
        const rfc822Data = stringToArrayBuffer(v4())
        when(mockEmailMessageService.saveDraft(anything())).thenResolve({
          id,
          emailAddressId: senderEmailAddressId,
          updatedAt,
        })

        const result = await instanceUnderTest.execute({
          id,
          senderEmailAddressId,
          rfc822Data,
        })

        expect(result).toStrictEqual({
          id,
          emailAddressId: senderEmailAddressId,
          updatedAt,
        })

        verify(mockEmailAccountService.get(anything())).once()
        verify(mockEmailMessageService.getDraft(anything())).once()
        verify(mockEmailConfigurationDataService.getConfigurationData()).once()
        expect(parseInternetMessageDataSpy).toHaveBeenCalledTimes(1)
        verify(
          mockEmailDomainService.getConfiguredEmailDomains(anything()),
        ).once()
        verify(mockEmailAccountService.lookupPublicInfo(anything())).once()
        verify(mockEmailCryptoService.encrypt(anything(), anything())).once()
        expect(encodeToInternetMessageBufferSpy).toHaveBeenCalledTimes(2)
        verify(mockEmailMessageService.saveDraft(anything())).once()

        const [actualArgs] = capture(mockEmailMessageService.saveDraft).first()
        console.debug({
          expectedData: mockDecryptedData,
          argsData: actualArgs.rfc822Data,
        })
        expect(actualArgs).toStrictEqual<typeof actualArgs>({
          rfc822Data: mockDecryptedData,
          senderEmailAddressId,
          id,
        })
      })

      it('throws LimitExceededError if too many encrypted recipients', async () => {
        const to: EmailAddressDetail[] = []
        for (
          let i = 0;
          i <
          EntityDataFactory.configurationData
            .encryptedEmailMessageRecipientsLimit +
            1;
          i++
        ) {
          to.push({
            emailAddress: `recipient${i}@${EntityDataFactory.emailDomain.domain}`,
          })
        }
        const messageDetailsWithTooManyRecipients =
          EmailMessageRfc822DataFactory.emailMessageDetails({
            from: [{ emailAddress: senderAddress }],
            to,
          })
        parseInternetMessageDataSpy.mockResolvedValue(
          messageDetailsWithTooManyRecipients,
        )
        const id = v4()
        const senderEmailAddressId = v4()
        const updatedAt = new Date()
        const rfc822Data = stringToArrayBuffer(v4())
        when(mockEmailMessageService.saveDraft(anything())).thenResolve({
          id,
          emailAddressId: senderEmailAddressId,
          updatedAt,
        })
        await expect(
          instanceUnderTest.execute({ id, senderEmailAddressId, rfc822Data }),
        ).rejects.toBeInstanceOf(LimitExceededError)

        verify(mockEmailAccountService.get(anything())).once()
        verify(mockEmailMessageService.getDraft(anything())).once()
        verify(mockEmailConfigurationDataService.getConfigurationData()).once()
        expect(parseInternetMessageDataSpy).toHaveBeenCalledTimes(1)
        verify(
          mockEmailDomainService.getConfiguredEmailDomains(anything()),
        ).once()
        verify(mockEmailAccountService.lookupPublicInfo(anything())).never()
        verify(mockEmailCryptoService.encrypt(anything(), anything())).never()
        expect(encodeToInternetMessageBufferSpy).toHaveBeenCalledTimes(0)
        verify(mockEmailMessageService.saveDraft(anything())).never()
      })

      it('throws InNetworkAddressNotFoundError if no public key for recipient', async () => {
        when(mockEmailAccountService.lookupPublicInfo(anything())).thenResolve([
          {
            emailAddress: senderAddress,
            keyId: 'testKeyId',
            publicKeyDetails: {
              publicKey: 'testPublicKey',
              keyFormat: PublicKeyFormat.RSAPublicKey,
              algorithm: 'testAlgorithm',
            },
          },
        ])
        const id = v4()
        const senderEmailAddressId = v4()
        const updatedAt = new Date()
        const rfc822Data = stringToArrayBuffer(v4())
        when(mockEmailMessageService.saveDraft(anything())).thenResolve({
          id,
          emailAddressId: senderEmailAddressId,
          updatedAt,
        })
        await expect(
          instanceUnderTest.execute({ id, senderEmailAddressId, rfc822Data }),
        ).rejects.toBeInstanceOf(InNetworkAddressNotFoundError)

        verify(mockEmailAccountService.get(anything())).once()
        verify(mockEmailMessageService.getDraft(anything())).once()
        verify(mockEmailConfigurationDataService.getConfigurationData()).once()
        expect(parseInternetMessageDataSpy).toHaveBeenCalledTimes(1)
        verify(
          mockEmailDomainService.getConfiguredEmailDomains(anything()),
        ).once()
        verify(mockEmailAccountService.lookupPublicInfo(anything())).once()
        verify(mockEmailCryptoService.encrypt(anything(), anything())).never()
        expect(encodeToInternetMessageBufferSpy).toHaveBeenCalledTimes(0)
        verify(mockEmailMessageService.saveDraft(anything())).never()
      })
    })
  })
})
