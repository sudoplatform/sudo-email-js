/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
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

describe('DeleteEmailMessageUseCase tests', () => {
  const mockEmailMessageService = mock<EmailMessageService>()
  const mockEmailConfigService = mock<EmailConfigurationDataService>()
  const mockDeleteLimit = 100

  let instanceUnderTest: DeleteEmailMessagesUseCase

  beforeEach(() => {
    reset(mockEmailMessageService)
    reset(mockEmailConfigService)
    when(mockEmailMessageService.deleteMessages(anything())).thenResolve([])
    when(mockEmailConfigService.getConfigurationData()).thenResolve({
      deleteEmailMessagesLimit: mockDeleteLimit,
    } as EmailConfigurationDataEntity)
    instanceUnderTest = new DeleteEmailMessagesUseCase(
      instance(mockEmailMessageService),
      instance(mockEmailConfigService),
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
})
