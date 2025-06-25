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
import { DraftEmailMessageMetadata, SudoEmailClient } from '../../../src'
import { ListDraftEmailMessageMetadataForEmailAddressIdUseCase } from '../../../src/private/domain/use-cases/draft/listDraftEmailMessageMetadataForEmailAddressIdUseCase'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

jest.mock(
  '../../../src/private/domain/use-cases/draft/listDraftEmailMessageMetadataForEmailAddressIdUseCase',
)
const JestMockListDraftEmailMessageMetadataForEmailAddressIdUseCase =
  ListDraftEmailMessageMetadataForEmailAddressIdUseCase as jest.MockedClass<
    typeof ListDraftEmailMessageMetadataForEmailAddressIdUseCase
  >

describe('SudoEmailClient.listDraftEmailMessageMetadataForEmailAddressId Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockListDraftEmailMessageMetadataForEmailAddressIdUseCase =
    mock<ListDraftEmailMessageMetadataForEmailAddressIdUseCase>()
  const updatedAt = new Date()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockListDraftEmailMessageMetadataForEmailAddressIdUseCase)
    JestMockListDraftEmailMessageMetadataForEmailAddressIdUseCase.mockClear()

    JestMockListDraftEmailMessageMetadataForEmailAddressIdUseCase.mockImplementation(
      () => instance(mockListDraftEmailMessageMetadataForEmailAddressIdUseCase),
    )

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(
      mockListDraftEmailMessageMetadataForEmailAddressIdUseCase.execute(
        anything(),
      ),
    ).thenResolve({
      metadata: [{ id: 'id', emailAddressId: 'emailAddressId', updatedAt }],
    })
  })

  it('generates use case', async () => {
    await instanceUnderTest.listDraftEmailMessageMetadataForEmailAddressId('')
    expect(
      JestMockListDraftEmailMessageMetadataForEmailAddressIdUseCase,
    ).toHaveBeenCalledTimes(1)
  })

  it('calls use case as expected', async () => {
    const emailAddressId = v4()
    await instanceUnderTest.listDraftEmailMessageMetadataForEmailAddressId(
      emailAddressId,
    )
    verify(
      mockListDraftEmailMessageMetadataForEmailAddressIdUseCase.execute(
        anything(),
      ),
    ).once()
    const [actualArgs] = capture(
      mockListDraftEmailMessageMetadataForEmailAddressIdUseCase.execute,
    ).first()
    expect(actualArgs).toEqual<typeof actualArgs>({
      emailAddressId,
    })
  })

  it('returns empty list when use case returns empty list', async () => {
    when(
      mockListDraftEmailMessageMetadataForEmailAddressIdUseCase.execute(
        anything(),
      ),
    ).thenResolve({
      metadata: [],
    })
    await expect(
      instanceUnderTest.listDraftEmailMessageMetadataForEmailAddressId(''),
    ).resolves.toHaveLength(0)
  })

  it('returns expected result', async () => {
    await expect(
      instanceUnderTest.listDraftEmailMessageMetadataForEmailAddressId(''),
    ).resolves.toEqual<DraftEmailMessageMetadata[]>([
      { id: 'id', emailAddressId: 'emailAddressId', updatedAt },
    ])
  })
})
