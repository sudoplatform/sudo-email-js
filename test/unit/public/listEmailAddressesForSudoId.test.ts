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
import { SudoEmailClient } from '../../../src'
import { ListEmailAccountsForSudoIdUseCase } from '../../../src/private/domain/use-cases/account/listEmailAccountsForSudoIdUseCase'
import { APIDataFactory } from '../data-factory/api'
import { EntityDataFactory } from '../data-factory/entity'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

vi.mock(
  '../../../src/private/domain/use-cases/account/listEmailAccountsForSudoIdUseCase',
)
const ViMockListEmailAccountsForSudoIdUseCase =
  ListEmailAccountsForSudoIdUseCase as MockedClass<
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

    ViMockListEmailAccountsForSudoIdUseCase.mockClear()

    ViMockListEmailAccountsForSudoIdUseCase.mockImplementation(function () {
      return instance(mockListEmailAccountsForSudoIdUseCase)
    })

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
      limit: 0,
      nextToken: '',
    })
    expect(ViMockListEmailAccountsForSudoIdUseCase).toHaveBeenCalledTimes(1)
  })
  it('calls use case as expected', async () => {
    const sudoId = v4()
    const limit = 100
    const nextToken = v4()
    await instanceUnderTest.listEmailAddressesForSudoId({
      sudoId,
      limit,
      nextToken,
    })
    verify(mockListEmailAccountsForSudoIdUseCase.execute(anything())).once()
    const [actualArgs] = capture(
      mockListEmailAccountsForSudoIdUseCase.execute,
    ).first()
    expect(actualArgs).toEqual<typeof actualArgs>({
      sudoId,
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
      }),
    ).resolves.toStrictEqual({
      status: 'Success',
      items: [APIDataFactory.emailAddress],
      nextToken: 'nextToken',
    })
  })
})
