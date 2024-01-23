/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { NotSignedInError } from '@sudoplatform/sudo-common'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import {
  anything,
  capture,
  instance,
  mock,
  reset,
  verify,
  when,
} from 'ts-mockito'
import { ConnectionState, EmailMessage } from '../../../../../../src'
import { EmailMessageService } from '../../../../../../src/private/domain/entities/message/emailMessageService'
import { SubscribeToEmailMessagesUseCase } from '../../../../../../src/private/domain/use-cases/message/subscribeToEmailMessagesUseCase'

describe('SubscribeToEmailMessagesUseCase Test Suite', () => {
  const mockEmailMessageService = mock<EmailMessageService>()
  const mockUserClient = mock<SudoUserClient>()

  let instanceUnderTest: SubscribeToEmailMessagesUseCase

  beforeEach(() => {
    reset(mockEmailMessageService)
    reset(mockUserClient)
    instanceUnderTest = new SubscribeToEmailMessagesUseCase(
      instance(mockEmailMessageService),
      instance(mockUserClient),
    )
    when(mockUserClient.getSubject()).thenResolve('owner-id')
  })

  describe('execute', () => {
    const mockOwnerId = 'owner-id'
    const mockSubscriberId = 'subscriber-id'

    it('throws NotSignedInError if user is not signed in', async () => {
      when(mockUserClient.getSubject()).thenResolve(undefined)
      await expect(
        instanceUnderTest.execute({
          subscriptionId: mockSubscriberId,
          subscriber: {
            emailMessageDeleted(emailMessage: EmailMessage): void {},
            emailMessageCreated(emailMessage: EmailMessage): void {},
          },
        }),
      ).rejects.toThrow(NotSignedInError)
    })

    it('calls emailMessageService subscribeToEmailMessages method', async () => {
      await instanceUnderTest.execute({
        subscriptionId: mockSubscriberId,
        subscriber: {
          emailMessageDeleted(emailMessage: EmailMessage): void {},
          connectionStatusChanged(state: ConnectionState): void {
            return
          },
          emailMessageCreated(emailMessage: EmailMessage): void {},
        },
      })
      verify(
        mockEmailMessageService.subscribeToEmailMessages(anything()),
      ).once()
      const [args] = capture(
        mockEmailMessageService.subscribeToEmailMessages,
      ).first()
      expect(args).toMatchObject({
        subscriptionId: mockSubscriberId,
        ownerId: mockOwnerId,
      })
      expect(args.subscriber).toBeDefined()
    })
  })
})
