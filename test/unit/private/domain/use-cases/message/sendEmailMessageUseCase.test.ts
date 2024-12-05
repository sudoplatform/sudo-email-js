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
import { EmailAccountService } from '../../../../../../src/private/domain/entities/account/emailAccountService'
import { EmailConfigurationDataService } from '../../../../../../src/private/domain/entities/configuration/configurationDataService'
import { EmailConfigurationDataEntity } from '../../../../../../src/private/domain/entities/configuration/emailConfigurationDataEntity'
import { EmailMessageService } from '../../../../../../src/private/domain/entities/message/emailMessageService'
import { SendEmailMessageUseCase } from '../../../../../../src/private/domain/use-cases/message/sendEmailMessageUseCase'
import {
  EmailAttachment,
  InNetworkAddressNotFoundError,
  InternetMessageFormatHeader,
} from '../../../../../../src/public'
import { EntityDataFactory } from '../../../../data-factory/entity'
import { EmailDomainService } from '../../../../../../src/private/domain/entities/emailDomain/emailDomainService'

describe('SendEmailMessageUseCase', () => {
  const emailMessageMaxOutboundMessageSize = 9999999
  let senderEmailAddressId: string
  let timestamp: Date
  const emailMessageHeader = {
    from: { emailAddress: 'from@example.com' },
    to: [{ emailAddress: 'to@example.com' }],
  } as unknown as InternetMessageFormatHeader
  const body = 'Message body'
  const attachments: EmailAttachment[] = []
  const inlineAttachments: EmailAttachment[] = []
  const mockMessageService = mock<EmailMessageService>()
  const mockAccountService = mock<EmailAccountService>()
  const mockEmailDomainService = mock<EmailDomainService>()
  const mockEmailConfigurationDataService =
    mock<EmailConfigurationDataService>()

  let instanceUnderTest: SendEmailMessageUseCase

  beforeEach(() => {
    senderEmailAddressId = v4()
    timestamp = new Date()
    reset(mockMessageService)
    reset(mockAccountService)
    reset(mockEmailDomainService)
    reset(mockEmailConfigurationDataService)

    when(
      mockEmailDomainService.getConfiguredEmailDomains(anything()),
    ).thenResolve([EntityDataFactory.emailDomain])
    when(mockEmailConfigurationDataService.getConfigurationData()).thenResolve({
      sendEncryptedEmailEnabled: true,
      emailMessageMaxOutboundMessageSize,
    } as unknown as EmailConfigurationDataEntity)
    instanceUnderTest = new SendEmailMessageUseCase(
      instance(mockMessageService),
      instance(mockAccountService),
      instance(mockEmailDomainService),
      instance(mockEmailConfigurationDataService),
    )
  })

  describe('unencrypted path', () => {
    it('calls the message service sendMessage method', async () => {
      await instanceUnderTest.execute({
        senderEmailAddressId,
        emailMessageHeader,
        body,
        attachments,
        inlineAttachments,
      })
      verify(mockEmailConfigurationDataService.getConfigurationData()).once()
      verify(
        mockEmailDomainService.getConfiguredEmailDomains(anything()),
      ).once()
      verify(mockMessageService.sendMessage(anything())).once()
      const [actualSendInput] = capture(mockMessageService.sendMessage).first()
      expect(actualSendInput).toStrictEqual<typeof actualSendInput>({
        message: {
          from: [{ emailAddress: 'from@example.com' }],
          to: [{ emailAddress: 'to@example.com' }],
          cc: undefined,
          bcc: undefined,
          replyTo: undefined,
          subject: undefined,
          body: body,
          attachments,
          inlineAttachments,
        },
        senderEmailAddressId,
        emailMessageMaxOutboundMessageSize,
      })
    })

    it('returns result of service for external recipients', async () => {
      const idResult = v4()
      when(mockMessageService.sendMessage(anything())).thenResolve({
        id: idResult,
        createdAt: timestamp,
      })
      await expect(
        instanceUnderTest.execute({
          senderEmailAddressId,
          emailMessageHeader,
          body,
          attachments,
          inlineAttachments,
        }),
      ).resolves.toStrictEqual({ id: idResult, createdAt: timestamp })
      verify(mockEmailConfigurationDataService.getConfigurationData()).once()
      verify(
        mockEmailDomainService.getConfiguredEmailDomains(anything()),
      ).once()
      verify(mockMessageService.sendMessage(anything())).once()
    })

    it('returns result of service for external and internal recipients', async () => {
      const emailMessageHeader = {
        from: { emailAddress: 'from@example.com' },
        to: [{ emailAddress: EntityDataFactory.emailAddress.emailAddress }],
        cc: [{ emailAddress: 'cc@example.com' }],
      } as unknown as InternetMessageFormatHeader
      const idResult = v4()
      when(mockAccountService.lookupPublicInfo(anything())).thenResolve([
        {
          emailAddress: EntityDataFactory.emailAddress.emailAddress,
          keyId: 'mockKeyId',
          publicKey: 'mockPublicKey',
        },
      ])
      when(mockMessageService.sendMessage(anything())).thenResolve({
        id: idResult,
        createdAt: timestamp,
      })
      await expect(
        instanceUnderTest.execute({
          senderEmailAddressId,
          emailMessageHeader,
          body,
          attachments,
          inlineAttachments,
        }),
      ).resolves.toStrictEqual({ id: idResult, createdAt: timestamp })
      verify(mockEmailConfigurationDataService.getConfigurationData()).once()
      verify(
        mockEmailDomainService.getConfiguredEmailDomains(anything()),
      ).once()
      verify(mockMessageService.sendMessage(anything())).once()
    })

    it('returns result of service for no recipients', async () => {
      const emailMessageHeader = {
        from: { emailAddress: 'from@example.com' },
        to: [],
      } as unknown as InternetMessageFormatHeader
      const idResult = v4()
      when(mockMessageService.sendMessage(anything())).thenResolve({
        id: idResult,
        createdAt: timestamp,
      })
      await expect(
        instanceUnderTest.execute({
          senderEmailAddressId,
          emailMessageHeader,
          body,
          attachments,
          inlineAttachments,
        }),
      ).resolves.toStrictEqual({ id: idResult, createdAt: timestamp })
      verify(mockEmailConfigurationDataService.getConfigurationData()).once()
      verify(
        mockEmailDomainService.getConfiguredEmailDomains(anything()),
      ).once()
      verify(mockMessageService.sendMessage(anything())).once()
    })
  })

  describe('encrypted path', () => {
    const fromAddress = 'from@unittest.org'
    beforeEach(() => {
      when(mockAccountService.lookupPublicInfo(anything())).thenResolve([
        {
          emailAddress: EntityDataFactory.emailAddress.emailAddress,
          keyId: 'mockKeyId',
          publicKey: 'mockPublicKey',
        },
        {
          emailAddress: fromAddress,
          keyId: 'mockKeyId',
          publicKey: 'mockPublicKey',
        },
      ])
    })
    it('calls the message service sendMessage method', async () => {
      const emailMessageHeader = {
        from: { emailAddress: fromAddress },
        to: [{ emailAddress: EntityDataFactory.emailAddress.emailAddress }],
      } as unknown as InternetMessageFormatHeader
      await instanceUnderTest.execute({
        senderEmailAddressId,
        emailMessageHeader,
        body,
        attachments,
        inlineAttachments,
      })
      verify(mockEmailConfigurationDataService.getConfigurationData()).once()
      verify(
        mockEmailDomainService.getConfiguredEmailDomains(anything()),
      ).once()
      verify(mockAccountService.lookupPublicInfo(anything())).once()
      verify(mockMessageService.sendEncryptedMessage(anything())).once()
      const [actualSendInput] = capture(
        mockMessageService.sendEncryptedMessage,
      ).first()
      expect(actualSendInput).toStrictEqual<typeof actualSendInput>({
        message: {
          from: [{ emailAddress: fromAddress }],
          to: [{ emailAddress: EntityDataFactory.emailAddress.emailAddress }],
          cc: undefined,
          bcc: undefined,
          replyTo: undefined,
          subject: undefined,
          body: body,
          attachments,
          inlineAttachments,
        },
        senderEmailAddressId,
        emailAddressesPublicInfo: [
          {
            emailAddress: EntityDataFactory.emailAddress.emailAddress,
            keyId: 'mockKeyId',
            publicKey: 'mockPublicKey',
          },
          {
            emailAddress: fromAddress,
            keyId: 'mockKeyId',
            publicKey: 'mockPublicKey',
          },
        ],
        emailMessageMaxOutboundMessageSize,
      })
    })
    it('returns result of service for internal recipients', async () => {
      const idResult = v4()
      const emailMessageHeader = {
        from: { emailAddress: fromAddress },
        to: [{ emailAddress: EntityDataFactory.emailAddress.emailAddress }],
      } as unknown as InternetMessageFormatHeader
      when(mockMessageService.sendEncryptedMessage(anything())).thenResolve({
        id: idResult,
        createdAt: timestamp,
      })
      await expect(
        instanceUnderTest.execute({
          senderEmailAddressId,
          emailMessageHeader,
          body,
          attachments,
          inlineAttachments,
        }),
      ).resolves.toStrictEqual({ id: idResult, createdAt: timestamp })
      verify(mockEmailConfigurationDataService.getConfigurationData()).once()
      verify(
        mockEmailDomainService.getConfiguredEmailDomains(anything()),
      ).once()
      verify(mockAccountService.lookupPublicInfo(anything())).once()
      verify(mockMessageService.sendEncryptedMessage(anything())).once()
    })
    it('returns result of service when send encrypted email disabled', async () => {
      when(
        mockEmailConfigurationDataService.getConfigurationData(),
      ).thenResolve({
        sendEncryptedEmailEnabled: false,
        emailMessageMaxOutboundMessageSize,
      } as unknown as EmailConfigurationDataEntity)

      const idResult = v4()
      const emailMessageHeader = {
        from: { emailAddress: fromAddress },
        to: [{ emailAddress: EntityDataFactory.emailAddress.emailAddress }],
      } as unknown as InternetMessageFormatHeader
      when(mockMessageService.sendMessage(anything())).thenResolve({
        id: idResult,
        createdAt: timestamp,
      })
      await expect(
        instanceUnderTest.execute({
          senderEmailAddressId,
          emailMessageHeader,
          body,
          attachments,
          inlineAttachments,
        }),
      ).resolves.toStrictEqual({ id: idResult, createdAt: timestamp })
      verify(mockEmailConfigurationDataService.getConfigurationData()).once()
      verify(mockMessageService.sendMessage(anything())).once()
    })
    it('throws error when any internal recipient email address does not exist', async () => {
      const emailMessageHeader = {
        from: { emailAddress: fromAddress },
        to: [{ emailAddress: 'notexists@unittest.org' }],
      } as unknown as InternetMessageFormatHeader
      await expect(
        instanceUnderTest.execute({
          senderEmailAddressId,
          emailMessageHeader,
          body,
          attachments,
          inlineAttachments,
        }),
      ).rejects.toThrow(InNetworkAddressNotFoundError)
      verify(mockEmailConfigurationDataService.getConfigurationData()).once()
      verify(
        mockEmailDomainService.getConfiguredEmailDomains(anything()),
      ).once()
      verify(mockAccountService.lookupPublicInfo(anything())).once()
    })
  })
})
