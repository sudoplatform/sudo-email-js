/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
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
      when(
        mockEmailDomainService.getConfiguredEmailDomains(anything()),
      ).thenResolve([domains[0]])
      const result = await instanceUnderTest.execute(CachePolicy.CacheOnly)
      expect(result).toStrictEqual([domains[0]])
      const [inputArgs] = capture(
        mockEmailDomainService.getConfiguredEmailDomains,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        cachePolicy: CachePolicy.CacheOnly,
      })
      verify(
        mockEmailDomainService.getConfiguredEmailDomains(anything()),
      ).once()
    })

    it('completes successfully returning expected multiple configured domains', async () => {
      when(
        mockEmailDomainService.getConfiguredEmailDomains(anything()),
      ).thenResolve(domains)
      const result = await instanceUnderTest.execute(CachePolicy.CacheOnly)
      expect(result).toStrictEqual(domains)
      const [inputArgs] = capture(
        mockEmailDomainService.getConfiguredEmailDomains,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        cachePolicy: CachePolicy.CacheOnly,
      })
      verify(
        mockEmailDomainService.getConfiguredEmailDomains(anything()),
      ).once()
    })
  })
})
