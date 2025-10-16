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
import { EntityDataFactory } from '../../../../data-factory/entity'
import { EmailDomainService } from '../../../../../../src/private/domain/entities/emailDomain/emailDomainService'
import { GetEmailMaskDomainsUseCase } from '../../../../../../src/private/domain/use-cases/emailDomain/getEmailMaskDomainsUseCase'

describe('GetEmailMaskDomainsUseCase Test Suite', () => {
  const mockEmailDomainService = mock<EmailDomainService>()

  let instanceUnderTest: GetEmailMaskDomainsUseCase

  const domains = [EntityDataFactory.emailDomain, EntityDataFactory.emailDomain]

  beforeEach(() => {
    reset(mockEmailDomainService)
    instanceUnderTest = new GetEmailMaskDomainsUseCase(
      instance(mockEmailDomainService),
    )
  })

  describe('execute', () => {
    it('completes successfully returning expected single email mask domain', async () => {
      when(mockEmailDomainService.getEmailMaskDomains(anything())).thenResolve([
        domains[0],
      ])
      const result = await instanceUnderTest.execute(CachePolicy.CacheOnly)
      expect(result).toStrictEqual([domains[0]])
      const [inputArgs] = capture(
        mockEmailDomainService.getEmailMaskDomains,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        cachePolicy: CachePolicy.CacheOnly,
      })
      verify(mockEmailDomainService.getEmailMaskDomains(anything())).once()
    })

    it('completes successfully returning expected multiple email mask domains', async () => {
      when(mockEmailDomainService.getEmailMaskDomains(anything())).thenResolve(
        domains,
      )
      const result = await instanceUnderTest.execute(CachePolicy.CacheOnly)
      expect(result).toStrictEqual(domains)
      const [inputArgs] = capture(
        mockEmailDomainService.getEmailMaskDomains,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        cachePolicy: CachePolicy.CacheOnly,
      })
      verify(mockEmailDomainService.getEmailMaskDomains(anything())).once()
    })
  })
})
