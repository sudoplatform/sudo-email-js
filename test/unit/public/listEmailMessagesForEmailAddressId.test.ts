/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
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
import { MockedClass } from 'vitest'
import { v4 } from 'uuid'
import { EmailMessageDateRange, SortOrder, SudoEmailClient } from '../../../src'
import { ListEmailMessagesForEmailAddressIdUseCase } from '../../../src/private/domain/use-cases/message/listEmailMessagesForEmailAddressIdUseCase'
import { APIDataFactory } from '../data-factory/api'
import { EntityDataFactory } from '../data-factory/entity'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

vi.mock(
  '../../../src/private/domain/use-cases/message/listEmailMessagesForEmailAddressIdUseCase',
)
const ViMockListEmailMessagesForEmailAddressIdUseCase =
  ListEmailMessagesForEmailAddressIdUseCase as MockedClass<
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
    ViMockListEmailMessagesForEmailAddressIdUseCase.mockClear()

    ViMockListEmailMessagesForEmailAddressIdUseCase.mockImplementation(
      function () {
        return instance(mockListEmailMessagesForEmailAddressIdUseCase)
      },
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
      limit: 0,
      sortOrder: SortOrder.Desc,
      nextToken: '',
    })
    expect(
      ViMockListEmailMessagesForEmailAddressIdUseCase,
    ).toHaveBeenCalledTimes(1)
  })
  it('calls use case as expected', async () => {
    const emailAddressId = v4()
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
      }),
    ).resolves.toEqual({ status: 'Success', items: [], nextToken: undefined })
  })
  it('returns expected result', async () => {
    const emailAddressId = v4()
    await expect(
      instanceUnderTest.listEmailMessagesForEmailAddressId({
        emailAddressId,
      }),
    ).resolves.toEqual({
      status: 'Success',
      items: [APIDataFactory.emailMessage],
      nextToken: 'nextToken',
    })
  })
})
