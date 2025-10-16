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
import { GetEmailMaskDomainsUseCase } from '../../../src/private/domain/use-cases/emailDomain/getEmailMaskDomainsUseCase'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

jest.mock(
  '../../../src/private/domain/use-cases/emailDomain/getEmailMaskDomainsUseCase',
)
const JestMockGetEmailMaskDomainsUseCase =
  GetEmailMaskDomainsUseCase as jest.MockedClass<
    typeof GetEmailMaskDomainsUseCase
  >

describe('SudoEmailClient.getEmailMaskDomains Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockGetEmailMaskDomainsUseCase = mock<GetEmailMaskDomainsUseCase>()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockGetEmailMaskDomainsUseCase)

    JestMockGetEmailMaskDomainsUseCase.mockClear()

    JestMockGetEmailMaskDomainsUseCase.mockImplementation(() =>
      instance(mockGetEmailMaskDomainsUseCase),
    )

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(mockGetEmailMaskDomainsUseCase.execute(anything())).thenResolve([
      { domain: 'mask.anonyome.com' },
    ])
  })

  it('generates use case', async () => {
    await instanceUnderTest.getEmailMaskDomains(CachePolicy.CacheOnly)
    expect(JestMockGetEmailMaskDomainsUseCase).toHaveBeenCalledTimes(1)
  })

  it('calls use case as expected', async () => {
    await instanceUnderTest.getEmailMaskDomains(CachePolicy.CacheOnly)
    verify(mockGetEmailMaskDomainsUseCase.execute(anything())).once()
    const [actualCachePolicy] = capture(
      mockGetEmailMaskDomainsUseCase.execute,
    ).first()
    expect(actualCachePolicy).toEqual(CachePolicy.CacheOnly)
  })

  it('returns expected result', async () => {
    await expect(
      instanceUnderTest.getEmailMaskDomains(CachePolicy.CacheOnly),
    ).resolves.toEqual(['mask.anonyome.com'])
  })

  it('uses RemoteOnly cache policy by default', async () => {
    await instanceUnderTest.getEmailMaskDomains()
    verify(mockGetEmailMaskDomainsUseCase.execute(anything())).once()
    const [actualCachePolicy] = capture(
      mockGetEmailMaskDomainsUseCase.execute,
    ).first()
    expect(actualCachePolicy).toEqual(CachePolicy.RemoteOnly)
  })
})
