/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
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
import { EmailMessageService } from '../../../../../../src/private/domain/entities/message/emailMessageService'
import { SendEmailMessageUseCase } from '../../../../../../src/private/domain/use-cases/message/sendEmailMessageUseCase'
import { stringToArrayBuffer } from '../../../../../../src/private/util/buffer'
import { EmailAccountService } from '../../../../../../src/private/domain/entities/account/emailAccountService'
import { Rfc822MessageDataProcessor } from '../../../../../../src/private/util/rfc822MessageDataProcessor'
import {
  EmailAttachment,
  InternetMessageFormatHeader,
  MessageSizeLimitExceededError,
} from '../../../../../../src/public'
import { EmailConfigurationDataService } from '../../../../../../src/private/domain/entities/configuration/configurationDataService'
import { EmailConfigurationDataEntity } from '../../../../../../src/private/domain/entities/configuration/emailConfigurationDataEntity'

describe('SendEmailMessageUseCase', () => {
  const emailMessageMaxOutboundMessageSize = 9999999
  let senderEmailAddressId: string
  const emailMessageHeader = {
    from: { emailAddress: 'from@example.com' },
    to: [{ emailAddress: 'to@example.com' }],
  } as unknown as InternetMessageFormatHeader
  const body = 'Message body'
  const attachments: EmailAttachment[] = []
  const inlineAttachments: EmailAttachment[] = []
  const mockMessageService = mock<EmailMessageService>()
  const mockAccountService = mock<EmailAccountService>()
  const mockEmailConfigurationDataService =
    mock<EmailConfigurationDataService>()
  const mockRfc822Data = stringToArrayBuffer(v4())
  const encodeToInternetMessageBufferSpy = jest
    .spyOn(Rfc822MessageDataProcessor, 'encodeToInternetMessageBuffer')
    .mockReturnValue(mockRfc822Data)

  let instanceUnderTest: SendEmailMessageUseCase

  beforeEach(() => {
    senderEmailAddressId = v4()
    reset(mockMessageService)
    reset(mockAccountService)
    reset(mockEmailConfigurationDataService)

    when(mockAccountService.lookupPublicInfo(anything())).thenResolve([])
    when(mockEmailConfigurationDataService.getConfigurationData()).thenResolve({
      emailMessageMaxOutboundMessageSize,
    } as unknown as EmailConfigurationDataEntity)
    instanceUnderTest = new SendEmailMessageUseCase(
      instance(mockMessageService),
      instance(mockAccountService),
      instance(mockEmailConfigurationDataService),
    )
  })

  describe('unencrypted path', () => {
    it('calls the message service sendMessage method', async () => {
      const rfc822Data = stringToArrayBuffer(v4())
      await instanceUnderTest.execute({
        senderEmailAddressId,
        emailMessageHeader,
        body,
        attachments,
        inlineAttachments,
      })
      verify(mockAccountService.lookupPublicInfo(anything())).once()
      verify(mockMessageService.sendMessage(anything())).once()
      const [actualSendInput] = capture(mockMessageService.sendMessage).first()
      expect(actualSendInput).toStrictEqual<typeof actualSendInput>({
        rfc822Data,
        senderEmailAddressId,
      })
      expect(encodeToInternetMessageBufferSpy).toHaveBeenCalledTimes(1)
    })
    it('returns result of service', async () => {
      const idResult = v4()
      when(mockMessageService.sendMessage(anything())).thenResolve(idResult)
      await expect(
        instanceUnderTest.execute({
          senderEmailAddressId,
          emailMessageHeader,
          body,
          attachments,
          inlineAttachments,
        }),
      ).resolves.toStrictEqual(idResult)
    })

    it('respect email message size limit', async () => {
      const limit = 10485760 // 10mb
      when(
        mockEmailConfigurationDataService.getConfigurationData(),
      ).thenResolve({
        emailMessageMaxOutboundMessageSize: limit,
      } as unknown as EmailConfigurationDataEntity)
      encodeToInternetMessageBufferSpy.mockReturnValue(Buffer.alloc(limit + 1))

      await expect(
        instanceUnderTest.execute({
          senderEmailAddressId,
          emailMessageHeader,
          body,
          attachments,
          inlineAttachments,
        }),
      ).rejects.toThrow(MessageSizeLimitExceededError)
    })
  })

  describe('encrypted path', () => {
    beforeEach(() => {
      when(mockAccountService.lookupPublicInfo(anything())).thenResolve([
        {
          emailAddress: 'to@example.com',
          keyId: 'mockKeyId',
          publicKey: 'mockPublicKey',
        },
      ])
    })
    it('calls the message service sendMessage method', async () => {
      const rfc822Data = stringToArrayBuffer(v4())
      await instanceUnderTest.execute({
        senderEmailAddressId,
        emailMessageHeader,
        body,
        attachments,
        inlineAttachments,
      })
      verify(mockAccountService.lookupPublicInfo(anything())).once()
      verify(mockMessageService.sendEncryptedMessage(anything())).once()
      const [actualSendInput] = capture(
        mockMessageService.sendEncryptedMessage,
      ).first()
      expect(actualSendInput).toStrictEqual<typeof actualSendInput>({
        message: {
          from: [{ emailAddress: 'from@example.com' }],
          to: [{ emailAddress: 'to@example.com' }],
          cc: undefined,
          bcc: undefined,
          replyTo: undefined,
          subject: undefined,
          body,
          attachments,
          inlineAttachments,
        },
        senderEmailAddressId,
        recipientsPublicInfo: [
          {
            emailAddress: 'to@example.com',
            keyId: 'mockKeyId',
            publicKey: 'mockPublicKey',
          },
        ],
        emailMessageMaxOutboundMessageSize,
      })
    })
    it('returns result of service', async () => {
      const idResult = v4()
      when(mockMessageService.sendEncryptedMessage(anything())).thenResolve(
        idResult,
      )
      await expect(
        instanceUnderTest.execute({
          senderEmailAddressId,
          emailMessageHeader,
          body,
          attachments,
          inlineAttachments,
        }),
      ).resolves.toStrictEqual(idResult)
    })
  })
})
