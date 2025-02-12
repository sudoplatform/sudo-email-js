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
import { ListDraftEmailMessagesForEmailAddressIdUseCase } from '../../../../../../src/private/domain/use-cases/draft/listDraftEmailMessagesForEmailAddressIdUseCase'
import { stringToArrayBuffer } from '../../../../../../src/private/util/buffer'

describe('ListDraftEmailMessagesForEmailAddressIdUseCase Test Suite', () => {
  const mockEmailMessageService = mock<EmailMessageService>()
  let instanceUnderTest: ListDraftEmailMessagesForEmailAddressIdUseCase

  beforeEach(() => {
    reset(mockEmailMessageService)
    instanceUnderTest = new ListDraftEmailMessagesForEmailAddressIdUseCase(
      instance(mockEmailMessageService),
    )
  })

  it('calls EmailMessageService methods with correct inputs', async () => {
    const result = [
      { id: v4(), emailAddressId: v4(), size: 1, updatedAt: new Date() },
      { id: v4(), emailAddressId: v4(), size: 2, updatedAt: new Date() },
    ]
    when(
      mockEmailMessageService.listDraftsMetadataForEmailAddressId(anything()),
    ).thenResolve(result)

    const emailAddressId = v4()
    await instanceUnderTest.execute({ emailAddressId })
    verify(
      mockEmailMessageService.listDraftsMetadataForEmailAddressId(anything()),
    ).once()
    const [listResult] = capture(
      mockEmailMessageService.listDraftsMetadataForEmailAddressId,
    ).first()
    verify(mockEmailMessageService.getDraft(anything())).twice()
    const [getResult] = capture(
      mockEmailMessageService.listDraftsMetadataForEmailAddressId,
    ).first()
    expect(listResult).toStrictEqual({ emailAddressId })
    expect(getResult).toStrictEqual({ emailAddressId })
  })

  it('returns results', async () => {
    const id = v4()
    const emailAddressId = v4()
    const rfc822Data = stringToArrayBuffer(v4())
    const listResult = [{ id, emailAddressId, size: 1, updatedAt: new Date() }]
    const getResult = {
      id,
      emailAddressId,
      size: 1,
      updatedAt: new Date(),
      rfc822Data,
    }
    const result = [
      { id, emailAddressId, size: 1, updatedAt: new Date(), rfc822Data },
    ]
    when(
      mockEmailMessageService.listDraftsMetadataForEmailAddressId(anything()),
    ).thenResolve(listResult)
    when(mockEmailMessageService.getDraft(anything())).thenResolve(getResult)
    await expect(
      instanceUnderTest.execute({ emailAddressId }),
    ).resolves.toStrictEqual({ draftMessages: result })
  })
})
