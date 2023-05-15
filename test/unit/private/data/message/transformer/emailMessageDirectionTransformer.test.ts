/*
 * Copyright © 2023 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailMessageDirection } from '../../../../../../src/gen/graphqlTypes'
import { EmailMessageDirectionTransformer } from '../../../../../../src/private/data/message/transformer/emailMessageDirectionTransformer'
import { Direction } from '../../../../../../src/public/typings/emailMessage'

describe('EmailMessageDirectionTransformer Test Suite', () => {
  const instanceUnderTest = new EmailMessageDirectionTransformer()

  describe('fromAPItoGraphQL', () => {
    it.each`
      input                 | expected
      ${Direction.Inbound}  | ${EmailMessageDirection.Inbound}
      ${Direction.Outbound} | ${EmailMessageDirection.Outbound}
    `(
      'converts API direction ($input) to GraphQL direction ($expected)',
      ({ input, expected }) => {
        expect(instanceUnderTest.fromAPItoGraphQL(input)).toStrictEqual(
          expected,
        )
      },
    )
  })

  describe('fromGraphQLtoAPI', () => {
    it.each`
      input                             | expected
      ${EmailMessageDirection.Inbound}  | ${Direction.Inbound}
      ${EmailMessageDirection.Outbound} | ${Direction.Outbound}
    `(
      'converts GraphQL direction ($input) to API direction ($expected)',
      ({ input, expected }) => {
        expect(instanceUnderTest.fromGraphQLtoAPI(input)).toStrictEqual(
          expected,
        )
      },
    )
  })
})
