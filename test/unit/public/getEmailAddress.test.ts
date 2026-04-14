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
import { GetEmailAccountUseCase } from '../../../src/private/domain/use-cases/account/getEmailAccountUseCase'
import { APIDataFactory } from '../data-factory/api'
import { EntityDataFactory } from '../data-factory/entity'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

vi.mock('../../../src/private/domain/use-cases/account/getEmailAccountUseCase')
const ViMockGetEmailAccountUseCase = GetEmailAccountUseCase as MockedClass<
  typeof GetEmailAccountUseCase
>

describe('SudoEmailClient.getEmailAccount Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockGetEmailAccountUseCase = mock<GetEmailAccountUseCase>()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockGetEmailAccountUseCase)

    ViMockGetEmailAccountUseCase.mockClear()

    ViMockGetEmailAccountUseCase.mockImplementation(function () {
      return instance(mockGetEmailAccountUseCase)
    })

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(mockGetEmailAccountUseCase.execute(anything())).thenResolve(
      EntityDataFactory.emailAccount,
    )
  })
  it('generates use case', async () => {
    await instanceUnderTest.getEmailAddress({
      id: '',
    })
    expect(ViMockGetEmailAccountUseCase).toHaveBeenCalledTimes(1)
  })
  it('calls use case as expected', async () => {
    const id = v4()
    await instanceUnderTest.getEmailAddress({ id })
    verify(mockGetEmailAccountUseCase.execute(anything())).once()
    const [actualArgs] = capture(mockGetEmailAccountUseCase.execute).first()
    expect(actualArgs).toEqual<typeof actualArgs>({ id })
  })

  it('returns undefined if use case result is undefined', async () => {
    when(mockGetEmailAccountUseCase.execute(anything())).thenResolve(undefined)
    await expect(
      instanceUnderTest.getEmailAddress({
        id: '',
      }),
    ).resolves.toBeUndefined()
  })
  it('returns expected result', async () => {
    await expect(
      instanceUnderTest.getEmailAddress({
        id: '',
      }),
    ).resolves.toEqual(APIDataFactory.emailAddress)
  })
})
