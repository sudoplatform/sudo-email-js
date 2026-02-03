/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailMaskStatus as EmailMaskStatusGraphQL } from '../../../../gen/graphqlTypes'
import { EmailMaskStatus } from '../../../../public'
import { EmailMaskEntityStatus } from '../../../domain/entities/mask/emailMaskEntity'

export class EmailMaskStatusTransformer {
  static graphQLToEntity(data: EmailMaskStatusGraphQL): EmailMaskEntityStatus {
    switch (data) {
      case EmailMaskStatusGraphQL.Enabled:
        return EmailMaskEntityStatus.ENABLED
      case EmailMaskStatusGraphQL.Disabled:
        return EmailMaskEntityStatus.DISABLED
      case EmailMaskStatusGraphQL.Locked:
        return EmailMaskEntityStatus.LOCKED
      case EmailMaskStatusGraphQL.Pending:
        return EmailMaskEntityStatus.PENDING
    }
  }

  static entityToGraphQL(data: EmailMaskEntityStatus): EmailMaskStatusGraphQL {
    switch (data) {
      case EmailMaskEntityStatus.ENABLED:
        return EmailMaskStatusGraphQL.Enabled
      case EmailMaskEntityStatus.DISABLED:
        return EmailMaskStatusGraphQL.Disabled
      case EmailMaskEntityStatus.LOCKED:
        return EmailMaskStatusGraphQL.Locked
      case EmailMaskEntityStatus.PENDING:
        return EmailMaskStatusGraphQL.Pending
    }
  }

  static entityToApi(data: EmailMaskEntityStatus): EmailMaskStatus {
    switch (data) {
      case EmailMaskEntityStatus.ENABLED:
        return EmailMaskStatus.ENABLED
      case EmailMaskEntityStatus.DISABLED:
        return EmailMaskStatus.DISABLED
      case EmailMaskEntityStatus.LOCKED:
        return EmailMaskStatus.LOCKED
      case EmailMaskEntityStatus.PENDING:
        return EmailMaskStatus.PENDING
    }
  }

  static apiToEntity(data: EmailMaskStatus): EmailMaskEntityStatus {
    switch (data) {
      case EmailMaskStatus.ENABLED:
        return EmailMaskEntityStatus.ENABLED
      case EmailMaskStatus.DISABLED:
        return EmailMaskEntityStatus.DISABLED
      case EmailMaskStatus.LOCKED:
        return EmailMaskEntityStatus.LOCKED
      case EmailMaskStatus.PENDING:
        return EmailMaskEntityStatus.PENDING
    }
  }
}
