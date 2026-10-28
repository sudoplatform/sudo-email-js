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
import { EnableEmailAliasUseCase } from '../../../src/private/domain/use-cases/alias/enableEmailAliasUseCase'
import { APIDataFactory } from '../data-factory/api'
import { EntityDataFactory } from '../data-factory/entity'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

vi.mock('../../../src/private/domain/use-cases/alias/enableEmailAliasUseCase')
const ViMockEnableEmailAliasUseCase = EnableEmailAliasUseCase as MockedClass<
  typeof EnableEmailAliasUseCase
>

describe('SudoEmailClient.enableEmailAlias Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockEnableEmailAliasUseCase = mock<EnableEmailAliasUseCase>()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockEnableEmailAliasUseCase)
    ViMockEnableEmailAliasUseCase.mockClear()
    ViMockEnableEmailAliasUseCase.mockImplementation(function () {
      return instance(mockEnableEmailAliasUseCase)
    })

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(mockEnableEmailAliasUseCase.execute(anything())).thenResolve(
      EntityDataFactory.emailAlias,
    )
  })

  it('generates use case', async () => {
    await instanceUnderTest.enableEmailAlias({
      emailAliasId: 'test-id',
    })
    expect(ViMockEnableEmailAliasUseCase).toHaveBeenCalledTimes(1)
  })

  it('calls use case as expected', async () => {
    const input = {
      emailAliasId: v4(),
    }

    await instanceUnderTest.enableEmailAlias(input)

    verify(mockEnableEmailAliasUseCase.execute(anything())).once()
    const [args] = capture(mockEnableEmailAliasUseCase.execute).first()
    expect(args).toStrictEqual<typeof args>(input)
  })

  it('returns expected result', async () => {
    await expect(
      instanceUnderTest.enableEmailAlias({
        emailAliasId: 'test-id',
      }),
    ).resolves.toEqual(APIDataFactory.emailAlias)
  })
})
