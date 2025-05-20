/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { ScheduledDraftMessageState as ScheduledDraftMessageStateGraphQL } from '../../../../gen/graphqlTypes'
import { ScheduledDraftMessageState as ScheduledDraftMessageStateEntity } from '../../../../public'

export class ScheduledDraftMessageStateTransformer {
  static toEntity(
    graphQL: ScheduledDraftMessageStateGraphQL,
  ): ScheduledDraftMessageStateEntity {
    switch (graphQL) {
      case ScheduledDraftMessageStateGraphQL.Cancelled:
        return ScheduledDraftMessageStateEntity.CANCELLED
      case ScheduledDraftMessageStateGraphQL.Failed:
        return ScheduledDraftMessageStateEntity.FAILED
      case ScheduledDraftMessageStateGraphQL.Scheduled:
        return ScheduledDraftMessageStateEntity.SCHEDULED
      case ScheduledDraftMessageStateGraphQL.Sent:
        return ScheduledDraftMessageStateEntity.SENT
    }
  }

  static toGraphQl(
    entity: ScheduledDraftMessageStateEntity,
  ): ScheduledDraftMessageStateGraphQL {
    switch (entity) {
      case ScheduledDraftMessageStateEntity.CANCELLED:
        return ScheduledDraftMessageStateGraphQL.Cancelled
      case ScheduledDraftMessageStateEntity.FAILED:
        return ScheduledDraftMessageStateGraphQL.Failed
      case ScheduledDraftMessageStateEntity.SCHEDULED:
        return ScheduledDraftMessageStateGraphQL.Scheduled
      case ScheduledDraftMessageStateEntity.SENT:
        return ScheduledDraftMessageStateGraphQL.Sent
    }
  }
}
