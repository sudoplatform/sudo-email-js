/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { instance, mock, reset, verify, when } from 'ts-mockito'
import { SudoEmailClient } from '../../../src'
import { GetConfigurationDataUseCase } from '../../../src/private/domain/use-cases/configuration/getConfigurationDataUseCase'
import { APIDataFactory } from '../data-factory/api'
import { EntityDataFactory } from '../data-factory/entity'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

jest.mock(
  '../../../src/private/domain/use-cases/configuration/getConfigurationDataUseCase',
)
const JestMockGetConfigurationDataUseCase =
  GetConfigurationDataUseCase as jest.MockedClass<
    typeof GetConfigurationDataUseCase
  >

describe('SudoEmailClient.getConfigurationData Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockGetConfigurationDataUseCase = mock<GetConfigurationDataUseCase>()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockGetConfigurationDataUseCase)
    JestMockGetConfigurationDataUseCase.mockClear()

    JestMockGetConfigurationDataUseCase.mockImplementation(() =>
      instance(mockGetConfigurationDataUseCase),
    )

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(mockGetConfigurationDataUseCase.execute()).thenResolve(
      EntityDataFactory.configurationData,
    )
  })
  it('generates use case', async () => {
    await instanceUnderTest.getConfigurationData()
    expect(JestMockGetConfigurationDataUseCase).toHaveBeenCalledTimes(1)
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
