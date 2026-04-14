/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { instance, mock, reset, verify, when } from 'ts-mockito'
import { MockedClass } from 'vitest'
import { SudoEmailClient } from '../../../src'
import { GetSupportedEmailDomainsUseCase } from '../../../src/private/domain/use-cases/emailDomain/getSupportedEmailDomainsUseCase'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

vi.mock(
  '../../../src/private/domain/use-cases/emailDomain/getSupportedEmailDomainsUseCase',
)
const ViMockGetSupportedEmailDomainsUseCase =
  GetSupportedEmailDomainsUseCase as MockedClass<
    typeof GetSupportedEmailDomainsUseCase
  >

describe('SudoEmailClient.getSupportedEmailDomains Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockGetSupportedEmailDomainsUseCase =
    mock<GetSupportedEmailDomainsUseCase>()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockGetSupportedEmailDomainsUseCase)

    ViMockGetSupportedEmailDomainsUseCase.mockClear()

    ViMockGetSupportedEmailDomainsUseCase.mockImplementation(function () {
      return instance(mockGetSupportedEmailDomainsUseCase)
    })

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(mockGetSupportedEmailDomainsUseCase.execute()).thenResolve([
      { domain: 'domain.com' },
    ])
  })
  it('generates use case', async () => {
    await instanceUnderTest.getSupportedEmailDomains()
    expect(ViMockGetSupportedEmailDomainsUseCase).toHaveBeenCalledTimes(1)
  })
  it('calls use case as expected', async () => {
    await instanceUnderTest.getSupportedEmailDomains()
    verify(mockGetSupportedEmailDomainsUseCase.execute()).once()
  })
  it('returns expected result', async () => {
    await expect(instanceUnderTest.getSupportedEmailDomains()).resolves.toEqual(
      ['domain.com'],
    )
  })
})
