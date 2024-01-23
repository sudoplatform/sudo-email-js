/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { CachePolicy } from '@sudoplatform/sudo-common'
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
import { ListEmailMessagesForEmailAddressIdUseCase } from '../../../../../../src/private/domain/use-cases/message/listEmailMessagesForEmailAddressIdUseCase'
import { DateRange } from '../../../../../../src/public/typings/dateRange'
import { SortOrder } from '../../../../../../src/public/typings/sortOrder'
import { EntityDataFactory } from '../../../../data-factory/entity'

describe('ListEmailMessagesForEmailAddressIdUseCase Test Suite', () => {
  const mockEmailMessageService = mock<EmailMessageService>()

  let instanceUnderTest: ListEmailMessagesForEmailAddressIdUseCase

  beforeEach(() => {
    reset(mockEmailMessageService)
    instanceUnderTest = new ListEmailMessagesForEmailAddressIdUseCase(
      instance(mockEmailMessageService),
    )
  })

  describe('execute', () => {
    it('completes successfully', async () => {
      const emailAddressId = v4()
      when(
        mockEmailMessageService.listMessagesForEmailAddressId(anything()),
      ).thenResolve({
        emailMessages: [EntityDataFactory.emailMessage],
      })
      const result = await instanceUnderTest.execute({
        emailAddressId,
        cachePolicy: CachePolicy.CacheOnly,
      })
      verify(
        mockEmailMessageService.listMessagesForEmailAddressId(anything()),
      ).once()
      const [inputArgs] = capture(
        mockEmailMessageService.listMessagesForEmailAddressId,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        emailAddressId,
        cachePolicy: CachePolicy.CacheOnly,
        dateRange: undefined,
        limit: undefined,
        sortOrder: undefined,
        nextToken: undefined,
      })
      expect(result).toStrictEqual({
        emailMessages: [EntityDataFactory.emailMessage],
      })
    })

    it('completes successfully with date range', async () => {
      const emailAddressId = v4()
      const dateRange: DateRange = {
        startDate: new Date(1.0),
        endDate: new Date(2.0),
      }
      when(
        mockEmailMessageService.listMessagesForEmailAddressId(anything()),
      ).thenResolve({
        emailMessages: [EntityDataFactory.emailMessage],
      })
      const result = await instanceUnderTest.execute({
        emailAddressId,
        cachePolicy: CachePolicy.CacheOnly,
        dateRange,
        sortOrder: SortOrder.Desc,
      })
      verify(
        mockEmailMessageService.listMessagesForEmailAddressId(anything()),
      ).once()
      const [inputArgs] = capture(
        mockEmailMessageService.listMessagesForEmailAddressId,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        emailAddressId,
        cachePolicy: CachePolicy.CacheOnly,
        dateRange,
        limit: undefined,
        sortOrder: SortOrder.Desc,
        nextToken: undefined,
      })
      expect(result).toStrictEqual({
        emailMessages: [EntityDataFactory.emailMessage],
      })
    })

    it('completes successfully with empty result items', async () => {
      const emailAddressId = v4()
      when(
        mockEmailMessageService.listMessagesForEmailAddressId(anything()),
      ).thenResolve({
        emailMessages: [],
      })
      const result = await instanceUnderTest.execute({
        emailAddressId,
        cachePolicy: CachePolicy.CacheOnly,
      })
      verify(
        mockEmailMessageService.listMessagesForEmailAddressId(anything()),
      ).once()
      const [inputArgs] = capture(
        mockEmailMessageService.listMessagesForEmailAddressId,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        emailAddressId,
        cachePolicy: CachePolicy.CacheOnly,
        dateRange: undefined,
        limit: undefined,
        sortOrder: undefined,
        nextToken: undefined,
      })
      expect(result).toStrictEqual({
        emailMessages: [],
      })
    })
  })
})
