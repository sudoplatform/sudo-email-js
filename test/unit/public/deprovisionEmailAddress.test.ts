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
import { DeprovisionEmailAccountUseCase } from '../../../src/private/domain/use-cases/account/deprovisionEmailAccountUseCase'
import { APIDataFactory } from '../data-factory/api'
import { EntityDataFactory } from '../data-factory/entity'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

vi.mock(
  '../../../src/private/domain/use-cases/account/deprovisionEmailAccountUseCase',
)
const ViMockDeprovisionEmailAccountUseCase =
  DeprovisionEmailAccountUseCase as MockedClass<
    typeof DeprovisionEmailAccountUseCase
  >

describe('SudoEmailClient.deprovisionEmailAccount Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockDeprovisionEmailAccountUseCase =
    mock<DeprovisionEmailAccountUseCase>()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockDeprovisionEmailAccountUseCase)

    ViMockDeprovisionEmailAccountUseCase.mockClear()

    ViMockDeprovisionEmailAccountUseCase.mockImplementation(function () {
      return instance(mockDeprovisionEmailAccountUseCase)
    })

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(mockDeprovisionEmailAccountUseCase.execute(anything())).thenResolve(
      EntityDataFactory.emailAccount,
    )
  })
  it('generates use case', async () => {
    await instanceUnderTest.deprovisionEmailAddress('')
    expect(ViMockDeprovisionEmailAccountUseCase).toHaveBeenCalledTimes(1)
  })
  it('calls use case as expected', async () => {
    const id = v4()
    await instanceUnderTest.deprovisionEmailAddress(id)
    verify(mockDeprovisionEmailAccountUseCase.execute(anything())).once()
    const [actualId] = capture(
      mockDeprovisionEmailAccountUseCase.execute,
    ).first()
    expect(actualId).toEqual(id)
  })
  it('returns expected result', async () => {
    await expect(
      instanceUnderTest.deprovisionEmailAddress(''),
    ).resolves.toEqual(APIDataFactory.emailAddress)
  })
})
