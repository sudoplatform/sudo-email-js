/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { mock, reset } from 'ts-mockito'
import {
  ConnectionState,
  EmailMessage,
  EmailMessageSubscriber,
} from '../../../../../src'
import { OnEmailMessageDeletedSubscription } from '../../../../../src/gen/graphqlTypes'
import { ApiClient } from '../../../../../src/private/data/common/apiClient'
import { SubscriptionManager } from '../../../../../src/private/data/common/subscriptionManager'
import { EntityDataFactory } from '../../../data-factory/entity'

describe('SubscriptionManager test suite', () => {
  const mockApiClient = mock<ApiClient>()

  let subscriptionCalled = false
  let notifiedEmailMessageId: string | undefined = undefined
  let connectionStateChangeCalled = false
  let connectionState: ConnectionState = ConnectionState.Disconnected

  const defaultSubscriber = {
    emailMessageDeleted(emailMessage: EmailMessage): void {
      subscriptionCalled = true
      notifiedEmailMessageId = emailMessage.id
    },
    connectionStatusChanged(state: ConnectionState): void {
      connectionStateChangeCalled = true
      connectionState = state
    },
    emailMessageCreated(emailMessage: EmailMessage): void {
      subscriptionCalled = true
      notifiedEmailMessageId = emailMessage.id
    },
    emailMessageUpdated(emailMessage: EmailMessage): void {
      subscriptionCalled = true
      notifiedEmailMessageId = emailMessage.id
    },
  }

  let iut: SubscriptionManager<
    OnEmailMessageDeletedSubscription,
    EmailMessageSubscriber
  >

  beforeEach(() => {
    reset(mockApiClient)

    iut = new SubscriptionManager<
      OnEmailMessageDeletedSubscription,
      EmailMessageSubscriber
    >()
  })

  it('connectionStateChanged should call subscribed callback', () => {
    iut.subscribe('dummy-id', defaultSubscriber)

    void iut.connectionStatusChanged(ConnectionState.Connected)
    expect(connectionStateChangeCalled).toBeTruthy()
    expect(connectionState).toBe(ConnectionState.Connected)
    expect(subscriptionCalled).toBeFalsy()
    expect(notifiedEmailMessageId).toBeUndefined()
  })

  it('connectionStateChanged should not call unsubscribed callback', () => {
    iut.subscribe('dummy-id', defaultSubscriber)

    void iut.connectionStatusChanged(ConnectionState.Connected)
    expect(connectionStateChangeCalled).toBeTruthy()
    expect(connectionState).toBe(ConnectionState.Connected)
    expect(subscriptionCalled).toBeFalsy()
    expect(notifiedEmailMessageId).toBeUndefined()

    connectionStateChangeCalled = false
    connectionState = ConnectionState.Disconnected

    iut.unsubscribe('dummy-id')
    void iut.connectionStatusChanged(ConnectionState.Connected)
    expect(connectionStateChangeCalled).toBeFalsy()
    expect(connectionState).toBe(ConnectionState.Disconnected)
    expect(subscriptionCalled).toBeFalsy()
    expect(notifiedEmailMessageId).toBeUndefined()
  })

  it('onEmailMessageDeleted should call subscribed callback', async () => {
    iut.subscribe('dummy-id', defaultSubscriber)

    const emailMessage = EntityDataFactory.emailMessage
    await iut.emailMessageDeleted(emailMessage)
    expect(connectionStateChangeCalled).toBeFalsy()
    expect(connectionState).toBe(ConnectionState.Disconnected)
    expect(subscriptionCalled).toBeTruthy()
    expect(notifiedEmailMessageId).toBe(emailMessage.id)
  })

  it('onEmailMessageDeleted should not call unsubscribed callback', async () => {
    iut.subscribe('dummy-id', defaultSubscriber)

    const emailMessage = EntityDataFactory.emailMessage
    void iut.emailMessageDeleted(emailMessage)
    expect(connectionStateChangeCalled).toBeFalsy()
    expect(connectionState).toBe(ConnectionState.Disconnected)
    expect(subscriptionCalled).toBeTruthy()
    expect(notifiedEmailMessageId).toBe(emailMessage.id)

    subscriptionCalled = false
    notifiedEmailMessageId = undefined
    iut.unsubscribe('dummy-id')

    await iut.emailMessageDeleted(emailMessage)
    expect(connectionStateChangeCalled).toBeFalsy()
    expect(connectionState).toBe(ConnectionState.Disconnected)
    expect(subscriptionCalled).toBeFalsy()
    expect(notifiedEmailMessageId).toBeUndefined()
  })

  it('unsubscribe different id does not unsubscribe all', async () => {
    iut.subscribe('dummy-id', defaultSubscriber)

    const emailMessage = EntityDataFactory.emailMessage
    void iut.emailMessageDeleted(emailMessage)
    expect(connectionStateChangeCalled).toBeFalsy()
    expect(connectionState).toBe(ConnectionState.Disconnected)
    expect(subscriptionCalled).toBeTruthy()
    expect(notifiedEmailMessageId).toBe(emailMessage.id)

    subscriptionCalled = false
    notifiedEmailMessageId = undefined
    iut.unsubscribe('dummy-id-2')

    await iut.emailMessageDeleted(emailMessage)
    expect(connectionStateChangeCalled).toBeFalsy()
    expect(connectionState).toBe(ConnectionState.Disconnected)
    expect(subscriptionCalled).toBeTruthy()
    expect(notifiedEmailMessageId).toBe(emailMessage.id)
  })

  it('subscribe same id overwrites previous subscription', async () => {
    iut.subscribe('dummy-id', {
      connectionStatusChanged(state: ConnectionState): void {
        fail(
          'unexpectedly invoked incorrect connection status changed callback',
        )
      },
      emailMessageDeleted(emailMessage: EmailMessage): void {
        fail('unexpectedly invoked incorrect email message deleted callback')
      },
      emailMessageCreated(emailMessage: EmailMessage): void {
        fail('unexpectedly invoked incorrect email message deleted callback')
      },
      emailMessageUpdated(emailMessage: EmailMessage): void {
        fail('unexpectedly invoked incorrect email message updated callback')
      },
    })
    iut.subscribe('dummy-id', defaultSubscriber)

    const emailMessage = EntityDataFactory.emailMessage
    await iut.emailMessageDeleted(emailMessage)
    expect(connectionStateChangeCalled).toBeFalsy()
    expect(connectionState).toBe(ConnectionState.Disconnected)
    expect(subscriptionCalled).toBeTruthy()
    expect(notifiedEmailMessageId).toBe(emailMessage.id)

    iut.connectionStatusChanged(ConnectionState.Connected)
    expect(connectionStateChangeCalled).toBeTruthy()
    expect(connectionState).toBe(ConnectionState.Connected)
  })
})
