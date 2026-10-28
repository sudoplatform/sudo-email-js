/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { instance, mock, reset, verify, when } from 'ts-mockito'
import { EntityDataFactory } from '../../../../data-factory/entity'
import { EmailDomainService } from '../../../../../../src/private/domain/entities/emailDomain/emailDomainService'
import { GetEmailAliasDomainsUseCase } from '../../../../../../src/private/domain/use-cases/emailDomain/getEmailAliasDomainsUseCase'

describe('GetEmailAliasDomainsUseCase Test Suite', () => {
  const mockEmailDomainService = mock<EmailDomainService>()

  let instanceUnderTest: GetEmailAliasDomainsUseCase

  const domains = [EntityDataFactory.emailDomain, EntityDataFactory.emailDomain]

  beforeEach(() => {
    reset(mockEmailDomainService)
    instanceUnderTest = new GetEmailAliasDomainsUseCase(
      instance(mockEmailDomainService),
    )
  })

  describe('execute', () => {
    it('completes successfully returning expected single email alias domain', async () => {
      when(mockEmailDomainService.getEmailAliasDomains()).thenResolve([
        domains[0],
      ])
      const result = await instanceUnderTest.execute()
      expect(result).toStrictEqual([domains[0]])
      verify(mockEmailDomainService.getEmailAliasDomains()).once()
    })

    it('completes successfully returning expected multiple email alias domains', async () => {
      when(mockEmailDomainService.getEmailAliasDomains()).thenResolve(domains)
      const result = await instanceUnderTest.execute()
      expect(result).toStrictEqual(domains)
      verify(mockEmailDomainService.getEmailAliasDomains()).once()
    })
  })
})
