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
import { ListDraftEmailMessagesUseCase } from '../../../../../../src/private/domain/use-cases/draft/listDraftEmailMessagesUseCase'
import { stringToArrayBuffer } from '../../../../../../src/private/util/buffer'
import { EntityDataFactory } from '../../../../data-factory/entity'

describe('ListDraftEmailMessagesUseCase Test Suite', () => {
  const mockEmailAccountService = mock<EmailAccountService>()
  const mockEmailMessageService = mock<EmailMessageService>()
  let instanceUnderTest: ListDraftEmailMessagesUseCase

  const emailAccounts = {
    emailAccounts: [EntityDataFactory.emailAccount],
    nextToken: undefined,
  }
  const id = v4()
  const emailAddressId = v4()
  const metadata = [{ id, emailAddressId, size: 1, updatedAt: new Date() }]
  const rfc822Data = stringToArrayBuffer('test')
  const draftMessage = {
    id,
    emailAddressId,
    size: 1,
    updatedAt: new Date(),
    rfc822Data,
  }
  const draftMessages = [
    {
      ...draftMessage,
    },
  ]

  beforeEach(() => {
    reset(mockEmailAccountService)
    reset(mockEmailMessageService)
    instanceUnderTest = new ListDraftEmailMessagesUseCase(
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
    verify(mockEmailMessageService.getDraft(anything())).once()
    const [listResult] = capture(mockEmailAccountService.list).first()
    expect(listResult).toStrictEqual({ nextToken: undefined })
    const [listDraftResult] = capture(
      mockEmailMessageService.listDraftsMetadataForEmailAddressId,
    ).first()
    expect(listDraftResult).toStrictEqual({ emailAddressId })
    const [getResult] = capture(mockEmailMessageService.getDraft).first()
    expect(listDraftResult).toStrictEqual({ emailAddressId })
    expect(getResult).toStrictEqual({ emailAddressId, id })
  })

  it('returns results', async () => {
    when(mockEmailAccountService.list(anything())).thenResolve(emailAccounts)
    when(
      mockEmailMessageService.listDraftsMetadataForEmailAddressId(anything()),
    ).thenResolve(metadata)
    when(mockEmailMessageService.getDraft(anything())).thenResolve(draftMessage)

    await expect(instanceUnderTest.execute()).resolves.toStrictEqual({
      draftMessages: draftMessages,
    })
  })
})
