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
import { GetSupportedEmailDomainsUseCase } from '../../../../../../src/private/domain/use-cases/emailDomain/getSupportedEmailDomainsUseCase'
import { EmailDomainService } from '../../../../../../src/private/domain/entities/emailDomain/emailDomainService'

describe('GetSupportedEmailDomainsUseCase Test Suite', () => {
  const mockEmailDomainService = mock<EmailDomainService>()

  let instanceUnderTest: GetSupportedEmailDomainsUseCase

  const domains = [EntityDataFactory.emailDomain, EntityDataFactory.emailDomain]

  beforeEach(() => {
    reset(mockEmailDomainService)
    instanceUnderTest = new GetSupportedEmailDomainsUseCase(
      instance(mockEmailDomainService),
    )
  })

  describe('execute', () => {
    it('completes successfully returning expected single supported domain', async () => {
      when(
        mockEmailDomainService.getSupportedEmailDomains(anything()),
      ).thenResolve([domains[0]])
      const result = await instanceUnderTest.execute(CachePolicy.CacheOnly)
      expect(result).toStrictEqual([domains[0]])
      const [inputArgs] = capture(
        mockEmailDomainService.getSupportedEmailDomains,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        cachePolicy: CachePolicy.CacheOnly,
      })
      verify(mockEmailDomainService.getSupportedEmailDomains(anything())).once()
    })

    it('completes successfully returning expected multiple supported domains', async () => {
      when(
        mockEmailDomainService.getSupportedEmailDomains(anything()),
      ).thenResolve(domains)
      const result = await instanceUnderTest.execute(CachePolicy.CacheOnly)
      expect(result).toStrictEqual(domains)
      const [inputArgs] = capture(
        mockEmailDomainService.getSupportedEmailDomains,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        cachePolicy: CachePolicy.CacheOnly,
      })
      verify(mockEmailDomainService.getSupportedEmailDomains(anything())).once()
    })
  })
})
