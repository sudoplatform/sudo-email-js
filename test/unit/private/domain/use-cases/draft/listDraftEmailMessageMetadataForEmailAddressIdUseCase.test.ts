/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
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
    const result = {
      items: [],
      nextToken: undefined,
      emailAddressId,
    }
    when(
      mockEmailMessageService.listDraftsMetadataForEmailAddressId(anything()),
    ).thenResolve(result)
    await instanceUnderTest.execute({ emailAddressId })
    verify(
      mockEmailMessageService.listDraftsMetadataForEmailAddressId(anything()),
    ).once()
    const [actualResult] = capture(
      mockEmailMessageService.listDraftsMetadataForEmailAddressId,
    ).first()
    expect(actualResult).toStrictEqual({
      emailAddressId,
      limit: undefined,
      nextToken: undefined,
    })
  })

  it('passes limit and nextToken parameters to service', async () => {
    const emailAddressId = v4()
    const limit = 20
    const nextToken = 'token123'
    const result = {
      items: [],
      nextToken: 'nextToken456',
      emailAddressId,
    }
    when(
      mockEmailMessageService.listDraftsMetadataForEmailAddressId(anything()),
    ).thenResolve(result)

    const output = await instanceUnderTest.execute({
      emailAddressId,
      limit,
      nextToken,
    })

    verify(
      mockEmailMessageService.listDraftsMetadataForEmailAddressId(anything()),
    ).once()
    const [actualResult] = capture(
      mockEmailMessageService.listDraftsMetadataForEmailAddressId,
    ).first()
    expect(actualResult).toStrictEqual({ emailAddressId, limit, nextToken })
    expect(output.nextToken).toEqual('nextToken456')
  })

  it('returns results', async () => {
    const drafts = [
      { id: v4(), emailAddressId: v4(), size: 1, updatedAt: new Date() },
      { id: v4(), emailAddressId: v4(), size: 2, updatedAt: new Date() },
    ]
    const result = {
      items: drafts,
      nextToken: undefined,
      emailAddressId: v4(),
    }
    when(
      mockEmailMessageService.listDraftsMetadataForEmailAddressId(anything()),
    ).thenResolve(result)
    await expect(
      instanceUnderTest.execute({ emailAddressId: v4() }),
    ).resolves.toStrictEqual({
      metadata: drafts,
      nextToken: undefined,
    })
  })
})
