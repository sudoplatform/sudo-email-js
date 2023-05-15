/*
 * Copyright © 2023 Anonyome Labs, Inc. All rights reserved.
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
import { str2ab } from '../../../../../util/buffer'

describe('SendEmailMessageUseCase', () => {
  const mockMessageService = mock<EmailMessageService>()

  let instanceUnderTest: SendEmailMessageUseCase

  beforeEach(() => {
    reset(mockMessageService)
    instanceUnderTest = new SendEmailMessageUseCase(
      instance(mockMessageService),
    )
  })

  it('calls the message service sendMessage method', async () => {
    const rfc822Data = str2ab(v4())
    const senderEmailAddressId = v4()
    await instanceUnderTest.execute({ rfc822Data, senderEmailAddressId })
    verify(mockMessageService.sendMessage(anything())).once()
    const [actualSendInput] = capture(mockMessageService.sendMessage).first()
    expect(actualSendInput).toStrictEqual<typeof actualSendInput>({
      rfc822Data,
      senderEmailAddressId,
    })
  })
  it('returns result of service', async () => {
    const idResult = v4()
    when(mockMessageService.sendMessage(anything())).thenResolve(idResult)
    await expect(
      instanceUnderTest.execute({
        rfc822Data: str2ab(''),
        senderEmailAddressId: '',
      }),
    ).resolves.toStrictEqual(idResult)
  })
})
