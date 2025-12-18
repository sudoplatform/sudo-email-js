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
import { EmailMessageService } from '../../../../../../src/private/domain/entities/message/emailMessageService'
import { ListEmailMessagesUseCase } from '../../../../../../src/private/domain/use-cases/message/listEmailMessagesUseCase'
import { EmailMessageDateRange } from '../../../../../../src/public/typings/emailMessageDateRange'
import { SortOrder } from '../../../../../../src/public/typings/sortOrder'
import { EntityDataFactory } from '../../../../data-factory/entity'

describe('ListEmailMessagesUseCase Test Suite', () => {
  const mockEmailMessageService = mock<EmailMessageService>()

  let instanceUnderTest: ListEmailMessagesUseCase

  beforeEach(() => {
    reset(mockEmailMessageService)
    instanceUnderTest = new ListEmailMessagesUseCase(
      instance(mockEmailMessageService),
    )
  })

  describe('execute', () => {
    it('completes successfully', async () => {
      when(mockEmailMessageService.listMessages(anything())).thenResolve({
        emailMessages: [EntityDataFactory.emailMessage],
      })
      const result = await instanceUnderTest.execute({})
      verify(mockEmailMessageService.listMessages(anything())).once()
      const [inputArgs] = capture(mockEmailMessageService.listMessages).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
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
      const dateRange: EmailMessageDateRange = {
        sortDate: {
          startDate: new Date(1.0),
          endDate: new Date(2.0),
        },
      }
      when(mockEmailMessageService.listMessages(anything())).thenResolve({
        emailMessages: [EntityDataFactory.emailMessage],
      })
      const result = await instanceUnderTest.execute({
        dateRange,
        sortOrder: SortOrder.Desc,
      })
      verify(mockEmailMessageService.listMessages(anything())).once()
      const [inputArgs] = capture(mockEmailMessageService.listMessages).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        dateRange,
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
      const dateRange: EmailMessageDateRange = {
        updatedAt: {
          startDate: new Date(1.0),
          endDate: new Date(2.0),
        },
      }
      when(mockEmailMessageService.listMessages(anything())).thenResolve({
        emailMessages: [EntityDataFactory.emailMessage],
      })
      const result = await instanceUnderTest.execute({
        dateRange,
        sortOrder: SortOrder.Desc,
      })
      verify(mockEmailMessageService.listMessages(anything())).once()
      const [inputArgs] = capture(mockEmailMessageService.listMessages).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        dateRange,
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
      when(mockEmailMessageService.listMessages(anything())).thenResolve({
        emailMessages: [],
      })
      const result = await instanceUnderTest.execute({})
      verify(mockEmailMessageService.listMessages(anything())).once()
      const [inputArgs] = capture(mockEmailMessageService.listMessages).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
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
      when(mockEmailMessageService.listMessages(anything())).thenResolve({
        emailMessages: [EntityDataFactory.emailMessage],
      })
      const result = await instanceUnderTest.execute({
        includeDeletedMessages: true,
      })
      verify(mockEmailMessageService.listMessages(anything())).once()
      const [inputArgs] = capture(mockEmailMessageService.listMessages).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        dateRange: undefined,
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
