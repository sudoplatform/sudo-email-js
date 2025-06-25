/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DateTime } from 'luxon'
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
import { ScheduleSendDraftMessageUseCase } from '../../../src/private/domain/use-cases/draft/scheduleSendDraftMessageUseCase'
import { EntityDataFactory } from '../data-factory/entity'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

jest.mock(
  '../../../src/private/domain/use-cases/draft/scheduleSendDraftMessageUseCase',
)
const JestMockScheduleSendDraftMessageUseCase =
  ScheduleSendDraftMessageUseCase as jest.MockedClass<
    typeof ScheduleSendDraftMessageUseCase
  >

describe('SudoEmailClient.scheduleSendDraftMessage Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockScheduleSendDraftMessageUseCase =
    mock<ScheduleSendDraftMessageUseCase>()
  let sendAt: Date

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockScheduleSendDraftMessageUseCase)
    JestMockScheduleSendDraftMessageUseCase.mockClear()

    JestMockScheduleSendDraftMessageUseCase.mockImplementation(() =>
      instance(mockScheduleSendDraftMessageUseCase),
    )

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    sendAt = DateTime.now().plus({ day: 1 }).toJSDate()
    when(mockScheduleSendDraftMessageUseCase.execute(anything())).thenResolve(
      EntityDataFactory.scheduledDraftMessage,
    )
  })

  it('generates use case', async () => {
    await instanceUnderTest.scheduleSendDraftMessage({
      id: EntityDataFactory.scheduledDraftMessage.id,
      emailAddressId: EntityDataFactory.emailAccount.id,
      sendAt,
    })
    expect(ScheduleSendDraftMessageUseCase).toHaveBeenCalledTimes(1)
  })

  it('returns expected output on success', async () => {
    const result = await instanceUnderTest.scheduleSendDraftMessage({
      id: EntityDataFactory.scheduledDraftMessage.id,
      emailAddressId: EntityDataFactory.emailAccount.id,
      sendAt,
    })

    expect(result).toEqual(EntityDataFactory.scheduledDraftMessage)
    verify(mockScheduleSendDraftMessageUseCase.execute(anything())).once()
    const [useCaseArgs] = capture(
      mockScheduleSendDraftMessageUseCase.execute,
    ).first()
    expect(useCaseArgs).toStrictEqual<typeof useCaseArgs>({
      id: EntityDataFactory.scheduledDraftMessage.id,
      emailAddressId: EntityDataFactory.emailAccount.id,
      sendAt,
    })
  })
})
