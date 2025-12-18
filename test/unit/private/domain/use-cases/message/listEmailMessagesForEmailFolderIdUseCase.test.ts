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
import { ListEmailMessagesForEmailFolderIdUseCase } from '../../../../../../src/private/domain/use-cases/message/listEmailMessagesForEmailFolderIdUseCase'
import { EmailMessageDateRange } from '../../../../../../src/public/typings/emailMessageDateRange'
import { SortOrder } from '../../../../../../src/public/typings/sortOrder'
import { EntityDataFactory } from '../../../../data-factory/entity'

describe('ListEmailMessagesForEmailFolderIdUseCase Test Suite', () => {
  const mockEmailMessageService = mock<EmailMessageService>()

  let instanceUnderTest: ListEmailMessagesForEmailFolderIdUseCase

  beforeEach(() => {
    reset(mockEmailMessageService)
    instanceUnderTest = new ListEmailMessagesForEmailFolderIdUseCase(
      instance(mockEmailMessageService),
    )
  })

  describe('execute', () => {
    it('completes successfully', async () => {
      const folderId = v4()
      when(
        mockEmailMessageService.listMessagesForEmailFolderId(anything()),
      ).thenResolve({
        emailMessages: [EntityDataFactory.emailMessage],
      })
      const result = await instanceUnderTest.execute({
        folderId,
      })
      verify(
        mockEmailMessageService.listMessagesForEmailFolderId(anything()),
      ).once()
      const [inputArgs] = capture(
        mockEmailMessageService.listMessagesForEmailFolderId,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        folderId,
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
      const folderId = v4()
      const dateRange: EmailMessageDateRange = {
        sortDate: {
          startDate: new Date(1.0),
          endDate: new Date(2.0),
        },
      }
      when(
        mockEmailMessageService.listMessagesForEmailFolderId(anything()),
      ).thenResolve({
        emailMessages: [EntityDataFactory.emailMessage],
      })
      const result = await instanceUnderTest.execute({
        folderId,
        dateRange,
        sortOrder: SortOrder.Desc,
      })
      verify(
        mockEmailMessageService.listMessagesForEmailFolderId(anything()),
      ).once()
      const [inputArgs] = capture(
        mockEmailMessageService.listMessagesForEmailFolderId,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        folderId,
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
      const folderId = v4()
      const dateRange: EmailMessageDateRange = {
        updatedAt: {
          startDate: new Date(1.0),
          endDate: new Date(2.0),
        },
      }
      when(
        mockEmailMessageService.listMessagesForEmailFolderId(anything()),
      ).thenResolve({
        emailMessages: [EntityDataFactory.emailMessage],
      })
      const result = await instanceUnderTest.execute({
        folderId,
        dateRange,
        sortOrder: SortOrder.Desc,
      })
      verify(
        mockEmailMessageService.listMessagesForEmailFolderId(anything()),
      ).once()
      const [inputArgs] = capture(
        mockEmailMessageService.listMessagesForEmailFolderId,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        folderId,
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
      const folderId = v4()
      when(
        mockEmailMessageService.listMessagesForEmailFolderId(anything()),
      ).thenResolve({
        emailMessages: [],
      })
      const result = await instanceUnderTest.execute({
        folderId,
      })
      verify(
        mockEmailMessageService.listMessagesForEmailFolderId(anything()),
      ).once()
      const [inputArgs] = capture(
        mockEmailMessageService.listMessagesForEmailFolderId,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        folderId,
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
      const folderId = v4()
      when(
        mockEmailMessageService.listMessagesForEmailFolderId(anything()),
      ).thenResolve({
        emailMessages: [EntityDataFactory.emailMessage],
      })
      const result = await instanceUnderTest.execute({
        folderId,
        includeDeletedMessages: true,
      })
      verify(
        mockEmailMessageService.listMessagesForEmailFolderId(anything()),
      ).once()
      const [inputArgs] = capture(
        mockEmailMessageService.listMessagesForEmailFolderId,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        folderId,
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
