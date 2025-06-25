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
import { v4 } from 'uuid'
import { BatchOperationResultStatus, SudoEmailClient } from '../../../src'
import { DeleteDraftEmailMessagesUseCase } from '../../../src/private/domain/use-cases/draft/deleteDraftEmailMessagesUseCase'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

jest.mock(
  '../../../src/private/domain/use-cases/draft/deleteDraftEmailMessagesUseCase',
)
const JestMockDeleteDraftEmailMessagesUseCase =
  DeleteDraftEmailMessagesUseCase as jest.MockedClass<
    typeof DeleteDraftEmailMessagesUseCase
  >

describe('SudoEmailClient.deleteDraftEmailMessages Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockDeleteDraftEmailMessagesUseCase =
    mock<DeleteDraftEmailMessagesUseCase>()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockDeleteDraftEmailMessagesUseCase)

    JestMockDeleteDraftEmailMessagesUseCase.mockClear()

    JestMockDeleteDraftEmailMessagesUseCase.mockImplementation(() =>
      instance(mockDeleteDraftEmailMessagesUseCase),
    )

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(mockDeleteDraftEmailMessagesUseCase.execute(anything())).thenResolve({
      successIds: [],
      failureMessages: [],
    })
  })
  it('generates use case', async () => {
    await instanceUnderTest.deleteDraftEmailMessages({
      ids: [],
      emailAddressId: '',
    })
    expect(JestMockDeleteDraftEmailMessagesUseCase).toHaveBeenCalledTimes(1)
  })
  it('calls use case with unique input set', async () => {
    const emailAddressId = v4()
    await instanceUnderTest.deleteDraftEmailMessages({
      ids: ['id1', 'id1', 'id2', 'id3', 'id2'],
      emailAddressId,
    })
    verify(mockDeleteDraftEmailMessagesUseCase.execute(anything())).once()
    const [actualArgs] = capture(
      mockDeleteDraftEmailMessagesUseCase.execute,
    ).first()
    const actualArray = Array.from(actualArgs.ids)
    expect(actualArgs.emailAddressId).toEqual(emailAddressId)
    expect(actualArray).toHaveLength(3)
    expect(actualArray).toContain('id1')
    expect(actualArray).toContain('id2')
    expect(actualArray).toContain('id3')
  })
  it('returns success when success ids equal the unique set of input ids', async () => {
    const duplicateInputArray = ['id1', 'id1', 'id2', 'id3', 'id2']
    const uniqueArray = Array.from(new Set(duplicateInputArray))
    const successValues = uniqueArray.map((id) => ({ id }))
    when(mockDeleteDraftEmailMessagesUseCase.execute(anything())).thenResolve({
      successIds: uniqueArray,
      failureMessages: [],
    })
    await expect(
      instanceUnderTest.deleteDraftEmailMessages({
        ids: duplicateInputArray,
        emailAddressId: '',
      }),
    ).resolves.toEqual({
      status: BatchOperationResultStatus.Success,
      successValues: successValues,
      failureValues: [],
    })
  })
  it('returns failure when all failure ids equal the unique set of input ids', async () => {
    const duplicateInputArray = ['id1', 'id1', 'id2', 'id3', 'id2']
    const uniqueArray = Array.from(new Set(duplicateInputArray))
    when(mockDeleteDraftEmailMessagesUseCase.execute(anything())).thenResolve({
      successIds: [],
      failureMessages: uniqueArray.map((id) => ({
        id,
        errorType: 'error',
      })),
    })
    await expect(
      instanceUnderTest.deleteDraftEmailMessages({
        ids: duplicateInputArray,
        emailAddressId: '',
      }),
    ).resolves.toEqual({
      status: BatchOperationResultStatus.Failure,
      failureValues: [
        { id: 'id1', errorType: 'error' },
        { id: 'id2', errorType: 'error' },
        { id: 'id3', errorType: 'error' },
      ],
      successValues: [],
    })
  })
  it('returns partial success when there is a mix of success and failure ids', async () => {
    const duplicateInputArray = ['id1', 'id1', 'id2', 'id3', 'id2']
    when(mockDeleteDraftEmailMessagesUseCase.execute(anything())).thenResolve({
      successIds: ['id1'],
      failureMessages: [
        { id: 'id2', errorType: 'error' },
        { id: 'id3', errorType: 'error' },
      ],
    })
    await expect(
      instanceUnderTest.deleteDraftEmailMessages({
        ids: duplicateInputArray,
        emailAddressId: '',
      }),
    ).resolves.toEqual({
      status: BatchOperationResultStatus.Partial,
      failureValues: [
        { id: 'id2', errorType: 'error' },
        { id: 'id3', errorType: 'error' },
      ],
      successValues: [{ id: 'id1' }],
    })
  })
})
