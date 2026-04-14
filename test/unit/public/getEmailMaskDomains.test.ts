/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { instance, mock, reset, verify, when } from 'ts-mockito'
import { MockedClass } from 'vitest'
import { SudoEmailClient } from '../../../src'
import { GetEmailMaskDomainsUseCase } from '../../../src/private/domain/use-cases/emailDomain/getEmailMaskDomainsUseCase'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

vi.mock(
  '../../../src/private/domain/use-cases/emailDomain/getEmailMaskDomainsUseCase',
)
const ViMockGetEmailMaskDomainsUseCase =
  GetEmailMaskDomainsUseCase as MockedClass<typeof GetEmailMaskDomainsUseCase>

describe('SudoEmailClient.getEmailMaskDomains Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockGetEmailMaskDomainsUseCase = mock<GetEmailMaskDomainsUseCase>()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockGetEmailMaskDomainsUseCase)

    ViMockGetEmailMaskDomainsUseCase.mockClear()

    ViMockGetEmailMaskDomainsUseCase.mockImplementation(function () {
      return instance(mockGetEmailMaskDomainsUseCase)
    })

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(mockGetEmailMaskDomainsUseCase.execute()).thenResolve([
      { domain: 'mask.anonyome.com' },
    ])
  })

  it('generates use case', async () => {
    await instanceUnderTest.getEmailMaskDomains()
    expect(ViMockGetEmailMaskDomainsUseCase).toHaveBeenCalledTimes(1)
  })

  it('calls use case as expected', async () => {
    await instanceUnderTest.getEmailMaskDomains()
    verify(mockGetEmailMaskDomainsUseCase.execute()).once()
  })

  it('returns expected result', async () => {
    await expect(instanceUnderTest.getEmailMaskDomains()).resolves.toEqual([
      'mask.anonyome.com',
    ])
  })
})
