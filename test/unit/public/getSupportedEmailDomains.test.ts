/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { instance, mock, reset, verify, when } from 'ts-mockito'
import { SudoEmailClient } from '../../../src'
import { GetSupportedEmailDomainsUseCase } from '../../../src/private/domain/use-cases/emailDomain/getSupportedEmailDomainsUseCase'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

jest.mock(
  '../../../src/private/domain/use-cases/emailDomain/getSupportedEmailDomainsUseCase',
)
const JestMockGetSupportedEmailDomainsUseCase =
  GetSupportedEmailDomainsUseCase as jest.MockedClass<
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

    JestMockGetSupportedEmailDomainsUseCase.mockClear()

    JestMockGetSupportedEmailDomainsUseCase.mockImplementation(() =>
      instance(mockGetSupportedEmailDomainsUseCase),
    )

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(mockGetSupportedEmailDomainsUseCase.execute()).thenResolve([
      { domain: 'domain.com' },
    ])
  })
  it('generates use case', async () => {
    await instanceUnderTest.getSupportedEmailDomains()
    expect(JestMockGetSupportedEmailDomainsUseCase).toHaveBeenCalledTimes(1)
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
