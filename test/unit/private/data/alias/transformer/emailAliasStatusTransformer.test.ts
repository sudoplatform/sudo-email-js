/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailMaskStatus as EmailMaskStatusGraphQL } from '../../../../../../src/gen/graphqlTypes'
import { EmailAliasStatus } from '../../../../../../src/public'
import { EmailAliasEntityStatus } from '../../../../../../src/private/domain/entities/alias/emailAliasEntity'
import { EmailAliasStatusTransformer } from '../../../../../../src/private/data/alias/transformer/emailAliasStatusTransformer'

describe('EmailAliasStatusTransformer Test Suite', () => {
  describe('graphQLToEntity', () => {
    it.each`
      input                              | expected
      ${EmailMaskStatusGraphQL.Enabled}  | ${EmailAliasEntityStatus.ENABLED}
      ${EmailMaskStatusGraphQL.Disabled} | ${EmailAliasEntityStatus.DISABLED}
      ${EmailMaskStatusGraphQL.Locked}   | ${EmailAliasEntityStatus.LOCKED}
    `('transforms $input from GraphQL to Entity', ({ input, expected }) => {
      const result = EmailAliasStatusTransformer.graphQLToEntity(input)
      expect(result).toEqual(expected)
    })
  })

  describe('entityToGraphQL', () => {
    it.each`
      input                              | expected
      ${EmailAliasEntityStatus.ENABLED}  | ${EmailMaskStatusGraphQL.Enabled}
      ${EmailAliasEntityStatus.DISABLED} | ${EmailMaskStatusGraphQL.Disabled}
      ${EmailAliasEntityStatus.LOCKED}   | ${EmailMaskStatusGraphQL.Locked}
    `('transforms $input from Entity to GraphQL', ({ input, expected }) => {
      const result = EmailAliasStatusTransformer.entityToGraphQL(input)
      expect(result).toEqual(expected)
    })
  })

  describe('entityToApi', () => {
    it.each`
      input                              | expected
      ${EmailAliasEntityStatus.ENABLED}  | ${EmailAliasStatus.ENABLED}
      ${EmailAliasEntityStatus.DISABLED} | ${EmailAliasStatus.DISABLED}
      ${EmailAliasEntityStatus.LOCKED}   | ${EmailAliasStatus.LOCKED}
    `('transforms $input from Entity to API', ({ input, expected }) => {
      const result = EmailAliasStatusTransformer.entityToApi(input)
      expect(result).toEqual(expected)
    })
  })

  describe('apiToEntity', () => {
    it.each`
      input                        | expected
      ${EmailAliasStatus.ENABLED}  | ${EmailAliasEntityStatus.ENABLED}
      ${EmailAliasStatus.DISABLED} | ${EmailAliasEntityStatus.DISABLED}
      ${EmailAliasStatus.LOCKED}   | ${EmailAliasEntityStatus.LOCKED}
    `('transforms $input from API to Entity', ({ input, expected }) => {
      const result = EmailAliasStatusTransformer.apiToEntity(input)
      expect(result).toEqual(expected)
    })
  })
})
