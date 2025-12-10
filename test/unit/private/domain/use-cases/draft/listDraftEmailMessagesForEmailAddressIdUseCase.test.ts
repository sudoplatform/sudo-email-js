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
    const id1 = v4()
    const id2 = v4()
    const emailAddressId = v4()
    const drafts = [
      { id: id1, emailAddressId, size: 1, updatedAt: new Date() },
      { id: id2, emailAddressId, size: 2, updatedAt: new Date() },
    ]
    const result = {
      items: drafts,
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
    const [listResult] = capture(
      mockEmailMessageService.listDraftsMetadataForEmailAddressId,
    ).first()
    verify(mockEmailMessageService.getDraft(anything())).twice()
    const [getDraft1] = capture(mockEmailMessageService.getDraft).first()
    const [getDraft2] = capture(mockEmailMessageService.getDraft).second()

    expect(listResult).toStrictEqual({ emailAddressId })
    expect(getDraft1).toStrictEqual({ id: id1, emailAddressId })
    expect(getDraft2).toStrictEqual({ id: id2, emailAddressId })
  })

  it('returns results', async () => {
    const id = v4()
    const emailAddressId = v4()
    const rfc822Data = stringToArrayBuffer(v4())
    const listResult = {
      items: [{ id, emailAddressId, size: 1, updatedAt: new Date() }],
      nextToken: undefined,
      emailAddressId,
    }
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
