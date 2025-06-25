/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { anything, instance, mock, reset, when } from 'ts-mockito'
import { BatchOperationResultStatus, SudoEmailClient } from '../../../src'
import { DeleteEmailMessagesUseCase } from '../../../src/private/domain/use-cases/message/deleteEmailMessagesUseCase'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

jest.mock(
  '../../../src/private/domain/use-cases/message/deleteEmailMessagesUseCase',
)
const JestMockDeleteEmailMessagesUseCase =
  DeleteEmailMessagesUseCase as jest.MockedClass<
    typeof DeleteEmailMessagesUseCase
  >

describe('SudoEmailClient.deleteEmailMessage Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockDeleteEmailMessagesUseCase = mock<DeleteEmailMessagesUseCase>()
  const messageIds = ['1', '2', '3']
  const successResult = messageIds.map((id) => ({ id }))

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockDeleteEmailMessagesUseCase)
    JestMockDeleteEmailMessagesUseCase.mockClear()

    JestMockDeleteEmailMessagesUseCase.mockImplementation(() =>
      instance(mockDeleteEmailMessagesUseCase),
    )

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(mockDeleteEmailMessagesUseCase.execute(anything())).thenResolve({
      successIds: messageIds,
      failureMessages: [],
    })
  })
  it('deletes a single message successfully', async () => {
    when(mockDeleteEmailMessagesUseCase.execute(anything())).thenResolve({
      successIds: ['1'],
      failureMessages: [],
    })
    await expect(instanceUnderTest.deleteEmailMessage('1')).resolves.toEqual({
      id: '1',
    })
  })
  it('returns undefined when single delete fails', async () => {
    when(mockDeleteEmailMessagesUseCase.execute(anything())).thenResolve({
      successIds: [],
      failureMessages: [],
    })
    await expect(
      instanceUnderTest.deleteEmailMessage('1'),
    ).resolves.toBeUndefined()
  })
  it('deletes multiple messages successfully', async () => {
    await expect(
      instanceUnderTest.deleteEmailMessages(messageIds),
    ).resolves.toEqual({
      status: BatchOperationResultStatus.Success,
      successValues: successResult,
      failureValues: [],
    })
  })
  it('returns failure when no messages are deleted', async () => {
    const messageIds = ['1', '2', '3']
    const failureResult = messageIds.map((id) => ({ id, errorType: '' }))
    when(mockDeleteEmailMessagesUseCase.execute(anything())).thenResolve({
      successIds: [],
      failureMessages: failureResult,
    })
    await expect(
      instanceUnderTest.deleteEmailMessages(messageIds),
    ).resolves.toEqual({
      status: BatchOperationResultStatus.Failure,
      successValues: [],
      failureValues: failureResult,
    })
  })
  it('returns partial when some of the messages fail to delete', async () => {
    const idsToDelete = ['1', '2', '3', '4', '5']
    const successIds = ['2', '3', '4']
    const successResult = successIds.map((id) => ({ id }))
    const failureIds = ['1', '5']
    const failureResult = failureIds.map((id) => ({ id, errorType: '' }))
    when(mockDeleteEmailMessagesUseCase.execute(anything())).thenResolve({
      successIds: successIds,
      failureMessages: failureResult,
    })
    await expect(
      instanceUnderTest.deleteEmailMessages(idsToDelete),
    ).resolves.toEqual({
      status: BatchOperationResultStatus.Partial,
      successValues: successResult,
      failureValues: failureResult,
    })
  })
})
