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
import { GetEmailMessageUseCase } from '../../../src/private/domain/use-cases/message/getEmailMessageUseCase'
import { EntityDataFactory } from '../data-factory/entity'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'
import { APIDataFactory } from '../data-factory/api'
import { v4 } from 'uuid'

vi.mock('../../../src/private/domain/use-cases/message/getEmailMessageUseCase')
const ViMockGetEmailMessageUseCase = GetEmailMessageUseCase as MockedClass<
  typeof GetEmailMessageUseCase
>
vi.mock('../../../src/private/domain/use-cases/message/getEmailMessageUseCase')

describe('SudoEmailClient.getEmailMessage Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockGetEmailMessageUseCase = mock<GetEmailMessageUseCase>()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockGetEmailMessageUseCase)
    ViMockGetEmailMessageUseCase.mockClear()

    ViMockGetEmailMessageUseCase.mockImplementation(function () {
      return instance(mockGetEmailMessageUseCase)
    })

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(mockGetEmailMessageUseCase.execute(anything())).thenResolve(
      EntityDataFactory.emailMessage,
    )
  })
  it('generates use case', async () => {
    await instanceUnderTest.getEmailMessage({
      id: '',
    })
    expect(ViMockGetEmailMessageUseCase).toHaveBeenCalledTimes(1)
  })
  it('calls use case as expected', async () => {
    const id = v4()
    await instanceUnderTest.getEmailMessage({ id })
    verify(mockGetEmailMessageUseCase.execute(anything())).once()
    const [actualArgs] = capture(mockGetEmailMessageUseCase.execute).first()
    expect(actualArgs).toEqual<typeof actualArgs>({
      id,
    })
  })

  it('returns undefined if use case result is undefined', async () => {
    when(mockGetEmailMessageUseCase.execute(anything())).thenResolve(undefined)
    await expect(
      instanceUnderTest.getEmailMessage({
        id: '',
      }),
    ).resolves.toBeUndefined()
  })
  it('returns expected result', async () => {
    await expect(
      instanceUnderTest.getEmailMessage({
        id: '',
      }),
    ).resolves.toEqual(APIDataFactory.emailMessage)
  })
})
