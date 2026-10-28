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
import { DeprovisionEmailAliasUseCase } from '../../../src/private/domain/use-cases/alias/deprovisionEmailAliasUseCase'
import { APIDataFactory } from '../data-factory/api'
import { EntityDataFactory } from '../data-factory/entity'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

vi.mock(
  '../../../src/private/domain/use-cases/alias/deprovisionEmailAliasUseCase',
)
const ViMockDeprovisionEmailAliasUseCase =
  DeprovisionEmailAliasUseCase as MockedClass<
    typeof DeprovisionEmailAliasUseCase
  >

describe('SudoEmailClient.deprovisionEmailAlias Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockDeprovisionEmailAliasUseCase = mock<DeprovisionEmailAliasUseCase>()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockDeprovisionEmailAliasUseCase)
    ViMockDeprovisionEmailAliasUseCase.mockClear()
    ViMockDeprovisionEmailAliasUseCase.mockImplementation(function () {
      return instance(mockDeprovisionEmailAliasUseCase)
    })

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(mockDeprovisionEmailAliasUseCase.execute(anything())).thenResolve(
      EntityDataFactory.emailAlias,
    )
  })

  it('generates use case', async () => {
    await instanceUnderTest.deprovisionEmailAlias({
      emailAliasId: 'test-id',
    })
    expect(ViMockDeprovisionEmailAliasUseCase).toHaveBeenCalledTimes(1)
  })

  it('calls use case as expected', async () => {
    const input = {
      emailAliasId: v4(),
    }

    await instanceUnderTest.deprovisionEmailAlias(input)

    verify(mockDeprovisionEmailAliasUseCase.execute(anything())).once()
    const [args] = capture(mockDeprovisionEmailAliasUseCase.execute).first()
    expect(args).toStrictEqual<typeof args>(input)
  })

  it('returns expected result', async () => {
    await expect(
      instanceUnderTest.deprovisionEmailAlias({
        emailAliasId: 'test-id',
      }),
    ).resolves.toEqual(APIDataFactory.emailAlias)
  })
})
