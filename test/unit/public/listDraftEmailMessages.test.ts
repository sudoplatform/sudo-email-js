/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { instance, mock, reset, verify, when } from 'ts-mockito'
import { DraftEmailMessage, SudoEmailClient } from '../../../src'
import { ListDraftEmailMessagesUseCase } from '../../../src/private/domain/use-cases/draft/listDraftEmailMessagesUseCase'
import { stringToArrayBuffer } from '../../../src/private/util/buffer'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

jest.mock(
  '../../../src/private/domain/use-cases/draft/listDraftEmailMessagesUseCase',
)
const JestMockListDraftEmailMessagesUseCase =
  ListDraftEmailMessagesUseCase as jest.MockedClass<
    typeof ListDraftEmailMessagesUseCase
  >

describe('SudoEmailClient.listDraftEmailMessages Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockListDraftEmailMessagesUseCase =
    mock<ListDraftEmailMessagesUseCase>()
  const updatedAt = new Date()
  const rfc822Data = stringToArrayBuffer('data')

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockListDraftEmailMessagesUseCase)
    JestMockListDraftEmailMessagesUseCase.mockClear()

    JestMockListDraftEmailMessagesUseCase.mockImplementation(() =>
      instance(mockListDraftEmailMessagesUseCase),
    )

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(mockListDraftEmailMessagesUseCase.execute()).thenResolve({
      draftMessages: [
        { id: 'id', emailAddressId: 'emailAddressId', updatedAt, rfc822Data },
      ],
    })
  })

  it('generates use case', async () => {
    await instanceUnderTest.listDraftEmailMessages()
    expect(JestMockListDraftEmailMessagesUseCase).toHaveBeenCalledTimes(1)
  })

  it('calls use case as expected', async () => {
    await instanceUnderTest.listDraftEmailMessages()
    verify(mockListDraftEmailMessagesUseCase.execute()).once()
  })

  it('returns empty list when use case returns empty list', async () => {
    when(mockListDraftEmailMessagesUseCase.execute()).thenResolve({
      draftMessages: [],
    })
    await expect(
      instanceUnderTest.listDraftEmailMessages(),
    ).resolves.toHaveLength(0)
  })

  it('returns expected result', async () => {
    await expect(instanceUnderTest.listDraftEmailMessages()).resolves.toEqual<
      DraftEmailMessage[]
    >([{ id: 'id', emailAddressId: 'emailAddressId', updatedAt, rfc822Data }])
  })
})
