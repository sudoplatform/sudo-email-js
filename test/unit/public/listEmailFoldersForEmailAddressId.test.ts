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
import { SudoEmailClient } from '../../../src'
import { EntityDataFactory } from '../data-factory/entity'
import { v4 } from 'uuid'
import { APIDataFactory } from '../data-factory/api'
import { ListEmailFoldersForEmailAddressIdUseCase } from '../../../src/private/domain/use-cases/folder/listEmailFoldersForEmailAddressIdUseCase'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

vi.mock(
  '../../../src/private/domain/use-cases/folder/listEmailFoldersForEmailAddressIdUseCase',
)
const ViMockListEmailFoldersForEmailAddressIdUseCase =
  ListEmailFoldersForEmailAddressIdUseCase as MockedClass<
    typeof ListEmailFoldersForEmailAddressIdUseCase
  >

describe('SudoEmailClient.listEmailFoldersForEmailAddressId Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockListEmailFoldersForEmailAddressIdUseCase =
    mock<ListEmailFoldersForEmailAddressIdUseCase>()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockListEmailFoldersForEmailAddressIdUseCase)

    ViMockListEmailFoldersForEmailAddressIdUseCase.mockClear()

    ViMockListEmailFoldersForEmailAddressIdUseCase.mockImplementation(
      function () {
        return instance(mockListEmailFoldersForEmailAddressIdUseCase)
      },
    )

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(
      mockListEmailFoldersForEmailAddressIdUseCase.execute(anything()),
    ).thenResolve({
      folders: [EntityDataFactory.emailFolder],
      nextToken: 'nextToken',
    })
  })
  it('generates use case', async () => {
    const emailAddressId = v4()
    await instanceUnderTest.listEmailFoldersForEmailAddressId({
      emailAddressId,
    })
    expect(
      ViMockListEmailFoldersForEmailAddressIdUseCase,
    ).toHaveBeenCalledTimes(1)
  })
  it('calls use case as expected', async () => {
    const emailAddressId = v4()
    const limit = 100
    const nextToken = v4()
    await instanceUnderTest.listEmailFoldersForEmailAddressId({
      emailAddressId,
      limit,
      nextToken,
    })
    verify(
      mockListEmailFoldersForEmailAddressIdUseCase.execute(anything()),
    ).once()
    const [actualArgs] = capture(
      mockListEmailFoldersForEmailAddressIdUseCase.execute,
    ).first()
    expect(actualArgs).toEqual<typeof actualArgs>({
      emailAddressId,
      limit,
      nextToken,
    })
  })
  it('returns empty list if use case result is empty list', async () => {
    const emailAddressId = v4()
    when(
      mockListEmailFoldersForEmailAddressIdUseCase.execute(anything()),
    ).thenResolve({
      folders: [],
      nextToken: undefined,
    })
    await expect(
      instanceUnderTest.listEmailFoldersForEmailAddressId({
        emailAddressId,
      }),
    ).resolves.toEqual({ items: [], nextToken: undefined })
  })
  it('returns expected result', async () => {
    const emailAddressId = v4()
    await expect(
      instanceUnderTest.listEmailFoldersForEmailAddressId({
        emailAddressId,
      }),
    ).resolves.toEqual({
      items: [APIDataFactory.emailFolder],
      nextToken: 'nextToken',
    })
  })
})
