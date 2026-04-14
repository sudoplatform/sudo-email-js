/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { instance, mock, reset, verify, when } from 'ts-mockito'
import { MockedClass } from 'vitest'
import { SudoEmailClient } from '../../../src'
import { ListEmailDomainsUseCase } from '../../../src/private/domain/use-cases/emailDomain/listEmailDomainsUseCase'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

vi.mock(
  '../../../src/private/domain/use-cases/emailDomain/listEmailDomainsUseCase',
)
const ViMockListEmailDomainsUseCase = ListEmailDomainsUseCase as MockedClass<
  typeof ListEmailDomainsUseCase
>

describe('SudoEmailClient.listEmailDomains Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockListEmailDomainsUseCase = mock<ListEmailDomainsUseCase>()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockListEmailDomainsUseCase)

    ViMockListEmailDomainsUseCase.mockClear()

    ViMockListEmailDomainsUseCase.mockImplementation(function () {
      return instance(mockListEmailDomainsUseCase)
    })

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(mockListEmailDomainsUseCase.execute()).thenResolve([
      {
        domain: 'unittest.org',
        isMaskDomain: false,
        metadata: JSON.stringify({ provider: 'internal' }),
      },
    ])
  })

  it('generates use case', async () => {
    await instanceUnderTest.listEmailDomains()
    expect(ViMockListEmailDomainsUseCase).toHaveBeenCalledTimes(1)
  })

  it('calls use case as expected', async () => {
    await instanceUnderTest.listEmailDomains()
    verify(mockListEmailDomainsUseCase.execute()).once()
  })

  it('returns expected result', async () => {
    await expect(instanceUnderTest.listEmailDomains()).resolves.toEqual([
      {
        domain: 'unittest.org',
        isMaskDomain: false,
        metadata: { provider: 'internal' },
      },
    ])
  })
})
