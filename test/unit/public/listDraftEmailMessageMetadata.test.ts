/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { instance, mock, reset, verify, when } from 'ts-mockito'
import { MockedClass } from 'vitest'
import { SudoEmailClient } from '../../../src'
import { ListDraftEmailMessageMetadataUseCase } from '../../../src/private/domain/use-cases/draft/listDraftEmailMessageMetadataUseCase'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

vi.mock(
  '../../../src/private/domain/use-cases/draft/listDraftEmailMessageMetadataUseCase',
)
const ViMockListDraftEmailMessageMetadataUseCase =
  ListDraftEmailMessageMetadataUseCase as MockedClass<
    typeof ListDraftEmailMessageMetadataUseCase
  >

describe('SudoEmailClient.listDraftEmailMessageMetadata Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockListDraftEmailMessageMetadataUseCase =
    mock<ListDraftEmailMessageMetadataUseCase>()
  const updatedAt = new Date()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockListDraftEmailMessageMetadataUseCase)
    ViMockListDraftEmailMessageMetadataUseCase.mockClear()

    ViMockListDraftEmailMessageMetadataUseCase.mockImplementation(function () {
      return instance(mockListDraftEmailMessageMetadataUseCase)
    })

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(mockListDraftEmailMessageMetadataUseCase.execute()).thenResolve({
      metadata: [{ id: 'id', emailAddressId: 'emailAddressId', updatedAt }],
    })
  })

  it('generates use case', async () => {
    await instanceUnderTest.listDraftEmailMessageMetadata()
    expect(ViMockListDraftEmailMessageMetadataUseCase).toHaveBeenCalledTimes(1)
  })

  it('calls use case as expected', async () => {
    await instanceUnderTest.listDraftEmailMessageMetadata()
    verify(mockListDraftEmailMessageMetadataUseCase.execute()).once()
  })

  it('returns empty list when use case returns empty list', async () => {
    when(mockListDraftEmailMessageMetadataUseCase.execute()).thenResolve({
      metadata: [],
    })
    await expect(
      instanceUnderTest.listDraftEmailMessageMetadata(),
    ).resolves.toHaveLength(0)
  })

  it('returns expected result', async () => {
    await expect(
      instanceUnderTest.listDraftEmailMessageMetadata(),
    ).resolves.toEqual([
      { id: 'id', emailAddressId: 'emailAddressId', updatedAt },
    ])
  })
})
