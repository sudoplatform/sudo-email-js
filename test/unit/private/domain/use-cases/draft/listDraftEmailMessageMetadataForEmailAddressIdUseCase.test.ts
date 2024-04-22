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
import { EmailMessageService } from '../../../../../../src/private/domain/entities/message/emailMessageService'
import { ListDraftEmailMessageMetadataForEmailAddressIdUseCase } from '../../../../../../src/private/domain/use-cases/draft/listDraftEmailMessageMetadataForEmailAddressIdUseCase'

describe('ListDraftEmailMessageMetadataForEmailAddressIdUseCase Test Suite', () => {
  const mockEmailMessageService = mock<EmailMessageService>()
  let instanceUnderTest: ListDraftEmailMessageMetadataForEmailAddressIdUseCase

  beforeEach(() => {
    reset(mockEmailMessageService)
    instanceUnderTest =
      new ListDraftEmailMessageMetadataForEmailAddressIdUseCase(
        instance(mockEmailMessageService),
      )
  })

  it('calls EmailMessageService.listDraftsMetadataForEmailAddressId with input id', async () => {
    const emailAddressId = v4()
    await instanceUnderTest.execute({ emailAddressId })
    verify(
      mockEmailMessageService.listDraftsMetadataForEmailAddressId(anything()),
    ).once()
    const [actualResult] = capture(
      mockEmailMessageService.listDraftsMetadataForEmailAddressId,
    ).first()
    expect(actualResult).toStrictEqual({ emailAddressId })
  })

  it('returns results', async () => {
    const result = [
      { id: v4(), size: 1, updatedAt: new Date() },
      { id: v4(), size: 2, updatedAt: new Date() },
    ]
    when(
      mockEmailMessageService.listDraftsMetadataForEmailAddressId(anything()),
    ).thenResolve(result)
    await expect(
      instanceUnderTest.execute({ emailAddressId: v4() }),
    ).resolves.toStrictEqual({ metadata: result })
  })
})
