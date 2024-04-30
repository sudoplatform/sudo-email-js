/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { SendEmailMessageResult } from '../../../../gen/graphqlTypes'
import { SendEmailMessageResult as Entity } from '../../../../public'

export class SendEmailMessageResultTransformer {
  transformGraphQL(data: SendEmailMessageResult): Entity {
    return {
      id: data.id,
      createdAt: new Date(data.createdAtEpochMs),
    }
  }
}
