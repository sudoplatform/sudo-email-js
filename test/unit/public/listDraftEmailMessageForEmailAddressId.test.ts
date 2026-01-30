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
import { ListOutput } from '@sudoplatform/sudo-common'

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
    await instanceUnderTest.listDraftEmailMessagesForEmailAddressId({
      emailAddressId: '',
    })
    expect(
      JestMockListDraftEmailMessagesForEmailAddressIdUseCase,
    ).toHaveBeenCalledTimes(1)
  })

  it('calls use case as expected', async () => {
    const emailAddressId = v4()
    await instanceUnderTest.listDraftEmailMessagesForEmailAddressId({
      emailAddressId,
    })
    verify(
      mockListDraftEmailMessagesForEmailAddressIdUseCase.execute(anything()),
    ).once()
    const [actualArgs] = capture(
      mockListDraftEmailMessagesForEmailAddressIdUseCase.execute,
    ).first()
    expect(actualArgs).toEqual<typeof actualArgs>({
      emailAddressId,
      limit: 10,
      nextToken: undefined,
    })
  })

  it('returns empty list when use case returns empty list', async () => {
    when(
      mockListDraftEmailMessagesForEmailAddressIdUseCase.execute(anything()),
    ).thenResolve({
      draftMessages: [],
    })

    const result =
      await instanceUnderTest.listDraftEmailMessagesForEmailAddressId({
        emailAddressId: '',
      })

    expect(result.items).toHaveLength(0)
  })

  it('returns expected result', async () => {
    await expect(
      instanceUnderTest.listDraftEmailMessagesForEmailAddressId({
        emailAddressId: '',
      }),
    ).resolves.toEqual<ListOutput<DraftEmailMessage>>({
      items: [
        { id: 'id', emailAddressId: 'emailAddressId', updatedAt, rfc822Data },
      ],
    })
  })
})
