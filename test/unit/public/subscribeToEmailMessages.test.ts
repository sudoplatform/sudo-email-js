/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { instance, mock, reset } from 'ts-mockito'
import { EmailMessage, SudoEmailClient } from '../../../src'
import { SubscribeToEmailMessagesUseCase } from '../../../src/private/domain/use-cases/message/subscribeToEmailMessagesUseCase'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

jest.mock(
  '../../../src/private/domain/use-cases/message/subscribeToEmailMessagesUseCase',
)
const JestMockSubscribeToEmailMessagesUseCase =
  SubscribeToEmailMessagesUseCase as jest.MockedClass<
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
    JestMockSubscribeToEmailMessagesUseCase.mockClear()

    JestMockSubscribeToEmailMessagesUseCase.mockImplementation(() =>
      instance(mockSubscribeToEmailMessagesUseCase),
    )

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()
  })
  it('generates use case', async () => {
    await instanceUnderTest.subscribeToEmailMessages('subscriber-id', {
      emailMessageDeleted(emailMessage: EmailMessage): void {},
      emailMessageCreated(emailMessage: EmailMessage): void {},
      emailMessageUpdated(emailMessage: EmailMessage): void {},
    })
    expect(JestMockSubscribeToEmailMessagesUseCase).toHaveBeenCalledTimes(1)
  })
})
