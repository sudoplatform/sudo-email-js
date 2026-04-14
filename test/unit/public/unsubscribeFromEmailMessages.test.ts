/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { instance, mock, reset } from 'ts-mockito'
import { MockedClass } from 'vitest'
import { SudoEmailClient } from '../../../src'
import { UnsubscribeFromEmailMessagesUseCase } from '../../../src/private/domain/use-cases/message/unsubscribeFromEmailMessagesUseCase'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

vi.mock(
  '../../../src/private/domain/use-cases/message/unsubscribeFromEmailMessagesUseCase',
)
const ViMockUnsubscribeFromEmailMessagesUseCase =
  UnsubscribeFromEmailMessagesUseCase as MockedClass<
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
    ViMockUnsubscribeFromEmailMessagesUseCase.mockClear()

    ViMockUnsubscribeFromEmailMessagesUseCase.mockImplementation(function () {
      return instance(mockUnsubscribeFromEmailMessagesUseCase)
    })

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()
  })
  it('generates use case', () => {
    instanceUnderTest.unsubscribeFromEmailMessages('subscriber-id')

    expect(ViMockUnsubscribeFromEmailMessagesUseCase).toHaveBeenCalledTimes(1)
  })
})
