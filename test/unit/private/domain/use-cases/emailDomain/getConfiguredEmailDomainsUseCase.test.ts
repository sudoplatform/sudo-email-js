/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { instance, mock, reset, verify, when } from 'ts-mockito'
import { EntityDataFactory } from '../../../../data-factory/entity'
import { EmailDomainService } from '../../../../../../src/private/domain/entities/emailDomain/emailDomainService'
import { GetConfiguredEmailDomainsUseCase } from '../../../../../../src/private/domain/use-cases/emailDomain/getConfiguredEmailDomainsUseCase'

describe('GetSupportedEmailDomainsUseCase Test Suite', () => {
  const mockEmailDomainService = mock<EmailDomainService>()

  let instanceUnderTest: GetConfiguredEmailDomainsUseCase

  const domains = [EntityDataFactory.emailDomain, EntityDataFactory.emailDomain]

  beforeEach(() => {
    reset(mockEmailDomainService)
    instanceUnderTest = new GetConfiguredEmailDomainsUseCase(
      instance(mockEmailDomainService),
    )
  })

  describe('execute', () => {
    it('completes successfully returning expected single configured domain', async () => {
      when(mockEmailDomainService.getConfiguredEmailDomains()).thenResolve([
        domains[0],
      ])
      const result = await instanceUnderTest.execute()
      expect(result).toStrictEqual([domains[0]])
      verify(mockEmailDomainService.getConfiguredEmailDomains()).once()
    })

    it('completes successfully returning expected multiple configured domains', async () => {
      when(mockEmailDomainService.getConfiguredEmailDomains()).thenResolve(
        domains,
      )
      const result = await instanceUnderTest.execute()
      expect(result).toStrictEqual(domains)
      verify(mockEmailDomainService.getConfiguredEmailDomains()).once()
    })
  })
})
