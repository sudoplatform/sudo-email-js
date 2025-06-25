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
import { DraftEmailMessage, SudoEmailClient } from '../../../src'
import { ListDraftEmailMessagesForEmailAddressIdUseCase } from '../../../src/private/domain/use-cases/draft/listDraftEmailMessagesForEmailAddressIdUseCase'
import { stringToArrayBuffer } from '../../../src/private/util/buffer'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

jest.mock(
  '../../../src/private/domain/use-cases/draft/listDraftEmailMessagesForEmailAddressIdUseCase',
)
const JestMockListDraftEmailMessagesForEmailAddressIdUseCase =
  ListDraftEmailMessagesForEmailAddressIdUseCase as jest.MockedClass<
    typeof ListDraftEmailMessagesForEmailAddressIdUseCase
  >

describe('SudoEmailClient.listDraftEmailMessagesForEmailAddressId Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockListDraftEmailMessagesForEmailAddressIdUseCase =
    mock<ListDraftEmailMessagesForEmailAddressIdUseCase>()
  const updatedAt = new Date()
  const rfc822Data = stringToArrayBuffer('data')

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockListDraftEmailMessagesForEmailAddressIdUseCase)
    JestMockListDraftEmailMessagesForEmailAddressIdUseCase.mockClear()

    JestMockListDraftEmailMessagesForEmailAddressIdUseCase.mockImplementation(
      () => instance(mockListDraftEmailMessagesForEmailAddressIdUseCase),
    )

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(
      mockListDraftEmailMessagesForEmailAddressIdUseCase.execute(anything()),
    ).thenResolve({
      draftMessages: [
        { id: 'id', emailAddressId: 'emailAddressId', updatedAt, rfc822Data },
      ],
    })
  })

  it('generates use case', async () => {
    await instanceUnderTest.listDraftEmailMessagesForEmailAddressId('')
    expect(
      JestMockListDraftEmailMessagesForEmailAddressIdUseCase,
    ).toHaveBeenCalledTimes(1)
  })

  it('calls use case as expected', async () => {
    const emailAddressId = v4()
    await instanceUnderTest.listDraftEmailMessagesForEmailAddressId(
      emailAddressId,
    )
    verify(
      mockListDraftEmailMessagesForEmailAddressIdUseCase.execute(anything()),
    ).once()
    const [actualArgs] = capture(
      mockListDraftEmailMessagesForEmailAddressIdUseCase.execute,
    ).first()
    expect(actualArgs).toEqual<typeof actualArgs>({
      emailAddressId,
    })
  })

  it('returns empty list when use case returns empty list', async () => {
    when(
      mockListDraftEmailMessagesForEmailAddressIdUseCase.execute(anything()),
    ).thenResolve({
      draftMessages: [],
    })
    await expect(
      instanceUnderTest.listDraftEmailMessagesForEmailAddressId(''),
    ).resolves.toHaveLength(0)
  })

  it('returns expected result', async () => {
    await expect(
      instanceUnderTest.listDraftEmailMessagesForEmailAddressId(''),
    ).resolves.toEqual<DraftEmailMessage[]>([
      { id: 'id', emailAddressId: 'emailAddressId', updatedAt, rfc822Data },
    ])
  })
})
