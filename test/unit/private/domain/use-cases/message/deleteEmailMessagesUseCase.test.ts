/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { anything, instance, mock, reset, verify, when } from 'ts-mockito'
import { EmailMessageService } from '../../../../../../src/private/domain/entities/message/emailMessageService'
import { DeleteEmailMessagesUseCase } from '../../../../../../src/private/domain/use-cases/message/deleteEmailMessagesUseCase'
import {
  InvalidArgumentError,
  LimitExceededError,
} from '../../../../../../src/public/errors'
import { EmailMessageDataFactory } from '../../../../data-factory/emailMessage'
import { EmailConfigurationDataService } from '../../../../../../src/private/domain/entities/configuration/configurationDataService'
import { EmailConfigurationDataEntity } from '../../../../../../src/private/domain/entities/configuration/emailConfigurationDataEntity'
import { EmailMessageBodyCache } from '../../../../../../src/private/domain/entities/message/emailMessageBodyCache'

describe('DeleteEmailMessageUseCase tests', () => {
  const mockEmailMessageService = mock<EmailMessageService>()
  const mockEmailConfigService = mock<EmailConfigurationDataService>()
  const mockCache = mock<EmailMessageBodyCache>()
  const mockDeleteLimit = 100

  let instanceUnderTest: DeleteEmailMessagesUseCase

  beforeEach(() => {
    reset(mockEmailMessageService)
    reset(mockEmailConfigService)
    reset(mockCache)
    when(mockEmailMessageService.deleteMessages(anything())).thenResolve([])
    when(mockEmailConfigService.getConfigurationData()).thenResolve({
      deleteEmailMessagesLimit: mockDeleteLimit,
    } as EmailConfigurationDataEntity)
    when(mockCache.deleteMessage(anything())).thenResolve()
    instanceUnderTest = new DeleteEmailMessagesUseCase(
      instance(mockEmailMessageService),
      instance(mockEmailConfigService),
      instance(mockCache),
    )
  })

  it('deleting single email message succeeds', async () => {
    await expect(
      instanceUnderTest.execute(new Set(['messageToDelete'])),
    ).resolves.toEqual({
      successIds: ['messageToDelete'],
      failureMessages: [],
    })
  })

  it('deleting zero email messages fails', async () => {
    await expect(instanceUnderTest.execute(new Set([]))).rejects.toThrow(
      InvalidArgumentError,
    )
  })

  it('deleting more than limit email messages fails', async () => {
    const tooManyIds = EmailMessageDataFactory.generateTestIdSet(
      mockDeleteLimit + 1,
    )
    await expect(instanceUnderTest.execute(tooManyIds)).rejects.toThrow(
      new LimitExceededError(`Input cannot exceed ${mockDeleteLimit}`),
    )
    verify(mockEmailConfigService.getConfigurationData()).once()
  })

  it('single undeleted id is returned', async () => {
    const idsTodeleteSet = EmailMessageDataFactory.generateTestIdSet(10)
    const idsTodeleteArr: string[] = []
    idsTodeleteSet.forEach((id) => idsTodeleteArr.push(id))
    when(mockEmailMessageService.deleteMessages(anything())).thenResolve([
      idsTodeleteArr[3],
    ])
    const { successIds, failureMessages } =
      await instanceUnderTest.execute(idsTodeleteSet)
    expect(successIds.length).toEqual(idsTodeleteSet.size - 1)
    expect(successIds.includes(idsTodeleteArr[3])).toBeFalsy()
    expect(failureMessages.length).toEqual(1)
    expect(failureMessages).toStrictEqual([
      { id: idsTodeleteArr[3], errorType: 'Failed to delete email message' },
    ])
  })

  it('multiple undeleted ids are returned', async () => {
    const idsTodeleteSet = EmailMessageDataFactory.generateTestIdSet(10)
    const idsTodeleteArr: string[] = []
    idsTodeleteSet.forEach((id) => idsTodeleteArr.push(id))
    when(mockEmailMessageService.deleteMessages(anything())).thenResolve([
      idsTodeleteArr[3],
      idsTodeleteArr[7],
    ])
    const { successIds, failureMessages } =
      await instanceUnderTest.execute(idsTodeleteSet)
    expect(successIds.length).toEqual(idsTodeleteSet.size - 2)
    expect(successIds.includes(idsTodeleteArr[3])).toBeFalsy()
    expect(successIds.includes(idsTodeleteArr[7])).toBeFalsy()
    expect(failureMessages.length).toEqual(2)
    expect(failureMessages).toStrictEqual([
      { id: idsTodeleteArr[3], errorType: 'Failed to delete email message' },
      { id: idsTodeleteArr[7], errorType: 'Failed to delete email message' },
    ])
  })

  describe('cache integration', () => {
    const mockCache = mock<EmailMessageBodyCache>()

    beforeEach(() => {
      reset(mockCache)
      when(mockCache.deleteMessage(anything())).thenResolve()
    })

    it('calls cache.deleteMessage for each successfully deleted message', async () => {
      when(mockEmailMessageService.deleteMessages(anything())).thenResolve([])
      const useCaseWithCache = new DeleteEmailMessagesUseCase(
        instance(mockEmailMessageService),
        instance(mockEmailConfigService),
        instance(mockCache),
      )
      const ids = new Set(['id-1', 'id-2', 'id-3'])
      await useCaseWithCache.execute(ids)

      verify(mockCache.deleteMessage('id-1')).once()
      verify(mockCache.deleteMessage('id-2')).once()
      verify(mockCache.deleteMessage('id-3')).once()
    })

    it('does not block on cache deletion (fire-and-forget)', async () => {
      when(mockEmailMessageService.deleteMessages(anything())).thenResolve([])
      const useCaseWithCache = new DeleteEmailMessagesUseCase(
        instance(mockEmailMessageService),
        instance(mockEmailConfigService),
        instance(mockCache),
      )
      // The method should return without waiting for cache operations to complete
      const result = await useCaseWithCache.execute(new Set(['id-1']))
      expect(result.successIds).toEqual(['id-1'])
      expect(result.failureMessages).toEqual([])
    })
  })
})
