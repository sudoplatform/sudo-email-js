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
import { EmailAliasNotFoundError, SudoEmailClient } from '../../../src'
import { GetEmailAliasByIdUseCase } from '../../../src/private/domain/use-cases/alias/getEmailAliasByIdUseCase'
import { APIDataFactory } from '../data-factory/api'
import { EntityDataFactory } from '../data-factory/entity'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

vi.mock('../../../src/private/domain/use-cases/alias/getEmailAliasByIdUseCase')
const ViMockGetEmailAliasByIdUseCase = GetEmailAliasByIdUseCase as MockedClass<
  typeof GetEmailAliasByIdUseCase
>

describe('SudoEmailClient.getEmailAliasByIdById Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockGetEmailAliasByIdUseCase = mock<GetEmailAliasByIdUseCase>()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockGetEmailAliasByIdUseCase)

    ViMockGetEmailAliasByIdUseCase.mockClear()

    ViMockGetEmailAliasByIdUseCase.mockImplementation(function () {
      return instance(mockGetEmailAliasByIdUseCase)
    })

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(mockGetEmailAliasByIdUseCase.execute(anything())).thenResolve(
      EntityDataFactory.emailAlias,
    )
  })

  it('generates use case', async () => {
    await instanceUnderTest.getEmailAliasById({
      id: '',
    })
    expect(ViMockGetEmailAliasByIdUseCase).toHaveBeenCalledTimes(1)
  })

  it('calls use case as expected', async () => {
    const id = v4()
    await instanceUnderTest.getEmailAliasById({ id })
    verify(mockGetEmailAliasByIdUseCase.execute(anything())).once()
    const [actualArgs] = capture(mockGetEmailAliasByIdUseCase.execute).first()
    expect(actualArgs).toEqual<typeof actualArgs>({ id })
  })

  it('throws EmailAliasNotFoundError if thrown by use case', async () => {
    when(mockGetEmailAliasByIdUseCase.execute(anything())).thenReject(
      new EmailAliasNotFoundError(),
    )
    await expect(
      instanceUnderTest.getEmailAliasById({
        id: '',
      }),
    ).rejects.toBeInstanceOf(EmailAliasNotFoundError)
  })

  it('returns expected result', async () => {
    await expect(
      instanceUnderTest.getEmailAliasById({
        id: '',
      }),
    ).resolves.toEqual(APIDataFactory.emailAlias)
  })
})
