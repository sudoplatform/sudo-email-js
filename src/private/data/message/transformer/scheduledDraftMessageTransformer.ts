/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ScheduledDraftMessage as ScheduledDraftMessageGraphQL,
  ScheduledDraftMessageState as ScheduledDraftMessageStateGraphQL,
} from '../../../../gen/graphqlTypes'
import { ScheduledDraftMessageEntity } from '../../../domain/entities/message/scheduledDraftMessageEntity'
import { ScheduledDraftMessageState as ScheduledDraftMessageStateEntity } from '../../../../public'

export class ScheduledDraftMessageTransformer {
  toEntity(graphQL: ScheduledDraftMessageGraphQL): ScheduledDraftMessageEntity {
    return {
      id: graphQL.draftMessageKey.substring(
        graphQL.draftMessageKey.lastIndexOf('/') + 1,
      ),
      emailAddressId: graphQL.emailAddressId,
      owner: graphQL.owner,
      owners: graphQL.owners,
      sendAt: new Date(graphQL.sendAtEpochMs),
      state: this.stateToEntity(graphQL.state),
      createdAt: new Date(graphQL.createdAtEpochMs),
      updatedAt: new Date(graphQL.updatedAtEpochMs),
    }
  }

  private stateToEntity(
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
}
