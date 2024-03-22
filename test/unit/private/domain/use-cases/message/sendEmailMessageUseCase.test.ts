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
import { Rfc822MessageParser } from '../../../../../../src/private/util/rfc822MessageParser'

describe('SendEmailMessageUseCase', () => {
  const mockMessageService = mock<EmailMessageService>()
  const mockAccountService = mock<EmailAccountService>()
  const decodeRfc822DataSpy = jest
    .spyOn(Rfc822MessageParser, 'decodeRfc822Data')
    .mockResolvedValue({
      from: [{ emailAddress: 'from@example.com' }],
      to: [{ emailAddress: 'to@example.com' }],
    })

  let instanceUnderTest: SendEmailMessageUseCase

  beforeEach(() => {
    reset(mockMessageService)
    reset(mockAccountService)

    when(mockAccountService.lookupPublicInfo(anything())).thenResolve([])
    instanceUnderTest = new SendEmailMessageUseCase(
      instance(mockMessageService),
      instance(mockAccountService),
    )
  })

  describe('unencrypted path', () => {
    it('calls the message service sendMessage method', async () => {
      const rfc822Data = stringToArrayBuffer(v4())
      const senderEmailAddressId = v4()
      await instanceUnderTest.execute({ rfc822Data, senderEmailAddressId })
      verify(mockAccountService.lookupPublicInfo(anything())).once()
      verify(mockMessageService.sendMessage(anything())).once()
      const [actualSendInput] = capture(mockMessageService.sendMessage).first()
      expect(actualSendInput).toStrictEqual<typeof actualSendInput>({
        rfc822Data,
        senderEmailAddressId,
      })
      expect(decodeRfc822DataSpy).toHaveBeenCalledTimes(1)
    })
    it('returns result of service', async () => {
      const idResult = v4()
      when(mockMessageService.sendMessage(anything())).thenResolve(idResult)
      await expect(
        instanceUnderTest.execute({
          rfc822Data: stringToArrayBuffer(''),
          senderEmailAddressId: '',
        }),
      ).resolves.toStrictEqual(idResult)
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
      const senderEmailAddressId = v4()
      await instanceUnderTest.execute({ rfc822Data, senderEmailAddressId })
      verify(mockAccountService.lookupPublicInfo(anything())).once()
      verify(mockMessageService.sendEncryptedMessage(anything())).once()
      const [actualSendInput] = capture(
        mockMessageService.sendEncryptedMessage,
      ).first()
      expect(actualSendInput).toStrictEqual<typeof actualSendInput>({
        message: {
          from: [{ emailAddress: 'from@example.com' }],
          to: [{ emailAddress: 'to@example.com' }],
        },
        senderEmailAddressId,
        recipientsPublicInfo: [
          {
            emailAddress: 'to@example.com',
            keyId: 'mockKeyId',
            publicKey: 'mockPublicKey',
          },
        ],
      })
      expect(decodeRfc822DataSpy).toHaveBeenCalledTimes(1)
    })
    it('returns result of service', async () => {
      const idResult = v4()
      when(mockMessageService.sendEncryptedMessage(anything())).thenResolve(
        idResult,
      )
      await expect(
        instanceUnderTest.execute({
          rfc822Data: stringToArrayBuffer(''),
          senderEmailAddressId: '',
        }),
      ).resolves.toStrictEqual(idResult)
    })
  })
})
