/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
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
import { EmailMessageDateRange } from '../../../../../../src/public/typings/emailMessageDateRange'
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
        includeDeletedMessages: undefined,
      })
      expect(result).toStrictEqual({
        emailMessages: [EntityDataFactory.emailMessage],
      })
    })

    it('completes successfully with sortDate date range', async () => {
      const emailAddressId = v4()
      const dateRange: EmailMessageDateRange = {
        sortDate: {
          startDate: new Date(1.0),
          endDate: new Date(2.0),
        },
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
        dateRange,
        cachePolicy: CachePolicy.CacheOnly,
        limit: undefined,
        sortOrder: SortOrder.Desc,
        nextToken: undefined,
        includeDeletedMessages: undefined,
      })
      expect(result).toStrictEqual({
        emailMessages: [EntityDataFactory.emailMessage],
      })
    })

    it('completes successfully with updatedAt date range', async () => {
      const emailAddressId = v4()
      const dateRange: EmailMessageDateRange = {
        updatedAt: {
          startDate: new Date(1.0),
          endDate: new Date(2.0),
        },
      }
      when(
        mockEmailMessageService.listMessagesForEmailAddressId(anything()),
      ).thenResolve({
        emailMessages: [EntityDataFactory.emailMessage],
      })
      const result = await instanceUnderTest.execute({
        emailAddressId,
        dateRange,
        cachePolicy: CachePolicy.CacheOnly,
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
        dateRange,
        cachePolicy: CachePolicy.CacheOnly,
        limit: undefined,
        sortOrder: SortOrder.Desc,
        nextToken: undefined,
        includeDeletedMessages: undefined,
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
        includeDeletedMessages: undefined,
      })
      expect(result).toStrictEqual({
        emailMessages: [],
      })
    })

    it('completes successfully with includeDeletedMessages', async () => {
      const emailAddressId = v4()
      when(
        mockEmailMessageService.listMessagesForEmailAddressId(anything()),
      ).thenResolve({
        emailMessages: [EntityDataFactory.emailMessage],
      })
      const result = await instanceUnderTest.execute({
        emailAddressId,
        cachePolicy: CachePolicy.CacheOnly,
        includeDeletedMessages: true,
      })
      verify(
        mockEmailMessageService.listMessagesForEmailAddressId(anything()),
      ).once()
      const [inputArgs] = capture(
        mockEmailMessageService.listMessagesForEmailAddressId,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        emailAddressId,
        dateRange: undefined,
        cachePolicy: CachePolicy.CacheOnly,
        limit: undefined,
        sortOrder: undefined,
        nextToken: undefined,
        includeDeletedMessages: true,
      })
      expect(result).toStrictEqual({
        emailMessages: [EntityDataFactory.emailMessage],
      })
    })
  })
})
