/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  anything,
  capture,
  instance,
  mock,
  reset,
  verify,
  when,
} from 'ts-mockito'
import { v4 } from 'uuid'
import { EmailAccountService } from '../../../../../../src/private/domain/entities/account/emailAccountService'
import { EmailMessageService } from '../../../../../../src/private/domain/entities/message/emailMessageService'
import { ListDraftEmailMessageMetadataUseCase } from '../../../../../../src/private/domain/use-cases/draft/listDraftEmailMessageMetadataUseCase'
import { EntityDataFactory } from '../../../../data-factory/entity'

describe('ListDraftEmailMessageMetadataUseCase Test Suite', () => {
  const mockEmailAccountService = mock<EmailAccountService>()
  const mockEmailMessageService = mock<EmailMessageService>()
  let instanceUnderTest: ListDraftEmailMessageMetadataUseCase

  const emailAccounts = {
    emailAccounts: [EntityDataFactory.emailAccount],
    nextToken: undefined,
  }
  const metadata = [
    { id: v4(), emailAddressId: v4(), size: 1, updatedAt: new Date() },
    { id: v4(), emailAddressId: v4(), size: 2, updatedAt: new Date() },
  ]

  beforeEach(() => {
    reset(mockEmailAccountService)
    reset(mockEmailMessageService)
    instanceUnderTest = new ListDraftEmailMessageMetadataUseCase(
      instance(mockEmailAccountService),
      instance(mockEmailMessageService),
    )
  })

  it('calls EmailMessageService methods with correct inputs', async () => {
    when(mockEmailAccountService.list(anything())).thenResolve(emailAccounts)
    when(
      mockEmailMessageService.listDraftsMetadataForEmailAddressId(anything()),
    ).thenResolve(metadata)

    const emailAddressId = 'testId'
    await instanceUnderTest.execute()
    verify(mockEmailAccountService.list(anything())).once()
    verify(
      mockEmailMessageService.listDraftsMetadataForEmailAddressId(anything()),
    ).once()
    const [actualResult] = capture(
      mockEmailMessageService.listDraftsMetadataForEmailAddressId,
    ).first()
    expect(actualResult).toStrictEqual({ emailAddressId })
  })

  it('returns results', async () => {
    when(mockEmailAccountService.list(anything())).thenResolve(emailAccounts)
    when(
      mockEmailMessageService.listDraftsMetadataForEmailAddressId(anything()),
    ).thenResolve(metadata)
    await expect(instanceUnderTest.execute()).resolves.toStrictEqual({
      metadata,
    })
  })
})
