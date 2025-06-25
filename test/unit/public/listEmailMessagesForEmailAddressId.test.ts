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
import { EmailMessageDateRange, SortOrder, SudoEmailClient } from '../../../src'
import { ListEmailMessagesForEmailAddressIdUseCase } from '../../../src/private/domain/use-cases/message/listEmailMessagesForEmailAddressIdUseCase'
import { APIDataFactory } from '../data-factory/api'
import { EntityDataFactory } from '../data-factory/entity'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

jest.mock(
  '../../../src/private/domain/use-cases/message/listEmailMessagesForEmailAddressIdUseCase',
)
const JestMockListEmailMessagesForEmailAddressIdUseCase =
  ListEmailMessagesForEmailAddressIdUseCase as jest.MockedClass<
    typeof ListEmailMessagesForEmailAddressIdUseCase
  >

describe('SudoEmailClient.listEmailMessagesForEmailAddressId Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockListEmailMessagesForEmailAddressIdUseCase =
    mock<ListEmailMessagesForEmailAddressIdUseCase>()
  let emailAddressId: string

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockListEmailMessagesForEmailAddressIdUseCase)
    JestMockListEmailMessagesForEmailAddressIdUseCase.mockClear()

    JestMockListEmailMessagesForEmailAddressIdUseCase.mockImplementation(() =>
      instance(mockListEmailMessagesForEmailAddressIdUseCase),
    )

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()
    emailAddressId = v4()

    when(
      mockListEmailMessagesForEmailAddressIdUseCase.execute(anything()),
    ).thenResolve({
      emailMessages: [EntityDataFactory.emailMessage],
      nextToken: 'nextToken',
    })
  })
  it('generates use case', async () => {
    const emailAddressId = v4()
    await instanceUnderTest.listEmailMessagesForEmailAddressId({
      emailAddressId,
      cachePolicy: CachePolicy.CacheOnly,
      limit: 0,
      sortOrder: SortOrder.Desc,
      nextToken: '',
    })
    expect(
      JestMockListEmailMessagesForEmailAddressIdUseCase,
    ).toHaveBeenCalledTimes(1)
  })
  it('calls use case as expected', async () => {
    const emailAddressId = v4()
    const cachePolicy = CachePolicy.CacheOnly
    const dateRange: EmailMessageDateRange = {
      sortDate: {
        startDate: new Date(1.0),
        endDate: new Date(2.0),
      },
    }
    const limit = 100
    const sortOrder = SortOrder.Desc
    const nextToken = v4()
    await instanceUnderTest.listEmailMessagesForEmailAddressId({
      emailAddressId,
      cachePolicy,
      dateRange,
      limit,
      sortOrder,
      nextToken,
    })
    verify(
      mockListEmailMessagesForEmailAddressIdUseCase.execute(anything()),
    ).once()
    const [actualArgs] = capture(
      mockListEmailMessagesForEmailAddressIdUseCase.execute,
    ).first()
    expect(actualArgs).toEqual<typeof actualArgs>({
      emailAddressId,
      cachePolicy,
      dateRange,
      limit,
      sortOrder,
      nextToken,
    })
  })
  it('returns empty list if use case result is empty list', async () => {
    const emailAddressId = v4()
    when(
      mockListEmailMessagesForEmailAddressIdUseCase.execute(anything()),
    ).thenResolve({
      emailMessages: [],
      nextToken: undefined,
    })
    await expect(
      instanceUnderTest.listEmailMessagesForEmailAddressId({
        emailAddressId,
        cachePolicy: CachePolicy.CacheOnly,
      }),
    ).resolves.toEqual({ status: 'Success', items: [], nextToken: undefined })
  })
  it('returns expected result', async () => {
    const emailAddressId = v4()
    await expect(
      instanceUnderTest.listEmailMessagesForEmailAddressId({
        emailAddressId,
        cachePolicy: CachePolicy.CacheOnly,
      }),
    ).resolves.toEqual({
      status: 'Success',
      items: [APIDataFactory.emailMessage],
      nextToken: 'nextToken',
    })
  })
})
