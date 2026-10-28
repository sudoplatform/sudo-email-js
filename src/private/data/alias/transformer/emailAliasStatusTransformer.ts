/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailMaskStatus as EmailMaskStatusGraphQL } from '../../../../gen/graphqlTypes'
import { EmailAliasStatus } from '../../../../public'
import { EmailAliasEntityStatus } from '../../../domain/entities/alias/emailAliasEntity'

export class EmailAliasStatusTransformer {
  static graphQLToEntity(data: EmailMaskStatusGraphQL): EmailAliasEntityStatus {
    switch (data) {
      case EmailMaskStatusGraphQL.Enabled:
        return EmailAliasEntityStatus.ENABLED
      case EmailMaskStatusGraphQL.Disabled:
        return EmailAliasEntityStatus.DISABLED
      case EmailMaskStatusGraphQL.Locked:
        return EmailAliasEntityStatus.LOCKED
      case EmailMaskStatusGraphQL.Pending:
        return EmailAliasEntityStatus.PENDING
    }
  }

  static entityToGraphQL(data: EmailAliasEntityStatus): EmailMaskStatusGraphQL {
    switch (data) {
      case EmailAliasEntityStatus.ENABLED:
        return EmailMaskStatusGraphQL.Enabled
      case EmailAliasEntityStatus.DISABLED:
        return EmailMaskStatusGraphQL.Disabled
      case EmailAliasEntityStatus.LOCKED:
        return EmailMaskStatusGraphQL.Locked
      case EmailAliasEntityStatus.PENDING:
        return EmailMaskStatusGraphQL.Pending
    }
  }

  static entityToApi(data: EmailAliasEntityStatus): EmailAliasStatus {
    switch (data) {
      case EmailAliasEntityStatus.ENABLED:
        return EmailAliasStatus.ENABLED
      case EmailAliasEntityStatus.DISABLED:
        return EmailAliasStatus.DISABLED
      case EmailAliasEntityStatus.LOCKED:
        return EmailAliasStatus.LOCKED
      case EmailAliasEntityStatus.PENDING:
        return EmailAliasStatus.PENDING
    }
  }

  static apiToEntity(data: EmailAliasStatus): EmailAliasEntityStatus {
    switch (data) {
      case EmailAliasStatus.ENABLED:
        return EmailAliasEntityStatus.ENABLED
      case EmailAliasStatus.DISABLED:
        return EmailAliasEntityStatus.DISABLED
      case EmailAliasStatus.LOCKED:
        return EmailAliasEntityStatus.LOCKED
      case EmailAliasStatus.PENDING:
        return EmailAliasEntityStatus.PENDING
    }
  }
}
