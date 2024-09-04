/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { CachePolicy } from '@sudoplatform/sudo-common'
import { anything, instance, mock, reset, verify, when } from 'ts-mockito'
import { ApiClient } from '../../../../../src/private/data/common/apiClient'
import { DefaultEmailDomainService } from '../../../../../src/private/data/emailDomain/defaultEmailDomainService'
import { EntityDataFactory } from '../../../data-factory/entity'
import { GraphQLDataFactory } from '../../../data-factory/graphQL'

describe('DefaultEmailDomainService Test Suite', () => {
  const mockAppSync = mock<ApiClient>()
  let instanceUnderTest: DefaultEmailDomainService

  beforeEach(() => {
    reset(mockAppSync)
    instanceUnderTest = new DefaultEmailDomainService(instance(mockAppSync))
  })

  describe('getSupportedEmailDomains', () => {
    it.each`
      cachePolicy               | test
      ${CachePolicy.CacheOnly}  | ${'cache'}
      ${CachePolicy.RemoteOnly} | ${'remote'}
    `(
      'returns transformed result when calling $test',
      async ({ cachePolicy }) => {
        when(mockAppSync.getSupportedEmailDomains(anything())).thenResolve(
          GraphQLDataFactory.supportedEmailDomains,
        )
        await expect(
          instanceUnderTest.getSupportedEmailDomains({ cachePolicy }),
        ).resolves.toStrictEqual([EntityDataFactory.emailDomain])
        verify(mockAppSync.getSupportedEmailDomains(anything())).once()
      },
    )
  })

  describe('getConfiguredEmailDomains', () => {
    it.each`
      cachePolicy               | test
      ${CachePolicy.CacheOnly}  | ${'cache'}
      ${CachePolicy.RemoteOnly} | ${'remote'}
    `(
      'returns transformed result when calling $test',
      async ({ cachePolicy }) => {
        when(mockAppSync.getConfiguredEmailDomains(anything())).thenResolve(
          GraphQLDataFactory.configuredEmailDomains,
        )
        await expect(
          instanceUnderTest.getConfiguredEmailDomains({ cachePolicy }),
        ).resolves.toStrictEqual([
          { domain: 'unittest.org' },
          { domain: 'foobar.com' },
        ])
        verify(mockAppSync.getConfiguredEmailDomains(anything())).once()
      },
    )
  })
})
