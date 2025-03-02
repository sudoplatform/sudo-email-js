/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailMessageDirection } from '../../../../gen/graphqlTypes'
import { Direction } from '../../../../public/typings/emailMessage'

export class EmailMessageDirectionTransformer {
  fromAPItoGraphQL(data: Direction): EmailMessageDirection {
    switch (data) {
      case Direction.Inbound:
        return EmailMessageDirection.Inbound
      case Direction.Outbound:
        return EmailMessageDirection.Outbound
    }
  }

  fromGraphQLtoAPI(data: EmailMessageDirection): Direction {
    switch (data) {
      case EmailMessageDirection.Inbound:
        return Direction.Inbound
      case EmailMessageDirection.Outbound:
        return Direction.Outbound
    }
  }
}
