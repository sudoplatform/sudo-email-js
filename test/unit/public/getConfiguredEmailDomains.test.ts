/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { instance, mock, reset, verify, when } from 'ts-mockito'
import { MockedClass } from 'vitest'
import { SudoEmailClient } from '../../../src'
import { GetConfiguredEmailDomainsUseCase } from '../../../src/private/domain/use-cases/emailDomain/getConfiguredEmailDomainsUseCase'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

vi.mock(
  '../../../src/private/domain/use-cases/emailDomain/getConfiguredEmailDomainsUseCase',
)
const ViMockGetConfiguredEmailDomainsUseCase =
  GetConfiguredEmailDomainsUseCase as MockedClass<
    typeof GetConfiguredEmailDomainsUseCase
  >

describe('SudoEmailClient.getConfiguredEmailDomains Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockGetConfiguredEmailDomainsUseCase =
    mock<GetConfiguredEmailDomainsUseCase>()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockGetConfiguredEmailDomainsUseCase)

    ViMockGetConfiguredEmailDomainsUseCase.mockClear()

    ViMockGetConfiguredEmailDomainsUseCase.mockImplementation(function () {
      return instance(mockGetConfiguredEmailDomainsUseCase)
    })

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(mockGetConfiguredEmailDomainsUseCase.execute()).thenResolve([
      { domain: 'domain.com' },
    ])
  })
  it('generates use case', async () => {
    await instanceUnderTest.getConfiguredEmailDomains()
    expect(ViMockGetConfiguredEmailDomainsUseCase).toHaveBeenCalledTimes(1)
  })
  it('calls use case as expected', async () => {
    await instanceUnderTest.getConfiguredEmailDomains()
    verify(mockGetConfiguredEmailDomainsUseCase.execute()).once()
  })
  it('returns expected result', async () => {
    await expect(
      instanceUnderTest.getConfiguredEmailDomains(),
    ).resolves.toEqual(['domain.com'])
  })
})
