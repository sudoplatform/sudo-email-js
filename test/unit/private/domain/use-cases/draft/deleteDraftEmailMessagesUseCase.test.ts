/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
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
  EmailMessageServiceDeleteDraftsError,
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
    when(mockEmailMessageService.deleteDrafts(anything())).thenResolve([])
  })

  it('returns success if empty list is passed in', async () => {
    await expect(
      instanceUnderTest.execute({ ids: new Set(), emailAddressId: '' }),
    ).resolves.toStrictEqual({
      successIds: [],
      failureMessages: [],
    })
  })

  it('calls EmailMessageService.deleteDraft with input id', async () => {
    const ids = [v4()]
    const emailAddressId = v4()
    await instanceUnderTest.execute({ ids: new Set(ids), emailAddressId })
    verify(mockEmailMessageService.deleteDrafts(anything())).once()
    const [actualArgs] = capture(mockEmailMessageService.deleteDrafts).first()
    expect(actualArgs).toStrictEqual<typeof actualArgs>({ ids, emailAddressId })
  })

  it('throws AddressNotFound for non-existent email address input', async () => {
    when(mockEmailAccountService.get(anything())).thenThrow(
      new AddressNotFoundError(),
    )
    const ids = [v4()]
    const emailAddressId = v4()
    await expect(
      instanceUnderTest.execute({ ids: new Set(ids), emailAddressId }),
    ).rejects.toThrow(new AddressNotFoundError())
    verify(mockEmailAccountService.get(anything())).once()
  })

  it.each([1, 2, 4, 8, 9, 10])(
    'calls repo one time regardless of how many ids there are (%p times)',
    async (num) => {
      const ids = _.range(num).map(() => v4())
      await instanceUnderTest.execute({ ids: new Set(ids), emailAddressId: '' })
      verify(mockEmailMessageService.deleteDrafts(anything())).times(1)
    },
  )

  it('returns values in expected arrays', async () => {
    const ids = ['good-id1', 'bad-id1', 'good-id2', 'bad-id2']
    const emailAddressId = v4()
    when(
      mockEmailMessageService.deleteDrafts(deepEqual({ ids, emailAddressId })),
    ).thenResolve([
      { id: 'bad-id1', reason: 'error' },
      { id: 'bad-id2', reason: 'error' },
    ])
    const result = await instanceUnderTest.execute({
      ids: new Set(ids),
      emailAddressId,
    })
    expect(result.successIds).toHaveLength(2)
    expect(result.failureMessages).toHaveLength(2)

    expect(result.successIds).toContain('good-id1')
    expect(result.successIds).toContain('good-id2')
    expect(result.failureMessages).toEqual([
      { id: 'bad-id1', errorType: 'error' },
      { id: 'bad-id2', errorType: 'error' },
    ])
  })
})
