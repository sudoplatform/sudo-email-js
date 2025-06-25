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
import { GetEmailAccountUseCase } from '../../../src/private/domain/use-cases/account/getEmailAccountUseCase'
import { APIDataFactory } from '../data-factory/api'
import { EntityDataFactory } from '../data-factory/entity'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

jest.mock(
  '../../../src/private/domain/use-cases/account/getEmailAccountUseCase',
)
const JestMockGetEmailAccountUseCase =
  GetEmailAccountUseCase as jest.MockedClass<typeof GetEmailAccountUseCase>

describe('SudoEmailClient.getEmailAccount Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockGetEmailAccountUseCase = mock<GetEmailAccountUseCase>()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockGetEmailAccountUseCase)

    JestMockGetEmailAccountUseCase.mockClear()

    JestMockGetEmailAccountUseCase.mockImplementation(() =>
      instance(mockGetEmailAccountUseCase),
    )

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(mockGetEmailAccountUseCase.execute(anything())).thenResolve(
      EntityDataFactory.emailAccount,
    )
  })
  it('generates use case', async () => {
    await instanceUnderTest.getEmailAddress({
      id: '',
      cachePolicy: CachePolicy.CacheOnly,
    })
    expect(JestMockGetEmailAccountUseCase).toHaveBeenCalledTimes(1)
  })
  it('calls use case as expected', async () => {
    const id = v4()
    const cachePolicy = CachePolicy.CacheOnly
    await instanceUnderTest.getEmailAddress({ id, cachePolicy })
    verify(mockGetEmailAccountUseCase.execute(anything())).once()
    const [actualArgs] = capture(mockGetEmailAccountUseCase.execute).first()
    expect(actualArgs).toEqual<typeof actualArgs>({ id, cachePolicy })
  })

  it('returns undefined if use case result is undefined', async () => {
    when(mockGetEmailAccountUseCase.execute(anything())).thenResolve(undefined)
    await expect(
      instanceUnderTest.getEmailAddress({
        id: '',
        cachePolicy: CachePolicy.CacheOnly,
      }),
    ).resolves.toBeUndefined()
  })
  it('returns expected result', async () => {
    await expect(
      instanceUnderTest.getEmailAddress({
        id: '',
        cachePolicy: CachePolicy.CacheOnly,
      }),
    ).resolves.toEqual(APIDataFactory.emailAddress)
  })
})
