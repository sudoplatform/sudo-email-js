/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { instance, mock, reset, verify, when } from 'ts-mockito'
import { MockedClass } from 'vitest'
import { SudoEmailClient } from '../../../src'
import { GetConfigurationDataUseCase } from '../../../src/private/domain/use-cases/configuration/getConfigurationDataUseCase'
import { APIDataFactory } from '../data-factory/api'
import { EntityDataFactory } from '../data-factory/entity'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

vi.mock(
  '../../../src/private/domain/use-cases/configuration/getConfigurationDataUseCase',
)
const ViMockGetConfigurationDataUseCase =
  GetConfigurationDataUseCase as MockedClass<typeof GetConfigurationDataUseCase>

describe('SudoEmailClient.getConfigurationData Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockGetConfigurationDataUseCase = mock<GetConfigurationDataUseCase>()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockGetConfigurationDataUseCase)
    ViMockGetConfigurationDataUseCase.mockClear()

    ViMockGetConfigurationDataUseCase.mockImplementation(function () {
      return instance(mockGetConfigurationDataUseCase)
    })

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(mockGetConfigurationDataUseCase.execute()).thenResolve(
      EntityDataFactory.configurationData,
    )
  })
  it('generates use case', async () => {
    await instanceUnderTest.getConfigurationData()
    expect(ViMockGetConfigurationDataUseCase).toHaveBeenCalledTimes(1)
  })
  it('calls use case as expected', async () => {
    await instanceUnderTest.getConfigurationData()
    verify(mockGetConfigurationDataUseCase.execute()).once()
  })
  it('returns expected result', async () => {
    await expect(instanceUnderTest.getConfigurationData()).resolves.toEqual(
      APIDataFactory.configurationData,
    )
  })
})
