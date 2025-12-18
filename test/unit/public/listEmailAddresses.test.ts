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
import { SudoEmailClient } from '../../../src'
import { ListEmailAccountsUseCase } from '../../../src/private/domain/use-cases/account/listEmailAccountsUseCase'
import { APIDataFactory } from '../data-factory/api'
import { EntityDataFactory } from '../data-factory/entity'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

jest.mock(
  '../../../src/private/domain/use-cases/account/listEmailAccountsUseCase',
)
const JestMockListEmailAccountsUseCase =
  ListEmailAccountsUseCase as jest.MockedClass<typeof ListEmailAccountsUseCase>

describe('SudoEmailClient.listEmailAccounts Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockListEmailAccountsUseCase = mock<ListEmailAccountsUseCase>()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockListEmailAccountsUseCase)

    JestMockListEmailAccountsUseCase.mockClear()

    JestMockListEmailAccountsUseCase.mockImplementation(() =>
      instance(mockListEmailAccountsUseCase),
    )

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(mockListEmailAccountsUseCase.execute(anything())).thenResolve({
      emailAccounts: [EntityDataFactory.emailAccount],
      nextToken: 'nextToken',
    })
  })
  it('generates use case', async () => {
    await instanceUnderTest.listEmailAddresses({
      limit: 0,
      nextToken: '',
    })
    expect(JestMockListEmailAccountsUseCase).toHaveBeenCalledTimes(1)
  })
  it('calls use case as expected', async () => {
    const limit = 100
    const nextToken = v4()
    await instanceUnderTest.listEmailAddresses({
      limit,
      nextToken,
    })
    verify(mockListEmailAccountsUseCase.execute(anything())).once()
    const [actualArgs] = capture(mockListEmailAccountsUseCase.execute).first()
    expect(actualArgs).toEqual<typeof actualArgs>({
      limit,
      nextToken,
    })
  })

  it('returns empty list if use case result is empty list', async () => {
    when(mockListEmailAccountsUseCase.execute(anything())).thenResolve({
      emailAccounts: [],
      nextToken: undefined,
    })
    await expect(
      instanceUnderTest.listEmailAddresses({}),
    ).resolves.toStrictEqual({
      status: 'Success',
      items: [],
      nextToken: undefined,
    })
  })
  it('returns expected result', async () => {
    await expect(
      instanceUnderTest.listEmailAddresses({}),
    ).resolves.toStrictEqual({
      status: 'Success',
      items: [APIDataFactory.emailAddress],
      nextToken: 'nextToken',
    })
  })
  it('returns partial result', async () => {
    when(mockListEmailAccountsUseCase.execute(anything())).thenResolve({
      emailAccounts: [
        EntityDataFactory.emailAccount,
        {
          ...EntityDataFactory.emailAccount,
          status: { type: 'Failed', cause: new Error('dummy_error') },
        },
      ],
      nextToken: 'nextToken',
    })
    await expect(
      instanceUnderTest.listEmailAddresses({}),
    ).resolves.toStrictEqual({
      status: 'Partial',
      items: [APIDataFactory.emailAddress],
      failed: [
        {
          item: APIDataFactory.emailAddress,
          cause: new Error('dummy_error'),
        },
      ],
      nextToken: 'nextToken',
    })
  })
})
