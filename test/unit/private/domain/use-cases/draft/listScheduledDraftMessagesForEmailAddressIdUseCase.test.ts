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
import { ListScheduledDraftMessagesForEmailAddressIdUseCase } from '../../../../../../src/private/domain/use-cases/draft/listScheduledDraftMessagesForEmailAddressIdUseCase'
import { EntityDataFactory } from '../../../../data-factory/entity'
import {
  AddressNotFoundError,
  ScheduledDraftMessageState,
} from '../../../../../../src'
import { CachePolicy } from '@sudoplatform/sudo-common'

describe('ListScheduledDraftMessagesForEmailAddressIdUseCase Test Suite', () => {
  const mockEmailAccountService = mock<EmailAccountService>()
  const mockEmailMessageService = mock<EmailMessageService>()
  const mockS3Client = mock<S3Client>()
  let instanceUnderTest: ListScheduledDraftMessagesForEmailAddressIdUseCase

  beforeEach(() => {
    reset(mockEmailAccountService)
    reset(mockEmailMessageService)
    reset(mockS3Client)
    instanceUnderTest = new ListScheduledDraftMessagesForEmailAddressIdUseCase(
      instance(mockEmailAccountService),
      instance(mockEmailMessageService),
    )
    when(mockEmailAccountService.get(anything())).thenResolve(
      EntityDataFactory.emailAccount,
    )
    when(
      mockEmailMessageService.listScheduledDraftMessagesForEmailAddressId(
        anything(),
      ),
    ).thenResolve({
      scheduledDraftMessages: [EntityDataFactory.scheduledDraftMessage],
    })
  })

  it('throws AddressNotFoundError if email address does not exist', async () => {
    when(mockEmailAccountService.get(anything())).thenResolve(undefined)

    await expect(
      instanceUnderTest.execute({
        emailAddressId: EntityDataFactory.emailAccount.id,
      }),
    ).rejects.toThrow(AddressNotFoundError)
  })

  it('returns expected response on success', async () => {
    const result = await instanceUnderTest.execute({
      emailAddressId: EntityDataFactory.emailAccount.id,
    })

    expect(result.scheduledDraftMessages).toEqual([
      EntityDataFactory.scheduledDraftMessage,
    ])
    verify(
      mockEmailMessageService.listScheduledDraftMessagesForEmailAddressId(
        anything(),
      ),
    ).once()
    const [listArgs] = capture(
      mockEmailMessageService.listScheduledDraftMessagesForEmailAddressId,
    ).first()
    expect(listArgs).toStrictEqual<typeof listArgs>({
      emailAddressId: EntityDataFactory.emailAccount.id,
      filter: undefined,
      limit: undefined,
      nextToken: undefined,
      cachePolicy: CachePolicy.RemoteOnly,
    })
  })

  it('properly passes in all optional params', async () => {
    const filter = {
      state: {
        notEqual: ScheduledDraftMessageState.CANCELLED,
      },
    }
    const limit = 5
    const nextToken = 'dummyToken'
    const result = await instanceUnderTest.execute({
      emailAddressId: EntityDataFactory.emailAccount.id,
      filter,
      limit,
      nextToken,
    })

    expect(result.scheduledDraftMessages).toEqual([
      EntityDataFactory.scheduledDraftMessage,
    ])
    verify(
      mockEmailMessageService.listScheduledDraftMessagesForEmailAddressId(
        anything(),
      ),
    ).once()
    const [listArgs] = capture(
      mockEmailMessageService.listScheduledDraftMessagesForEmailAddressId,
    ).first()
    expect(listArgs).toStrictEqual<typeof listArgs>({
      emailAddressId: EntityDataFactory.emailAccount.id,
      filter,
      limit,
      nextToken,
      cachePolicy: CachePolicy.RemoteOnly,
    })
  })
})
