/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
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
import { MockedClass } from 'vitest'
import { v4 } from 'uuid'
import { InternetMessageFormatHeader, SudoEmailClient } from '../../../src'
import { SendEmailMessageUseCase } from '../../../src/private/domain/use-cases/message/sendEmailMessageUseCase'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

vi.mock('../../../src/private/domain/use-cases/message/sendEmailMessageUseCase')
const ViMockSendEmailMessageUseCase = SendEmailMessageUseCase as MockedClass<
  typeof SendEmailMessageUseCase
>

describe('SudoEmailClient.sendMaskedEmailMessage Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockSendEmailMessageUseCase = mock<SendEmailMessageUseCase>()
  let timestamp: Date

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockSendEmailMessageUseCase)

    ViMockSendEmailMessageUseCase.mockClear()

    ViMockSendEmailMessageUseCase.mockImplementation(function () {
      return instance(mockSendEmailMessageUseCase)
    })

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    timestamp = new Date()
    when(mockSendEmailMessageUseCase.execute(anything())).thenResolve({
      id: 'id',
      createdAt: timestamp,
    })
  })

  it('generates use case', async () => {
    await instanceUnderTest.sendMaskedEmailMessage({
      senderEmailMaskId: '',
      emailMessageHeader: {} as unknown as InternetMessageFormatHeader,
      body: '',
      attachments: [],
      inlineAttachments: [],
    })
    expect(ViMockSendEmailMessageUseCase).toHaveBeenCalledTimes(1)
  })

  it('calls use case as expected', async () => {
    const senderEmailMaskId = v4()
    await instanceUnderTest.sendMaskedEmailMessage({
      senderEmailMaskId,
      emailMessageHeader: {} as unknown as InternetMessageFormatHeader,
      body: '',
      attachments: [],
      inlineAttachments: [],
    })
    verify(mockSendEmailMessageUseCase.execute(anything())).once()
    const [actualInput] = capture(mockSendEmailMessageUseCase.execute).first()
    expect(actualInput.senderEmailMaskId).toEqual(senderEmailMaskId)
  })

  it('returns expected result', async () => {
    await expect(
      instanceUnderTest.sendMaskedEmailMessage({
        senderEmailMaskId: '',
        emailMessageHeader: {} as unknown as InternetMessageFormatHeader,
        body: '',
        attachments: [],
        inlineAttachments: [],
      }),
    ).resolves.toEqual({ id: 'id', createdAt: timestamp })
  })

  it('does not accept senderEmailAddressId', async () => {
    const senderEmailMaskId = v4()
    await instanceUnderTest.sendMaskedEmailMessage({
      senderEmailMaskId,
      emailMessageHeader: {} as unknown as InternetMessageFormatHeader,
      body: '',
      attachments: [],
      inlineAttachments: [],
    })
    verify(mockSendEmailMessageUseCase.execute(anything())).once()
    const [actualInput] = capture(mockSendEmailMessageUseCase.execute).first()
    expect(actualInput.senderEmailAddressId).toBeUndefined()
    expect(actualInput.senderEmailMaskId).toEqual(senderEmailMaskId)
  })
})
