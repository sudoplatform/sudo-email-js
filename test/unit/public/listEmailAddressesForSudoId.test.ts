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
import { SudoEmailClient } from '../../../src'
import { ListEmailAccountsForSudoIdUseCase } from '../../../src/private/domain/use-cases/account/listEmailAccountsForSudoIdUseCase'
import { APIDataFactory } from '../data-factory/api'
import { EntityDataFactory } from '../data-factory/entity'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

jest.mock(
  '../../../src/private/domain/use-cases/account/listEmailAccountsForSudoIdUseCase',
)
const JestMockListEmailAccountsForSudoIdUseCase =
  ListEmailAccountsForSudoIdUseCase as jest.MockedClass<
    typeof ListEmailAccountsForSudoIdUseCase
  >

describe('SudoEmailClient.listEmailAccountsForSudoId Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockListEmailAccountsForSudoIdUseCase =
    mock<ListEmailAccountsForSudoIdUseCase>()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockListEmailAccountsForSudoIdUseCase)

    JestMockListEmailAccountsForSudoIdUseCase.mockClear()

    JestMockListEmailAccountsForSudoIdUseCase.mockImplementation(() =>
      instance(mockListEmailAccountsForSudoIdUseCase),
    )

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(mockListEmailAccountsForSudoIdUseCase.execute(anything())).thenResolve(
      {
        emailAccounts: [EntityDataFactory.emailAccount],
        nextToken: 'nextToken',
      },
    )
  })
  it('generates use case', async () => {
    const sudoId = v4()
    await instanceUnderTest.listEmailAddressesForSudoId({
      sudoId,
      cachePolicy: CachePolicy.CacheOnly,
      limit: 0,
      nextToken: '',
    })
    expect(JestMockListEmailAccountsForSudoIdUseCase).toHaveBeenCalledTimes(1)
  })
  it('calls use case as expected', async () => {
    const sudoId = v4()
    const cachePolicy = CachePolicy.CacheOnly
    const limit = 100
    const nextToken = v4()
    await instanceUnderTest.listEmailAddressesForSudoId({
      sudoId,
      cachePolicy,
      limit,
      nextToken,
    })
    verify(mockListEmailAccountsForSudoIdUseCase.execute(anything())).once()
    const [actualArgs] = capture(
      mockListEmailAccountsForSudoIdUseCase.execute,
    ).first()
    expect(actualArgs).toEqual<typeof actualArgs>({
      sudoId,
      cachePolicy,
      limit,
      nextToken,
    })
  })
  it('returns empty list if use case result is empty list', async () => {
    const sudoId = v4()
    when(mockListEmailAccountsForSudoIdUseCase.execute(anything())).thenResolve(
      {
        emailAccounts: [],
        nextToken: undefined,
      },
    )
    await expect(
      instanceUnderTest.listEmailAddressesForSudoId({
        sudoId,
        cachePolicy: CachePolicy.CacheOnly,
      }),
    ).resolves.toStrictEqual({
      status: 'Success',
      items: [],
      nextToken: undefined,
    })
  })
  it('returns expected result', async () => {
    const sudoId = v4()
    await expect(
      instanceUnderTest.listEmailAddressesForSudoId({
        sudoId,
        cachePolicy: CachePolicy.CacheOnly,
      }),
    ).resolves.toStrictEqual({
      status: 'Success',
      items: [APIDataFactory.emailAddress],
      nextToken: 'nextToken',
    })
  })
})
