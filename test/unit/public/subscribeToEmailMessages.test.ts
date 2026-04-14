/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { instance, mock, reset } from 'ts-mockito'
import { MockedClass } from 'vitest'
import { EmailMessage, SudoEmailClient } from '../../../src'
import { SubscribeToEmailMessagesUseCase } from '../../../src/private/domain/use-cases/message/subscribeToEmailMessagesUseCase'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

vi.mock(
  '../../../src/private/domain/use-cases/message/subscribeToEmailMessagesUseCase',
)
const ViMockSubscribeToEmailMessagesUseCase =
  SubscribeToEmailMessagesUseCase as MockedClass<
    typeof SubscribeToEmailMessagesUseCase
  >

describe('SudoEmailClient.subscribeToEmailMessages Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockSubscribeToEmailMessagesUseCase =
    mock<SubscribeToEmailMessagesUseCase>()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockSubscribeToEmailMessagesUseCase)
    ViMockSubscribeToEmailMessagesUseCase.mockClear()

    ViMockSubscribeToEmailMessagesUseCase.mockImplementation(function () {
      return instance(mockSubscribeToEmailMessagesUseCase)
    })

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()
  })
  it('generates use case', async () => {
    await instanceUnderTest.subscribeToEmailMessages('subscriber-id', {
      emailMessageDeleted(emailMessage: EmailMessage): void {},
      emailMessageCreated(emailMessage: EmailMessage): void {},
      emailMessageUpdated(emailMessage: EmailMessage): void {},
    })
    expect(ViMockSubscribeToEmailMessagesUseCase).toHaveBeenCalledTimes(1)
  })
})
