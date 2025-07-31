/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { anything, capture, instance, mock, reset, when } from 'ts-mockito'
import { SudoEmailClient } from '../../../src'
import { ListScheduledDraftMessagesForEmailAddressIdUseCase } from '../../../src/private/domain/use-cases/draft/listScheduledDraftMessagesForEmailAddressIdUseCase'
import { EntityDataFactory } from '../data-factory/entity'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

jest.mock(
  '../../../src/private/domain/use-cases/draft/listScheduledDraftMessagesForEmailAddressIdUseCase',
)
const JestMockListScheduledDraftMessagesForEmailAddressIdUseCase =
  ListScheduledDraftMessagesForEmailAddressIdUseCase as jest.MockedClass<
    typeof ListScheduledDraftMessagesForEmailAddressIdUseCase
  >

describe('SudoEmailClient.listScheduledDraftMessagesForEmailAddressId Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mocklistScheduledDraftMessagesForEmailAddressIdUseCase =
    mock<ListScheduledDraftMessagesForEmailAddressIdUseCase>()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mocklistScheduledDraftMessagesForEmailAddressIdUseCase)
    JestMockListScheduledDraftMessagesForEmailAddressIdUseCase.mockClear()

    JestMockListScheduledDraftMessagesForEmailAddressIdUseCase.mockImplementation(
      () => instance(mocklistScheduledDraftMessagesForEmailAddressIdUseCase),
    )

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(
      mocklistScheduledDraftMessagesForEmailAddressIdUseCase.execute(
        anything(),
      ),
    ).thenResolve({
      scheduledDraftMessages: [EntityDataFactory.scheduledDraftMessage],
    })
  })

  it('generates use case', async () => {
    await instanceUnderTest.listScheduledDraftMessagesForEmailAddressId({
      emailAddressId: EntityDataFactory.emailAccount.id,
    })
    expect(
      ListScheduledDraftMessagesForEmailAddressIdUseCase,
    ).toHaveBeenCalledTimes(1)
  })

  it('returns expected output on success', async () => {
    const result =
      await instanceUnderTest.listScheduledDraftMessagesForEmailAddressId({
        emailAddressId: EntityDataFactory.emailAccount.id,
      })

    expect(result.items).toEqual([EntityDataFactory.scheduledDraftMessage])
    expect(result.nextToken).toBeFalsy()

    const [useCaseArgs] = capture(
      mocklistScheduledDraftMessagesForEmailAddressIdUseCase.execute,
    ).first()
    expect(useCaseArgs).toStrictEqual<typeof useCaseArgs>({
      emailAddressId: EntityDataFactory.emailAccount.id,
      filter: undefined,
      limit: undefined,
      nextToken: undefined,
      cachePolicy: undefined,
    })
  })
})
