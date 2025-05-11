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
import { EmailAccountService } from '../../../../../../src/private/domain/entities/account/emailAccountService'
import { EmailMessageService } from '../../../../../../src/private/domain/entities/message/emailMessageService'
import { S3Client } from '@aws-sdk/client-s3'
import { CancelScheduledDraftMessageUseCase } from '../../../../../../src/private/domain/use-cases/draft/cancelScheduledDraftMessageUseCase'
import { EntityDataFactory } from '../../../../data-factory/entity'
import { AddressNotFoundError } from '../../../../../../src'

describe('CancelScheduledDraftMessageUseCase Test Suite', () => {
  const mockEmailAccountService = mock<EmailAccountService>()
  const mockEmailMessageService = mock<EmailMessageService>()
  const mockS3Client = mock<S3Client>()
  let instanceUnderTest: CancelScheduledDraftMessageUseCase

  beforeEach(() => {
    reset(mockEmailAccountService)
    reset(mockEmailMessageService)
    reset(mockS3Client)
    instanceUnderTest = new CancelScheduledDraftMessageUseCase(
      instance(mockEmailAccountService),
      instance(mockEmailMessageService),
    )
    when(mockEmailAccountService.get(anything())).thenResolve(
      EntityDataFactory.emailAccount,
    )
    when(
      mockEmailMessageService.cancelScheduledDraftMessage(anything()),
    ).thenResolve(EntityDataFactory.scheduledDraftMessage.id)
  })

  it('throws AddressNotFoundError if email address does not exist', async () => {
    when(mockEmailAccountService.get(anything())).thenResolve(undefined)

    await expect(
      instanceUnderTest.execute({
        id: EntityDataFactory.scheduledDraftMessage.id,
        emailAddressId: EntityDataFactory.emailAccount.id,
      }),
    ).rejects.toThrow(AddressNotFoundError)
  })

  it('returns expected response on success', async () => {
    const result = await instanceUnderTest.execute({
      id: EntityDataFactory.scheduledDraftMessage.id,
      emailAddressId: EntityDataFactory.emailAccount.id,
    })

    expect(result).toEqual(EntityDataFactory.scheduledDraftMessage.id)
    verify(
      mockEmailMessageService.cancelScheduledDraftMessage(anything()),
    ).once()
    const [cancelArgs] = capture(
      mockEmailMessageService.cancelScheduledDraftMessage,
    ).first()
    expect(cancelArgs).toStrictEqual<typeof cancelArgs>({
      id: EntityDataFactory.scheduledDraftMessage.id,
      emailAddressId: EntityDataFactory.emailAccount.id,
    })
  })
})
