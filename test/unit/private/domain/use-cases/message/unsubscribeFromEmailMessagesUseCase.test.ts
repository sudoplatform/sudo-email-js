/*
 * Copyright © 2023 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { anything, capture, instance, mock, reset, verify } from 'ts-mockito'
import { EmailMessageService } from '../../../../../../src/private/domain/entities/message/emailMessageService'
import { UnsubscribeFromEmailMessagesUseCase } from '../../../../../../src/private/domain/use-cases/message/unsubscribeFromEmailMessagesUseCase'

describe('UnsubscribeFromEmailMessagesUseCase Test Suite', () => {
  const mockEmailMessageService = mock<EmailMessageService>()
  let instanceUnderTest: UnsubscribeFromEmailMessagesUseCase

  beforeEach(() => {
    reset(mockEmailMessageService)
    instanceUnderTest = new UnsubscribeFromEmailMessagesUseCase(
      instance(mockEmailMessageService),
    )
  })

  describe('execute', () => {
    const mockSubscriberId = 'subscriber-id'

    it('calls EmailMessageService unsubscribeFromEmailMessages method', () => {
      instanceUnderTest.execute({
        subscriptionId: mockSubscriberId,
      })
      verify(
        mockEmailMessageService.unsubscribeFromEmailMessages(anything()),
      ).once()
      const [args] = capture(
        mockEmailMessageService.unsubscribeFromEmailMessages,
      ).first()
      expect(args).toMatchObject({
        subscriptionId: mockSubscriberId,
      })
    })
  })
})
