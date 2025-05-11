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
import { ScheduleSendDraftMessageUseCase } from '../../../../../../src/private/domain/use-cases/draft/scheduleSendDraftMessageUseCase'
import { EntityDataFactory } from '../../../../data-factory/entity'
import { DateTime } from 'luxon'
import {
  AddressNotFoundError,
  InvalidArgumentError,
} from '../../../../../../src'

describe('ScheduleSendDraftMessageUseCase Test Suite', () => {
  const mockEmailAccountService = mock<EmailAccountService>()
  const mockEmailMessageService = mock<EmailMessageService>()
  const mockS3Client = mock<S3Client>()
  let instanceUnderTest: ScheduleSendDraftMessageUseCase
  let sendAt: Date

  beforeEach(() => {
    sendAt = DateTime.now().plus({ day: 1 }).toJSDate()
    reset(mockEmailAccountService)
    reset(mockEmailMessageService)
    reset(mockS3Client)
    instanceUnderTest = new ScheduleSendDraftMessageUseCase(
      instance(mockEmailAccountService),
      instance(mockEmailMessageService),
    )
    when(mockEmailAccountService.get(anything())).thenResolve(
      EntityDataFactory.emailAccount,
    )
    when(
      mockEmailMessageService.scheduleSendDraftMessage(anything()),
    ).thenResolve(EntityDataFactory.scheduledDraftMessage)
  })

  it('throws AddressNotFoundError if email address does not exist', async () => {
    when(mockEmailAccountService.get(anything())).thenResolve(undefined)

    await expect(
      instanceUnderTest.execute({
        id: EntityDataFactory.scheduledDraftMessage.id,
        emailAddressId: EntityDataFactory.emailAccount.id,
        sendAt,
      }),
    ).rejects.toThrow(AddressNotFoundError)
  })

  it('throws InvalidArgumentError if sendAt is not in future', async () => {
    sendAt = DateTime.now().minus({ day: 1 }).toJSDate()

    await expect(
      instanceUnderTest.execute({
        id: EntityDataFactory.scheduledDraftMessage.id,
        emailAddressId: EntityDataFactory.emailAccount.id,
        sendAt,
      }),
    ).rejects.toThrow(InvalidArgumentError)
  })

  it('returns expected response on success', async () => {
    const result = await instanceUnderTest.execute({
      id: EntityDataFactory.scheduledDraftMessage.id,
      emailAddressId: EntityDataFactory.emailAccount.id,
      sendAt,
    })

    expect(result).toEqual(EntityDataFactory.scheduledDraftMessage)
    verify(mockEmailMessageService.scheduleSendDraftMessage(anything())).once()
    const [scheduleArgs] = capture(
      mockEmailMessageService.scheduleSendDraftMessage,
    ).first()
    expect(scheduleArgs).toStrictEqual<typeof scheduleArgs>({
      id: EntityDataFactory.scheduledDraftMessage.id,
      emailAddressId: EntityDataFactory.emailAccount.id,
      sendAt,
    })
  })
})
