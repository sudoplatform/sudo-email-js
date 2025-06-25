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
import { BatchOperationResultStatus, SudoEmailClient } from '../../../src'
import { UpdateEmailMessagesStatus } from '../../../src/private/domain/entities/message/updateEmailMessagesStatus'
import { UpdateEmailMessagesUseCase } from '../../../src/private/domain/use-cases/message/updateEmailMessagesUseCase'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

jest.mock(
  '../../../src/private/domain/use-cases/message/updateEmailMessagesUseCase',
)
const JestMockUpdateEmailMessagesUseCase =
  UpdateEmailMessagesUseCase as jest.MockedClass<
    typeof UpdateEmailMessagesUseCase
  >

describe('SudoEmailClient.updateEmailMessages Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockUpdateEmailMessagesUseCase = mock<UpdateEmailMessagesUseCase>()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockUpdateEmailMessagesUseCase)

    JestMockUpdateEmailMessagesUseCase.mockClear()

    JestMockUpdateEmailMessagesUseCase.mockImplementation(() =>
      instance(mockUpdateEmailMessagesUseCase),
    )

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(mockUpdateEmailMessagesUseCase.execute(anything())).thenResolve({
      status: UpdateEmailMessagesStatus.Partial,
      successMessages: [
        {
          id: 'successId',
          createdAt: new Date(1.0),
          updatedAt: new Date(2.0),
        },
      ],
      failureMessages: [{ id: 'failureId', errorType: 'UnknownError' }],
    })
  })
  it('generates use case', async () => {
    await instanceUnderTest.updateEmailMessages({ ids: [], values: {} })
    expect(JestMockUpdateEmailMessagesUseCase).toHaveBeenCalledTimes(1)
  })
  it('calls use case with unique input set', async () => {
    await instanceUnderTest.updateEmailMessages({
      ids: ['id1', 'id1', 'id2', 'id3', 'id2'],
      values: { seen: true },
    })
    verify(mockUpdateEmailMessagesUseCase.execute(anything())).once()
    const [actualArgs] = capture(mockUpdateEmailMessagesUseCase.execute).first()
    const actualArray = Array.from(actualArgs.ids)
    expect(actualArgs.values).toEqual({ seen: true })
    expect(actualArray).toHaveLength(3)
    expect(actualArray).toContain('id1')
    expect(actualArray).toContain('id2')
    expect(actualArray).toContain('id3')
  })
  it('returns success when use case returns success update status', async () => {
    const inputArray = ['id1', 'id1', 'id2', 'id3', 'id2']
    when(mockUpdateEmailMessagesUseCase.execute(anything())).thenResolve({
      status: UpdateEmailMessagesStatus.Success,
    })
    await expect(
      instanceUnderTest.updateEmailMessages({
        ids: inputArray,
        values: { seen: true },
      }),
    ).resolves.toEqual({
      status: BatchOperationResultStatus.Success,
      successValues: [],
      failureValues: [],
    })
  })
  it('returns failure when use case returns failure update status', async () => {
    const inputArray = ['id1', 'id1', 'id2', 'id3', 'id2']
    when(mockUpdateEmailMessagesUseCase.execute(anything())).thenResolve({
      status: UpdateEmailMessagesStatus.Failed,
    })
    await expect(
      instanceUnderTest.updateEmailMessages({
        ids: inputArray,
        values: { seen: true },
      }),
    ).resolves.toEqual({
      status: BatchOperationResultStatus.Failure,
      successValues: [],
      failureValues: [],
    })
  })
  it('returns partial success when use case returns partial update status', async () => {
    const duplicateInputArray = ['id1', 'id1', 'id2', 'id3', 'id2']
    when(mockUpdateEmailMessagesUseCase.execute(anything())).thenResolve({
      status: UpdateEmailMessagesStatus.Partial,
      successMessages: [
        {
          id: 'id1',
          createdAt: new Date(1.0),
          updatedAt: new Date(2.0),
        },
      ],
      failureMessages: [
        { id: 'id2', errorType: 'UnknownError' },
        { id: 'id3', errorType: 'UnknownError' },
      ],
    })
    await expect(
      instanceUnderTest.updateEmailMessages({
        ids: duplicateInputArray,
        values: { folderId: 'folderId', seen: true },
      }),
    ).resolves.toEqual({
      status: BatchOperationResultStatus.Partial,
      successValues: [
        {
          id: 'id1',
          createdAt: new Date(1.0),
          updatedAt: new Date(2.0),
        },
      ],
      failureValues: [
        { id: 'id2', errorType: 'UnknownError' },
        { id: 'id3', errorType: 'UnknownError' },
      ],
    })
  })
})
