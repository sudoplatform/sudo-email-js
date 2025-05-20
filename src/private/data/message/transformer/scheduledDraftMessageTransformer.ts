/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { ScheduledDraftMessage as ScheduledDraftMessageGraphQL } from '../../../../gen/graphqlTypes'
import { ScheduledDraftMessageEntity } from '../../../domain/entities/message/scheduledDraftMessageEntity'
import { ScheduledDraftMessageStateTransformer } from './scheduledDraftMessageStateTransformer'

export class ScheduledDraftMessageTransformer {
  static toEntity(
    graphQL: ScheduledDraftMessageGraphQL,
  ): ScheduledDraftMessageEntity {
    return {
      id: graphQL.draftMessageKey.substring(
        graphQL.draftMessageKey.lastIndexOf('/') + 1,
      ),
      emailAddressId: graphQL.emailAddressId,
      owner: graphQL.owner,
      owners: graphQL.owners,
      sendAt: new Date(graphQL.sendAtEpochMs),
      state: ScheduledDraftMessageStateTransformer.toEntity(graphQL.state),
      createdAt: new Date(graphQL.createdAtEpochMs),
      updatedAt: new Date(graphQL.updatedAtEpochMs),
    }
  }
}
