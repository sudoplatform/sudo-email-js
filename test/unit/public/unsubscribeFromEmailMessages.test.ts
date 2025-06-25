/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { instance, mock, reset } from 'ts-mockito'
import { SudoEmailClient } from '../../../src'
import { UnsubscribeFromEmailMessagesUseCase } from '../../../src/private/domain/use-cases/message/unsubscribeFromEmailMessagesUseCase'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

jest.mock(
  '../../../src/private/domain/use-cases/message/unsubscribeFromEmailMessagesUseCase',
)
const JestMockUnsubscribeFromEmailMessagesUseCase =
  UnsubscribeFromEmailMessagesUseCase as jest.MockedClass<
    typeof UnsubscribeFromEmailMessagesUseCase
  >

describe('SudoEmailClient.unsubscribeFromEmailMessages Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockUnsubscribeFromEmailMessagesUseCase =
    mock<UnsubscribeFromEmailMessagesUseCase>()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockUnsubscribeFromEmailMessagesUseCase)
    JestMockUnsubscribeFromEmailMessagesUseCase.mockClear()

    JestMockUnsubscribeFromEmailMessagesUseCase.mockImplementation(() =>
      instance(mockUnsubscribeFromEmailMessagesUseCase),
    )

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()
  })
  it('generates use case', () => {
    instanceUnderTest.unsubscribeFromEmailMessages('subscriber-id')

    expect(JestMockUnsubscribeFromEmailMessagesUseCase).toHaveBeenCalledTimes(1)
  })
})
