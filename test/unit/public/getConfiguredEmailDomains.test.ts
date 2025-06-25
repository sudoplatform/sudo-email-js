/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { CachePolicy } from '@sudoplatform/sudo-common'
import {
  anything,
  capture,
  instance,
  mock,
  reset,
  verify,
  when,
} from 'ts-mockito'
import { SudoEmailClient } from '../../../src'
import { GetConfiguredEmailDomainsUseCase } from '../../../src/private/domain/use-cases/emailDomain/getConfiguredEmailDomainsUseCase'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

jest.mock(
  '../../../src/private/domain/use-cases/emailDomain/getConfiguredEmailDomainsUseCase',
)
const JestMockGetConfiguredEmailDomainsUseCase =
  GetConfiguredEmailDomainsUseCase as jest.MockedClass<
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

    JestMockGetConfiguredEmailDomainsUseCase.mockClear()

    JestMockGetConfiguredEmailDomainsUseCase.mockImplementation(() =>
      instance(mockGetConfiguredEmailDomainsUseCase),
    )

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(mockGetConfiguredEmailDomainsUseCase.execute(anything())).thenResolve([
      { domain: 'domain.com' },
    ])
  })
  it('generates use case', async () => {
    await instanceUnderTest.getConfiguredEmailDomains(CachePolicy.CacheOnly)
    expect(JestMockGetConfiguredEmailDomainsUseCase).toHaveBeenCalledTimes(1)
  })
  it('calls use case as expected', async () => {
    await instanceUnderTest.getConfiguredEmailDomains(CachePolicy.CacheOnly)
    verify(mockGetConfiguredEmailDomainsUseCase.execute(anything())).once()
    const [actualCachePolicy] = capture(
      mockGetConfiguredEmailDomainsUseCase.execute,
    ).first()
    expect(actualCachePolicy).toEqual(CachePolicy.CacheOnly)
  })
  it('returns expected result', async () => {
    await expect(
      instanceUnderTest.getConfiguredEmailDomains(CachePolicy.CacheOnly),
    ).resolves.toEqual(['domain.com'])
  })
})
