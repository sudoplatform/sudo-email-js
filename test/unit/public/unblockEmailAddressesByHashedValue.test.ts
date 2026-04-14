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
import { BatchOperationResultStatus, SudoEmailClient } from '../../../src'
import { UpdateEmailMessagesStatus } from '../../../src/private/domain/entities/message/updateEmailMessagesStatus'
import {
  UnblockEmailAddressesByHashedValueUseCase,
  UnblockEmailAddressesByHashedValueUseCaseInput,
} from '../../../src/private/domain/use-cases/blocklist/unblockEmailAddressesByHashedValue'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

vi.mock(
  '../../../src/private/domain/use-cases/blocklist/unblockEmailAddressesByHashedValue',
)
const ViMockUnblockEmailAddressesByHashedValueUseCase =
  UnblockEmailAddressesByHashedValueUseCase as MockedClass<
    typeof UnblockEmailAddressesByHashedValueUseCase
  >

describe('SudoEmailClient.unblockEmailAddressesByHashedValue Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockUnblockEmailAddressesByHashedValueUseCase =
    mock<UnblockEmailAddressesByHashedValueUseCase>()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockUnblockEmailAddressesByHashedValueUseCase)

    ViMockUnblockEmailAddressesByHashedValueUseCase.mockClear()

    ViMockUnblockEmailAddressesByHashedValueUseCase.mockImplementation(
      function () {
        return instance(mockUnblockEmailAddressesByHashedValueUseCase)
      },
    )

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(
      mockUnblockEmailAddressesByHashedValueUseCase.execute(anything()),
    ).thenResolve({
      status: UpdateEmailMessagesStatus.Success,
    })
  })

  it('generates use case', async () => {
    await instanceUnderTest.unblockEmailAddressesByHashedValue({
      hashedValues: [`hashedValue-${v4()}`],
    })
    expect(
      ViMockUnblockEmailAddressesByHashedValueUseCase,
    ).toHaveBeenCalledTimes(1)
  })

  it('calls use case as expected', async () => {
    const hashedValues = [
      `hashedValue-${v4()}`,
      `hashedValue-${v4()}`,
      `hashedValue-${v4()}`,
    ]
    await instanceUnderTest.unblockEmailAddressesByHashedValue({
      hashedValues,
    })
    verify(
      mockUnblockEmailAddressesByHashedValueUseCase.execute(anything()),
    ).once()
    const [args] = capture(
      mockUnblockEmailAddressesByHashedValueUseCase.execute,
    ).first()
    expect(args).toEqual({
      hashedValues,
    })
  })

  it('returns expected result on success', async () => {
    const hashedValues = [
      `hashedValue-${v4()}`,
      `hashedValue-${v4()}`,
      `hashedValue-${v4()}`,
    ]
    await expect(
      instanceUnderTest.unblockEmailAddressesByHashedValue({
        hashedValues,
      }),
    ).resolves.toEqual({ status: BatchOperationResultStatus.Success })
  })

  it('returns expected result on failure', async () => {
    when(
      mockUnblockEmailAddressesByHashedValueUseCase.execute(anything()),
    ).thenResolve({
      status: UpdateEmailMessagesStatus.Failed,
    })
    const hashedValues = [
      `hashedValue-${v4()}`,
      `hashedValue-${v4()}`,
      `hashedValue-${v4()}`,
    ]
    await expect(
      instanceUnderTest.unblockEmailAddressesByHashedValue({
        hashedValues,
      }),
    ).resolves.toEqual({ status: BatchOperationResultStatus.Failure })
  })

  it('returns expected result on partial success', async () => {
    when(
      mockUnblockEmailAddressesByHashedValueUseCase.execute(anything()),
    ).thenCall((input: UnblockEmailAddressesByHashedValueUseCaseInput) => {
      const [first, ...rest] = input.hashedValues
      return Promise.resolve({
        status: UpdateEmailMessagesStatus.Partial,
        failedAddresses: [first],
        successAddresses: rest,
      })
    })
    const hashedValues = [
      `hashedValue-${v4()}`,
      `hashedValue-${v4()}`,
      `hashedValue-${v4()}`,
    ]
    await expect(
      instanceUnderTest.unblockEmailAddressesByHashedValue({
        hashedValues,
      }),
    ).resolves.toEqual({
      status: BatchOperationResultStatus.Partial,
      failureValues: [hashedValues[0]],
      successValues: [hashedValues[1], hashedValues[2]],
    })
  })
})
