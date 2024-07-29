/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailMessageState } from '../../../../gen/graphqlTypes'
import { State } from '../../../../public/typings/emailMessage'

export class EmailMessageStateTransformer {
  fromAPItoGraphQL(data: State): EmailMessageState {
    switch (data) {
      case State.Queued:
        return EmailMessageState.Queued
      case State.Sent:
        return EmailMessageState.Sent
      case State.Delivered:
        return EmailMessageState.Delivered
      case State.Undelivered:
        return EmailMessageState.Undelivered
      case State.Failed:
        return EmailMessageState.Failed
      case State.Received:
        return EmailMessageState.Received
      case State.Deleted:
        return EmailMessageState.Deleted
    }
  }

  fromGraphQLtoAPI(data: EmailMessageState): State {
    switch (data) {
      case EmailMessageState.Queued:
        return State.Queued
      case EmailMessageState.Sent:
        return State.Sent
      case EmailMessageState.Delivered:
        return State.Delivered
      case EmailMessageState.Undelivered:
        return State.Undelivered
      case EmailMessageState.Failed:
        return State.Failed
      case EmailMessageState.Received:
        return State.Received
      case EmailMessageState.Deleted:
        return State.Deleted
    }
  }
}
