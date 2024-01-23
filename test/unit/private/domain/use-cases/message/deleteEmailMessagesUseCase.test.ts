/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { anything, instance, mock, reset, when } from 'ts-mockito'
import { EmailMessageService } from '../../../../../../src/private/domain/entities/message/emailMessageService'
import { DeleteEmailMessagesUseCase } from '../../../../../../src/private/domain/use-cases/message/deleteEmailMessagesUseCase'
import {
  InvalidArgumentError,
  LimitExceededError,
} from '../../../../../../src/public/errors'
import { EmailMessageDataFactory } from '../../../../data-factory/emailMessage'

describe('DeleteEmailMessageUseCase tests', () => {
  const mockEmailMessageService = mock<EmailMessageService>()

  let instanceUnderTest: DeleteEmailMessagesUseCase

  beforeEach(() => {
    reset(mockEmailMessageService)
    when(mockEmailMessageService.deleteMessages(anything())).thenResolve([])
    instanceUnderTest = new DeleteEmailMessagesUseCase(
      instance(mockEmailMessageService),
    )
  })

  it('deleting single email message succeeds', async () => {
    await expect(
      instanceUnderTest.execute(new Set(['messageToDelete'])),
    ).resolves.toEqual({ successIds: ['messageToDelete'], failureIds: [] })
  })

  it('deleting zero email messages fails', async () => {
    await expect(instanceUnderTest.execute(new Set([]))).rejects.toThrow(
      InvalidArgumentError,
    )
  })

  it('deleting more than limit email messages fails', async () => {
    const tooManyIds = EmailMessageDataFactory.generateTestIdSet(101)
    await expect(instanceUnderTest.execute(tooManyIds)).rejects.toThrow(
      new LimitExceededError('Input cannot exceed 100'),
    )
  })

  it('single undeleted id is returned', async () => {
    const idsTodeleteSet = EmailMessageDataFactory.generateTestIdSet(10)
    const idsTodeleteArr: string[] = []
    idsTodeleteSet.forEach((id) => idsTodeleteArr.push(id))
    when(mockEmailMessageService.deleteMessages(anything())).thenResolve([
      idsTodeleteArr[3],
    ])
    const { successIds, failureIds } = await instanceUnderTest.execute(
      idsTodeleteSet,
    )
    expect(successIds.length).toEqual(idsTodeleteSet.size - 1)
    expect(successIds.includes(idsTodeleteArr[3])).toBeFalsy()
    expect(failureIds.length).toEqual(1)
    expect(failureIds).toStrictEqual([idsTodeleteArr[3]])
  })

  it('multiple undeleted ids are returned', async () => {
    const idsTodeleteSet = EmailMessageDataFactory.generateTestIdSet(10)
    const idsTodeleteArr: string[] = []
    idsTodeleteSet.forEach((id) => idsTodeleteArr.push(id))
    when(mockEmailMessageService.deleteMessages(anything())).thenResolve([
      idsTodeleteArr[3],
      idsTodeleteArr[7],
    ])
    const { successIds, failureIds } = await instanceUnderTest.execute(
      idsTodeleteSet,
    )
    expect(successIds.length).toEqual(idsTodeleteSet.size - 2)
    expect(successIds.includes(idsTodeleteArr[3])).toBeFalsy()
    expect(successIds.includes(idsTodeleteArr[7])).toBeFalsy()
    expect(failureIds.length).toEqual(2)
    expect(failureIds).toStrictEqual([idsTodeleteArr[3], idsTodeleteArr[7]])
  })
})
