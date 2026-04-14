/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { instance, mock, reset, verify, when } from 'ts-mockito'
import { EntityDataFactory } from '../../../../data-factory/entity'
import { EmailDomainService } from '../../../../../../src/private/domain/entities/emailDomain/emailDomainService'
import { ListEmailDomainsUseCase } from '../../../../../../src/private/domain/use-cases/emailDomain/listEmailDomainsUseCase'

describe('ListEmailDomainsUseCase Test Suite', () => {
  const mockEmailDomainService = mock<EmailDomainService>()
  let instanceUnderTest: ListEmailDomainsUseCase

  beforeEach(() => {
    reset(mockEmailDomainService)
    instanceUnderTest = new ListEmailDomainsUseCase(
      instance(mockEmailDomainService),
    )
  })

  it('calls service as expected', async () => {
    when(mockEmailDomainService.listEmailDomains()).thenResolve([
      EntityDataFactory.emailDomainWithMetadata,
    ])

    await instanceUnderTest.execute()

    verify(mockEmailDomainService.listEmailDomains()).once()
  })

  it('returns expected result', async () => {
    const domains = [EntityDataFactory.emailDomainWithMetadata]
    when(mockEmailDomainService.listEmailDomains()).thenResolve(domains)

    await expect(instanceUnderTest.execute()).resolves.toStrictEqual(domains)
    verify(mockEmailDomainService.listEmailDomains()).once()
  })
})
