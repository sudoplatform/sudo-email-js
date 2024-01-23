/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import _ from 'lodash'
import {
  anything,
  capture,
  deepEqual,
  instance,
  mock,
  reset,
  verify,
  when,
} from 'ts-mockito'
import { v4 } from 'uuid'
import { EmailAccountService } from '../../../../../../src/private/domain/entities/account/emailAccountService'
import {
  EmailMessageService,
  EmailMessageServiceDeleteDraftError,
} from '../../../../../../src/private/domain/entities/message/emailMessageService'
import { DeleteDraftEmailMessagesUseCase } from '../../../../../../src/private/domain/use-cases/draft/deleteDraftEmailMessagesUseCase'
import {
  AddressNotFoundError,
  LimitExceededError,
} from '../../../../../../src/public/errors'
import { EntityDataFactory } from '../../../../data-factory/entity'

describe('DeleteDraftEmailMessagesUseCase Test Suite', () => {
  const mockEmailAccountService = mock<EmailAccountService>()
  const mockEmailMessageService = mock<EmailMessageService>()
  let instanceUnderTest: DeleteDraftEmailMessagesUseCase

  beforeEach(() => {
    reset(mockEmailAccountService)
    reset(mockEmailMessageService)
    instanceUnderTest = new DeleteDraftEmailMessagesUseCase(
      instance(mockEmailAccountService),
      instance(mockEmailMessageService),
    )
    when(mockEmailAccountService.get(anything())).thenResolve(
      EntityDataFactory.emailAccount,
    )
    when(mockEmailMessageService.deleteDraft(anything())).thenResolve('id')
  })

  it('returns success if empty list is passed in', async () => {
    await expect(
      instanceUnderTest.execute({ ids: new Set(), emailAddressId: '' }),
    ).resolves.toStrictEqual({
      successIds: [],
      failureIds: [],
    })
  })

  it('calls EmailMessageService.deleteDraft with input id', async () => {
    const id = v4()
    const emailAddressId = v4()
    await instanceUnderTest.execute({ ids: new Set([id]), emailAddressId })
    verify(mockEmailMessageService.deleteDraft(anything())).once()
    const [actualArgs] = capture(mockEmailMessageService.deleteDraft).first()
    expect(actualArgs).toStrictEqual<typeof actualArgs>({ id, emailAddressId })
  })

  it('throws AddressNotFound for non-existent email address input', async () => {
    when(mockEmailAccountService.get(anything())).thenThrow(
      new AddressNotFoundError(),
    )
    const id = v4()
    const emailAddressId = v4()
    await expect(
      instanceUnderTest.execute({ ids: new Set([id]), emailAddressId }),
    ).rejects.toThrow(new AddressNotFoundError())
    verify(mockEmailAccountService.get(anything())).once()
  })

  it.each([11, 12, 15, 20, 100, 1000])(
    'throws LimitExceeded for over 10 (num=%p)',
    async (num) => {
      const ids = _.range(num).map(() => v4())
      await expect(
        instanceUnderTest.execute({ ids: new Set(ids), emailAddressId: '' }),
      ).rejects.toThrow(new LimitExceededError(`Input cannot exceed ${10}`))
    },
  )

  it.each([1, 2, 4, 8, 9, 10])(
    'calls repo as many times as there are ids (%p times) as long as not greater than 10',
    async (num) => {
      const ids = _.range(num).map(() => v4())
      await instanceUnderTest.execute({ ids: new Set(ids), emailAddressId: '' })
      verify(mockEmailMessageService.deleteDraft(anything())).times(num)
    },
  )

  it('returns values in expected arrays', async () => {
    const ids = ['good-id1', 'bad-id1', 'good-id2', 'bad-id2']
    const emailAddressId = v4()
    when(
      mockEmailMessageService.deleteDraft(
        deepEqual({ id: 'good-id1', emailAddressId }),
      ),
    ).thenResolve('good-id1')
    when(
      mockEmailMessageService.deleteDraft(
        deepEqual({ id: 'bad-id1', emailAddressId }),
      ),
    ).thenReject(new EmailMessageServiceDeleteDraftError('bad-id1'))
    when(
      mockEmailMessageService.deleteDraft(
        deepEqual({ id: 'good-id2', emailAddressId }),
      ),
    ).thenResolve('good-id2')
    when(
      mockEmailMessageService.deleteDraft(
        deepEqual({ id: 'bad-id2', emailAddressId }),
      ),
    ).thenReject(new EmailMessageServiceDeleteDraftError('bad-id2'))
    const result = await instanceUnderTest.execute({
      ids: new Set(ids),
      emailAddressId,
    })
    expect(result.successIds).toHaveLength(2)
    expect(result.failureIds).toHaveLength(2)

    expect(result.successIds).toContain('good-id1')
    expect(result.successIds).toContain('good-id2')
    expect(result.failureIds).toContain('bad-id1')
    expect(result.failureIds).toContain('bad-id2')
  })
})
