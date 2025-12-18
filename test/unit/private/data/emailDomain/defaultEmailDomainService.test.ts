/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { instance, mock, reset, verify, when } from 'ts-mockito'
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
    it('returns transformed result when calling $test', async () => {
      when(mockAppSync.getSupportedEmailDomains()).thenResolve(
        GraphQLDataFactory.supportedEmailDomains,
      )
      await expect(
        instanceUnderTest.getSupportedEmailDomains(),
      ).resolves.toStrictEqual([EntityDataFactory.emailDomain])
      verify(mockAppSync.getSupportedEmailDomains()).once()
    })
  })

  describe('getConfiguredEmailDomains', () => {
    it('returns transformed result when calling $test', async () => {
      when(mockAppSync.getConfiguredEmailDomains()).thenResolve(
        GraphQLDataFactory.configuredEmailDomains,
      )
      await expect(
        instanceUnderTest.getConfiguredEmailDomains(),
      ).resolves.toStrictEqual([
        { domain: 'unittest.org' },
        { domain: 'foobar.com' },
      ])
      verify(mockAppSync.getConfiguredEmailDomains()).once()
    })
  })

  describe('getEmailMaskDomains', () => {
    it('returns transformed result', async () => {
      when(mockAppSync.getEmailMaskDomains()).thenResolve({
        domains: ['mask1.anonyome.com', 'mask2.anonyome.com'],
      })
      await expect(
        instanceUnderTest.getEmailMaskDomains(),
      ).resolves.toStrictEqual([
        { domain: 'mask1.anonyome.com' },
        { domain: 'mask2.anonyome.com' },
      ])
      verify(mockAppSync.getEmailMaskDomains()).once()
    })
  })
})
