/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { CachePolicy } from '@sudoplatform/sudo-common'
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
import { SortOrder, SudoEmailClient } from '../../../src'
import { ListEmailMessagesUseCase } from '../../../src/private/domain/use-cases/message/listEmailMessagesUseCase'
import { APIDataFactory } from '../data-factory/api'
import { EntityDataFactory } from '../data-factory/entity'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

jest.mock(
  '../../../src/private/domain/use-cases/message/listEmailMessagesUseCase',
)
const JestMockListEmailMessagesUseCase =
  ListEmailMessagesUseCase as jest.MockedClass<typeof ListEmailMessagesUseCase>

describe('SudoEmailClient.listEmailMessages Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockListEmailMessagesUseCase = mock<ListEmailMessagesUseCase>()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockListEmailMessagesUseCase)
    JestMockListEmailMessagesUseCase.mockClear()

    JestMockListEmailMessagesUseCase.mockImplementation(() =>
      instance(mockListEmailMessagesUseCase),
    )

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(mockListEmailMessagesUseCase.execute(anything())).thenResolve({
      emailMessages: [EntityDataFactory.emailMessage],
      nextToken: 'nextToken',
    })
  })
  it('generates use case', async () => {
    await instanceUnderTest.listEmailMessages({
      cachePolicy: CachePolicy.CacheOnly,
      limit: 0,
      sortOrder: SortOrder.Desc,
      nextToken: '',
    })
    expect(JestMockListEmailMessagesUseCase).toHaveBeenCalledTimes(1)
  })
  it('calls use case as expected', async () => {
    const cachePolicy = CachePolicy.CacheOnly
    const dateRange = {
      sortDate: {
        startDate: new Date(1.0),
        endDate: new Date(2.0),
      },
    }
    const limit = 100
    const sortOrder = SortOrder.Desc
    const nextToken = v4()
    await instanceUnderTest.listEmailMessages({
      dateRange,
      cachePolicy,
      limit,
      sortOrder,
      nextToken,
    })
    verify(mockListEmailMessagesUseCase.execute(anything())).once()
    const [actualArgs] = capture(mockListEmailMessagesUseCase.execute).first()
    expect(actualArgs).toEqual<typeof actualArgs>({
      dateRange,
      cachePolicy,
      limit,
      sortOrder,
      nextToken,
    })
  })
  it('returns empty list if use case result is empty list', async () => {
    when(mockListEmailMessagesUseCase.execute(anything())).thenResolve({
      emailMessages: [],
      nextToken: undefined,
    })
    await expect(
      instanceUnderTest.listEmailMessages({
        cachePolicy: CachePolicy.CacheOnly,
      }),
    ).resolves.toEqual({ status: 'Success', items: [], nextToken: undefined })
  })
  it('returns expected result', async () => {
    await expect(
      instanceUnderTest.listEmailMessages({
        cachePolicy: CachePolicy.CacheOnly,
      }),
    ).resolves.toEqual({
      status: 'Success',
      items: [APIDataFactory.emailMessage],
      nextToken: 'nextToken',
    })
  })
})
