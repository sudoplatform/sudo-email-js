/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BooleanFilterInput,
  EmailMessageDirectionFilterInput,
  EmailMessageFilterInput,
  EmailMessageState,
  EmailMessageStateFilterInput,
  IdFilterInput,
  MailboxIdsFilterInput,
  MailboxType,
  StringFilterInput,
} from '../../../../gen/graphqlTypes'
import {
  EmailMessageDirectionFilter,
  EmailMessageStateFilter,
  ListEmailMessagesFilter,
  MailboxIdsFilter,
} from '../../../../public/inputs/emailMessage'
import { BooleanFilter, StringFilter } from '../../../../public/inputs/common'

export class ListEmailMessagesFilterTransformer {
  static toGraphQL(
    filter: Partial<ListEmailMessagesFilter>,
  ): EmailMessageFilterInput {
    const result: EmailMessageFilterInput = {}

    if (filter.id) {
      result.id = ListEmailMessagesFilterTransformer.stringFilterToIdFilter(
        filter.id,
      )
    }
    if (filter.messageId) {
      result.messageId =
        ListEmailMessagesFilterTransformer.stringFilterToIdFilter(
          filter.messageId,
        )
    }
    if (filter.algorithm) {
      result.algorithm =
        ListEmailMessagesFilterTransformer.stringFilterToStringFilterInput(
          filter.algorithm,
        )
    }
    if (filter.keyId) {
      result.keyId = ListEmailMessagesFilterTransformer.stringFilterToIdFilter(
        filter.keyId,
      )
    }
    if (filter.folderId) {
      result.folderId =
        ListEmailMessagesFilterTransformer.stringFilterToIdFilter(
          filter.folderId,
        )
    }
    if (filter.clientRefId) {
      result.clientRefId =
        ListEmailMessagesFilterTransformer.stringFilterToIdFilter(
          filter.clientRefId,
        )
    }
    if (filter.direction) {
      result.direction =
        ListEmailMessagesFilterTransformer.directionFilterToGraphQL(
          filter.direction,
        )
    }
    if (filter.seen !== undefined) {
      result.seen = ListEmailMessagesFilterTransformer.booleanFilterToGraphQL(
        filter.seen,
      )
    }
    if (filter.repliedTo !== undefined) {
      result.repliedTo =
        ListEmailMessagesFilterTransformer.booleanFilterToGraphQL(
          filter.repliedTo,
        )
    }
    if (filter.forwarded !== undefined) {
      result.forwarded =
        ListEmailMessagesFilterTransformer.booleanFilterToGraphQL(
          filter.forwarded,
        )
    }
    if (filter.state) {
      result.state = ListEmailMessagesFilterTransformer.stateFilterToGraphQL(
        filter.state,
      )
    }
    if (filter.mailboxIds && filter.mailboxIds.length > 0) {
      result.mailboxIds = filter.mailboxIds.map(
        ListEmailMessagesFilterTransformer.mailboxIdsFilterToGraphQL,
      )
    }
    if (filter.not) {
      result.not = ListEmailMessagesFilterTransformer.toGraphQL(filter.not)
    }
    if (filter.and && filter.and.length > 0) {
      result.and = filter.and.map(
        ListEmailMessagesFilterTransformer.toGraphQL.bind(
          ListEmailMessagesFilterTransformer,
        ),
      )
    }
    if (filter.or && filter.or.length > 0) {
      result.or = filter.or.map(
        ListEmailMessagesFilterTransformer.toGraphQL.bind(
          ListEmailMessagesFilterTransformer,
        ),
      )
    }

    return result
  }

  private static stringFilterToIdFilter(filter: StringFilter): IdFilterInput {
    return {
      eq: filter.equal,
      ne: filter.notEqual,
      beginsWith: filter.beginsWith,
    }
  }

  private static stringFilterToStringFilterInput(
    filter: StringFilter,
  ): StringFilterInput {
    return {
      eq: filter.equal,
      ne: filter.notEqual,
      beginsWith: filter.beginsWith,
    }
  }

  private static booleanFilterToGraphQL(
    filter: BooleanFilter,
  ): BooleanFilterInput {
    return {
      eq: filter.equal,
      ne: filter.notEqual,
    }
  }

  private static directionFilterToGraphQL(
    filter: EmailMessageDirectionFilter,
  ): EmailMessageDirectionFilterInput {
    return {
      eq: 'equal' in filter && filter.equal ? (filter.equal as any) : undefined,
      ne:
        'notEqual' in filter && filter.notEqual
          ? (filter.notEqual as any)
          : undefined,
    }
  }

  private static stateFilterToGraphQL(
    filter: EmailMessageStateFilter,
  ): EmailMessageStateFilterInput {
    const result: EmailMessageStateFilterInput = {}
    if ('equal' in filter && filter.equal) {
      result.eq = filter.equal as unknown as EmailMessageState
    }
    if ('notEqual' in filter && filter.notEqual) {
      result.ne = filter.notEqual as unknown as EmailMessageState
    }
    if ('oneOf' in filter && filter.oneOf && filter.oneOf.length > 0) {
      result.in = filter.oneOf as unknown as EmailMessageState[]
    }
    if ('notOneOf' in filter && filter.notOneOf && filter.notOneOf.length > 0) {
      result.notIn = filter.notOneOf as unknown as EmailMessageState[]
    }
    return result
  }

  private static mailboxIdsFilterToGraphQL(
    filter: MailboxIdsFilter,
  ): MailboxIdsFilterInput {
    return {
      type: filter.type as unknown as MailboxType,
      id: {
        eq: filter.id.equal,
        ne: filter.id.notEqual,
        beginsWith: filter.id.beginsWith,
      },
    }
  }
}
