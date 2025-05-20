/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ScheduledDraftMessageFilterInput as ScheduledDraftMessageFilterGraphQl,
  ScheduledDraftMessageStateFilterInput,
} from '../../../../gen/graphqlTypes'
import { ScheduledDraftMessageFilterInput } from '../../../domain/entities/message/emailMessageService'
import { ScheduledDraftMessageStateTransformer } from './scheduledDraftMessageStateTransformer'

export class ScheduledDraftMessageFilterTransformer {
  static toGraphQl(
    inputFilter: ScheduledDraftMessageFilterInput,
  ): ScheduledDraftMessageFilterGraphQl | undefined {
    if (inputFilter.state) {
      const inputStateFilter = inputFilter.state
      const gqlStateFilter: ScheduledDraftMessageStateFilterInput = {}
      if (inputStateFilter.equal) {
        gqlStateFilter.eq = ScheduledDraftMessageStateTransformer.toGraphQl(
          inputStateFilter.equal,
        )
      }
      if (inputStateFilter.notEqual) {
        gqlStateFilter.ne = ScheduledDraftMessageStateTransformer.toGraphQl(
          inputStateFilter.notEqual,
        )
      }
      if (inputStateFilter.notOneOf && inputStateFilter.notOneOf.length) {
        gqlStateFilter.notIn = inputStateFilter.notOneOf.map((s) =>
          ScheduledDraftMessageStateTransformer.toGraphQl(s),
        )
      }
      if (inputStateFilter.oneOf && inputStateFilter.oneOf.length) {
        gqlStateFilter.in = inputStateFilter.oneOf.map((s) =>
          ScheduledDraftMessageStateTransformer.toGraphQl(s),
        )
      }
      return {
        state: gqlStateFilter,
      }
    }
  }
}
