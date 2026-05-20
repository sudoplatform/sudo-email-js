/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { v4 } from 'uuid'
import {
  EmailMessageDirection,
  EmailMessageState,
  MailboxType as MailboxTypeGraphQL,
} from '../../../../../../src/gen/graphqlTypes'
import { ListEmailMessagesFilterTransformer } from '../../../../../../src/private/data/common/transformer/listEmailMessagesFilterTransformer'
import {
  ListEmailMessagesFilter,
  MailboxType,
} from '../../../../../../src/public'
import {
  Direction,
  State,
} from '../../../../../../src/public/typings/emailMessage'

describe('ListEmailMessagesFilterTransformer Test Suite', () => {
  describe('toGraphQL', () => {
    it('returns an empty object when given an empty filter', () => {
      const result = ListEmailMessagesFilterTransformer.toGraphQL({})
      expect(result).toStrictEqual({})
    })

    describe('string filters', () => {
      it.each`
        field            | value
        ${'id'}          | ${v4()}
        ${'messageId'}   | ${v4()}
        ${'keyId'}       | ${v4()}
        ${'folderId'}    | ${v4()}
        ${'clientRefId'} | ${v4()}
      `(
        'transforms $field equal filter to GraphQL IdFilterInput',
        ({ field, value }) => {
          const filter: ListEmailMessagesFilter = { [field]: { equal: value } }
          const result = ListEmailMessagesFilterTransformer.toGraphQL(filter)
          expect(result[field as keyof typeof result]).toStrictEqual({
            eq: value,
            ne: undefined,
            beginsWith: undefined,
          })
        },
      )

      it.each`
        field            | value
        ${'id'}          | ${v4()}
        ${'messageId'}   | ${v4()}
        ${'keyId'}       | ${v4()}
        ${'folderId'}    | ${v4()}
        ${'clientRefId'} | ${v4()}
      `(
        'transforms $field notEqual filter to GraphQL IdFilterInput',
        ({ field, value }) => {
          const filter: ListEmailMessagesFilter = {
            [field]: { notEqual: value },
          }
          const result = ListEmailMessagesFilterTransformer.toGraphQL(filter)
          expect(result[field as keyof typeof result]).toStrictEqual({
            eq: undefined,
            ne: value,
            beginsWith: undefined,
          })
        },
      )

      it('transforms algorithm equal filter to GraphQL StringFilterInput', () => {
        const filter: ListEmailMessagesFilter = {
          algorithm: { equal: 'RSA/ECB/OAEPWithSHA-1AndMGF1Padding' },
        }
        const result = ListEmailMessagesFilterTransformer.toGraphQL(filter)
        expect(result.algorithm).toStrictEqual({
          eq: 'RSA/ECB/OAEPWithSHA-1AndMGF1Padding',
          ne: undefined,
          beginsWith: undefined,
        })
      })

      it('transforms algorithm beginsWith filter to GraphQL StringFilterInput', () => {
        const filter: ListEmailMessagesFilter = {
          algorithm: { beginsWith: 'RSA' },
        }
        const result = ListEmailMessagesFilterTransformer.toGraphQL(filter)
        expect(result.algorithm).toStrictEqual({
          eq: undefined,
          ne: undefined,
          beginsWith: 'RSA',
        })
      })
    })

    describe('boolean filters', () => {
      it.each`
        field          | value
        ${'seen'}      | ${true}
        ${'seen'}      | ${false}
        ${'repliedTo'} | ${true}
        ${'forwarded'} | ${false}
      `(
        'transforms $field equal:$value to GraphQL BooleanFilterInput',
        ({ field, value }) => {
          const filter: ListEmailMessagesFilter = { [field]: { equal: value } }
          const result = ListEmailMessagesFilterTransformer.toGraphQL(filter)
          expect(result[field as keyof typeof result]).toStrictEqual({
            eq: value,
            ne: undefined,
          })
        },
      )

      it('transforms seen notEqual filter to GraphQL BooleanFilterInput', () => {
        const filter: ListEmailMessagesFilter = { seen: { notEqual: true } }
        const result = ListEmailMessagesFilterTransformer.toGraphQL(filter)
        expect(result.seen).toStrictEqual({ eq: undefined, ne: true })
      })
    })

    describe('direction filter', () => {
      it('transforms equal:Inbound to GraphQL', () => {
        const filter: ListEmailMessagesFilter = {
          direction: { equal: Direction.Inbound },
        }
        const result = ListEmailMessagesFilterTransformer.toGraphQL(filter)
        expect(result.direction).toStrictEqual({
          eq: EmailMessageDirection.Inbound,
          ne: undefined,
        })
      })

      it('transforms equal:Outbound to GraphQL', () => {
        const filter: ListEmailMessagesFilter = {
          direction: { equal: Direction.Outbound },
        }
        const result = ListEmailMessagesFilterTransformer.toGraphQL(filter)
        expect(result.direction).toStrictEqual({
          eq: EmailMessageDirection.Outbound,
          ne: undefined,
        })
      })

      it('transforms notEqual:Inbound to GraphQL', () => {
        const filter: ListEmailMessagesFilter = {
          direction: { notEqual: Direction.Inbound },
        }
        const result = ListEmailMessagesFilterTransformer.toGraphQL(filter)
        expect(result.direction).toStrictEqual({
          eq: undefined,
          ne: EmailMessageDirection.Inbound,
        })
      })
    })

    describe('state filter', () => {
      it('transforms equal state filter to GraphQL', () => {
        const filter: ListEmailMessagesFilter = {
          state: { equal: State.Delivered },
        }
        const result = ListEmailMessagesFilterTransformer.toGraphQL(filter)
        expect(result.state).toStrictEqual({
          eq: EmailMessageState.Delivered,
        })
      })

      it('transforms notEqual state filter to GraphQL', () => {
        const filter: ListEmailMessagesFilter = {
          state: { notEqual: State.Failed },
        }
        const result = ListEmailMessagesFilterTransformer.toGraphQL(filter)
        expect(result.state).toStrictEqual({
          ne: EmailMessageState.Failed,
        })
      })

      it('transforms oneOf state filter to GraphQL', () => {
        const filter: ListEmailMessagesFilter = {
          state: { oneOf: [State.Delivered, State.Received] },
        }
        const result = ListEmailMessagesFilterTransformer.toGraphQL(filter)
        expect(result.state).toStrictEqual({
          in: [EmailMessageState.Delivered, EmailMessageState.Received],
        })
      })

      it('transforms notOneOf state filter to GraphQL', () => {
        const filter: ListEmailMessagesFilter = {
          state: { notOneOf: [State.Deleted, State.Failed] },
        }
        const result = ListEmailMessagesFilterTransformer.toGraphQL(filter)
        expect(result.state).toStrictEqual({
          notIn: [EmailMessageState.Deleted, EmailMessageState.Failed],
        })
      })
    })

    describe('mailboxIds filter', () => {
      it('transforms a single Address mailboxIds filter to GraphQL', () => {
        const id = v4()
        const filter: ListEmailMessagesFilter = {
          mailboxIds: [{ type: MailboxType.Address, id: { equal: id } }],
        }
        const result = ListEmailMessagesFilterTransformer.toGraphQL(filter)
        expect(result.mailboxIds).toStrictEqual([
          {
            type: MailboxTypeGraphQL.Address,
            id: { eq: id, ne: undefined, beginsWith: undefined },
          },
        ])
      })

      it('transforms a Mask mailboxIds filter to GraphQL', () => {
        const id = v4()
        const filter: ListEmailMessagesFilter = {
          mailboxIds: [{ type: MailboxType.Mask, id: { equal: id } }],
        }
        const result = ListEmailMessagesFilterTransformer.toGraphQL(filter)
        expect(result.mailboxIds).toStrictEqual([
          {
            type: MailboxTypeGraphQL.Mask,
            id: { eq: id, ne: undefined, beginsWith: undefined },
          },
        ])
      })

      it('does not include mailboxIds when array is empty', () => {
        const filter: ListEmailMessagesFilter = { mailboxIds: [] }
        const result = ListEmailMessagesFilterTransformer.toGraphQL(filter)
        expect(result.mailboxIds).toBeUndefined()
      })
    })

    describe('logical operators', () => {
      it('transforms not filter recursively', () => {
        const filter: ListEmailMessagesFilter = {
          not: { seen: { equal: false } },
        }
        const result = ListEmailMessagesFilterTransformer.toGraphQL(filter)
        expect(result.not).toStrictEqual({
          seen: { eq: false, ne: undefined },
        })
      })

      it('transforms and filter recursively', () => {
        const filter: ListEmailMessagesFilter = {
          and: [
            { seen: { equal: false } },
            { direction: { equal: Direction.Inbound } },
          ],
        }
        const result = ListEmailMessagesFilterTransformer.toGraphQL(filter)
        expect(result.and).toStrictEqual([
          { seen: { eq: false, ne: undefined } },
          { direction: { eq: EmailMessageDirection.Inbound, ne: undefined } },
        ])
      })

      it('transforms or filter recursively', () => {
        const filter: ListEmailMessagesFilter = {
          or: [
            { state: { equal: State.Delivered } },
            { state: { equal: State.Received } },
          ],
        }
        const result = ListEmailMessagesFilterTransformer.toGraphQL(filter)
        expect(result.or).toStrictEqual([
          { state: { eq: EmailMessageState.Delivered } },
          { state: { eq: EmailMessageState.Received } },
        ])
      })

      it('does not include and when array is empty', () => {
        const filter: ListEmailMessagesFilter = { and: [] }
        const result = ListEmailMessagesFilterTransformer.toGraphQL(filter)
        expect(result.and).toBeUndefined()
      })

      it('does not include or when array is empty', () => {
        const filter: ListEmailMessagesFilter = { or: [] }
        const result = ListEmailMessagesFilterTransformer.toGraphQL(filter)
        expect(result.or).toBeUndefined()
      })
    })

    it('transforms a compound filter with multiple fields', () => {
      const folderId = v4()
      const filter: ListEmailMessagesFilter = {
        folderId: { equal: folderId },
        seen: { equal: false },
        direction: { equal: Direction.Inbound },
      }
      const result = ListEmailMessagesFilterTransformer.toGraphQL(filter)
      expect(result).toMatchObject({
        folderId: { eq: folderId },
        seen: { eq: false },
        direction: { eq: EmailMessageDirection.Inbound },
      })
    })
  })
})
