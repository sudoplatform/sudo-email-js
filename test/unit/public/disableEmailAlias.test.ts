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
import { DisableEmailAliasUseCase } from '../../../src/private/domain/use-cases/alias/disableEmailAliasUseCase'
import { APIDataFactory } from '../data-factory/api'
import { EntityDataFactory } from '../data-factory/entity'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

vi.mock('../../../src/private/domain/use-cases/alias/disableEmailAliasUseCase')
const ViMockDisableEmailAliasUseCase = DisableEmailAliasUseCase as MockedClass<
  typeof DisableEmailAliasUseCase
>

describe('SudoEmailClient.disableEmailAlias Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockDisableEmailAliasUseCase = mock<DisableEmailAliasUseCase>()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockDisableEmailAliasUseCase)
    ViMockDisableEmailAliasUseCase.mockClear()
    ViMockDisableEmailAliasUseCase.mockImplementation(function () {
      return instance(mockDisableEmailAliasUseCase)
    })

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(mockDisableEmailAliasUseCase.execute(anything())).thenResolve(
      EntityDataFactory.emailAlias,
    )
  })

  it('generates use case', async () => {
    await instanceUnderTest.disableEmailAlias({
      emailAliasId: 'test-id',
    })
    expect(ViMockDisableEmailAliasUseCase).toHaveBeenCalledTimes(1)
  })

  it('calls use case as expected', async () => {
    const input = {
      emailAliasId: v4(),
    }

    await instanceUnderTest.disableEmailAlias(input)

    verify(mockDisableEmailAliasUseCase.execute(anything())).once()
    const [args] = capture(mockDisableEmailAliasUseCase.execute).first()
    expect(args).toStrictEqual<typeof args>(input)
  })

  it('returns expected result', async () => {
    await expect(
      instanceUnderTest.disableEmailAlias({
        emailAliasId: 'test-id',
      }),
    ).resolves.toEqual(APIDataFactory.emailAlias)
  })
})
