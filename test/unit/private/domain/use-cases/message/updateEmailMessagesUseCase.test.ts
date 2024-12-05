/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import _ from 'lodash'
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
import { UpdateEmailMessagesStatus } from '../../../../../../src/gen/graphqlTypes'
import { EmailMessageService } from '../../../../../../src/private/domain/entities/message/emailMessageService'
import { UpdateEmailMessagesUseCase } from '../../../../../../src/private/domain/use-cases/message/updateEmailMessagesUseCase'
import { LimitExceededError } from '../../../../../../src/public/errors'
import { EmailConfigurationDataService } from '../../../../../../src/private/domain/entities/configuration/configurationDataService'
import { EmailConfigurationDataEntity } from '../../../../../../src/private/domain/entities/configuration/emailConfigurationDataEntity'
import { EmailMessageDataFactory } from '../../../../data-factory/emailMessage'

describe('UpdateEmailMessagesUseCase Test Suite', () => {
  const mockEmailMessageService = mock<EmailMessageService>()
  const mockEmailConfigService = mock<EmailConfigurationDataService>()
  const mockUpdateLimit = 100

  let instanceUnderTest: UpdateEmailMessagesUseCase

  beforeEach(() => {
    reset(mockEmailMessageService)
    reset(mockEmailConfigService)
    instanceUnderTest = new UpdateEmailMessagesUseCase(
      instance(mockEmailMessageService),
      instance(mockEmailConfigService),
    )
    when(mockEmailMessageService.updateMessages(anything())).thenResolve({
      status: UpdateEmailMessagesStatus.Success,
    })
    when(mockEmailConfigService.getConfigurationData()).thenResolve({
      updateEmailMessagesLimit: mockUpdateLimit,
    } as EmailConfigurationDataEntity)
  })

  describe('execute', () => {
    it('completes successfully with success result', async () => {
      const id = v4()
      const folderId = v4()
      const result = await instanceUnderTest.execute({
        ids: new Set([id]),
        values: { seen: true, folderId },
      })
      verify(mockEmailMessageService.updateMessages(anything())).once()
      const [actualArgs] = capture(
        mockEmailMessageService.updateMessages,
      ).first()
      expect(actualArgs).toStrictEqual<typeof actualArgs>({
        ids: [id],
        values: { seen: true, folderId },
      })
      expect(result).toStrictEqual({
        status: UpdateEmailMessagesStatus.Success,
      })
    })

    it('returns success status if empty list of email messages ids are passed in', async () => {
      await expect(
        instanceUnderTest.execute({ ids: new Set(), values: {} }),
      ).resolves.toStrictEqual({
        status: UpdateEmailMessagesStatus.Success,
      })
    })

    it('updating more than limit email messages fails', async () => {
      const tooManyIds = EmailMessageDataFactory.generateTestIdSet(
        mockUpdateLimit + 1,
      )
      await expect(
        instanceUnderTest.execute({ ids: tooManyIds, values: {} }),
      ).rejects.toThrow(
        new LimitExceededError(`Input cannot exceed ${mockUpdateLimit}`),
      )
      verify(mockEmailConfigService.getConfigurationData()).once()
    })

    it.each([1, 2, 9, 10])(
      'should only call repo once for any number of ids as long as not greater than 10',
      async (num) => {
        const ids = _.range(num).map(() => v4())
        await instanceUnderTest.execute({
          ids: new Set(ids),
          values: { seen: true },
        })
        verify(mockEmailMessageService.updateMessages(anything())).once()
      },
    )
  })
})
