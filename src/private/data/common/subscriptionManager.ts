/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import { Observable } from 'apollo-client/util/Observable'
import { FetchResult } from 'apollo-link'
import {
  OnEmailMessageDeletedSubscription,
  OnEmailMessageCreatedSubscription,
} from '../../../gen/graphqlTypes'
import {
  ConnectionState,
  EmailMessage,
  EmailMessageSubscriber,
} from '../../../public'

export type Subscribable =
  | OnEmailMessageDeletedSubscription
  | OnEmailMessageCreatedSubscription
export class SubscriptionManager<
  T extends Subscribable,
  S extends EmailMessageSubscriber,
> implements EmailMessageSubscriber
{
  private readonly log: Logger
  private subscribers: Record<string, S | undefined> = {}
  private _subscription: ZenObservable.Subscription | undefined = undefined
  private _watcher: Observable<FetchResult<T>> | null = null

  public constructor() {
    this.log = new DefaultLogger(this.constructor.name)
  }

  private reset(): void {
    this.subscribers = {}
    this._subscription?.unsubscribe()
    this._watcher = null
    this._subscription = undefined
  }

  public subscribe(subscriptionId: string, subscriber: S): void {
    this.subscribers[subscriptionId] = subscriber
  }

  public unsubscribe(subscriptionId: string): void {
    delete this.subscribers[subscriptionId]

    // Reset root subscription state values if
    // there are no more active subscribers.
    if (Object.keys(this.subscribers).length === 0) {
      this.reset()
    }
  }

  public getWatcher(): Observable<FetchResult<T>> | null {
    return this._watcher
  }

  public setWatcher(value: Observable<FetchResult<T>> | null): void {
    this._watcher = value
  }

  public setSubscription(
    value: ZenObservable.Subscription | undefined,
  ): SubscriptionManager<T, S> {
    this._subscription = value
    return this
  }

  /**
   * Processes AppSync subscription connection status change.
   *
   * @param state connection state.
   */
  public connectionStatusChanged(state: ConnectionState): void {
    const subscribersToNotify = Object.values(this.subscribers)

    if (state == ConnectionState.Disconnected) {
      this.reset()
    }

    subscribersToNotify.forEach((subscriber) => {
      if (subscriber && subscriber.connectionStatusChanged) {
        subscriber.connectionStatusChanged(state)
      }
    })
  }

  /**
   * Notifies subscribers of a deleted `EmailMessage`.
   *
   * @param emailMessage deleted `EmailMessage`.
   */
  public emailMessageDeleted(emailMessage: EmailMessage): void {
    for (const subscriber of Object.values(this.subscribers)) {
      subscriber?.emailMessageDeleted(emailMessage)
    }
  }

  /**
   * Notifies subscribers of a created `EmailMessage`.
   *
   * @param emailMessage created `EmailMessage`.
   */
  public emailMessageCreated(emailMessage: EmailMessage): void {
    for (const subscriber of Object.values(this.subscribers)) {
      subscriber?.emailMessageCreated(emailMessage)
    }
  }
}
