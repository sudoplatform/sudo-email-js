/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
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
import { SudoEmailClient } from '../../../src'
import { CancelScheduledDraftMessageUseCase } from '../../../src/private/domain/use-cases/draft/cancelScheduledDraftMessageUseCase'
import { EntityDataFactory } from '../data-factory/entity'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

jest.mock(
  '../../../src/private/domain/use-cases/draft/cancelScheduledDraftMessageUseCase',
)
const JestMockCancelScheduledDraftMessageUseCase =
  CancelScheduledDraftMessageUseCase as jest.MockedClass<
    typeof CancelScheduledDraftMessageUseCase
  >

describe('SudoEmailClient.cancelScheduledDraftMessage Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockCancelScheduledDraftMessageUseCase =
    mock<CancelScheduledDraftMessageUseCase>()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockCancelScheduledDraftMessageUseCase)
    JestMockCancelScheduledDraftMessageUseCase.mockClear()

    JestMockCancelScheduledDraftMessageUseCase.mockImplementation(() =>
      instance(mockCancelScheduledDraftMessageUseCase),
    )

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(
      mockCancelScheduledDraftMessageUseCase.execute(anything()),
    ).thenResolve(EntityDataFactory.scheduledDraftMessage.id)
  })

  it('generates use case', async () => {
    await instanceUnderTest.cancelScheduledDraftMessage({
      id: EntityDataFactory.scheduledDraftMessage.id,
      emailAddressId: EntityDataFactory.scheduledDraftMessage.emailAddressId,
    })
    expect(CancelScheduledDraftMessageUseCase).toHaveBeenCalledTimes(1)
  })

  it('returns expected output on success', async () => {
    const result = await instanceUnderTest.cancelScheduledDraftMessage({
      id: EntityDataFactory.scheduledDraftMessage.id,
      emailAddressId: EntityDataFactory.scheduledDraftMessage.emailAddressId,
    })

    expect(result).toEqual(EntityDataFactory.scheduledDraftMessage.id)
    verify(mockCancelScheduledDraftMessageUseCase.execute(anything())).once()
    const [useCaseArgs] = capture(
      mockCancelScheduledDraftMessageUseCase.execute,
    ).first()
    expect(useCaseArgs).toStrictEqual<typeof useCaseArgs>({
      id: EntityDataFactory.scheduledDraftMessage.id,
      emailAddressId: EntityDataFactory.scheduledDraftMessage.emailAddressId,
    })
  })
})
