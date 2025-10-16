/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailMaskStatus as EmailMaskStatusGraphQL } from '../../../../../../src/gen/graphqlTypes'
import { EmailMaskStatus } from '../../../../../../src/public'
import { EmailMaskEntityStatus } from '../../../../../../src/private/domain/entities/mask/emailMaskEntity'
import { EmailMaskStatusTransformer } from '../../../../../../src/private/data/mask/transformer/emailMaskStatusTransformer'

describe('EmailMaskStatusTransformer Test Suite', () => {
  describe('graphQLToEntity', () => {
    it.each`
      input                              | expected
      ${EmailMaskStatusGraphQL.Enabled}  | ${EmailMaskEntityStatus.ENABLED}
      ${EmailMaskStatusGraphQL.Disabled} | ${EmailMaskEntityStatus.DISABLED}
      ${EmailMaskStatusGraphQL.Locked}   | ${EmailMaskEntityStatus.LOCKED}
    `('transforms $input from GraphQL to Entity', ({ input, expected }) => {
      const result = EmailMaskStatusTransformer.graphQLToEntity(input)
      expect(result).toEqual(expected)
    })
  })

  describe('entityToGraphQL', () => {
    it.each`
      input                             | expected
      ${EmailMaskEntityStatus.ENABLED}  | ${EmailMaskStatusGraphQL.Enabled}
      ${EmailMaskEntityStatus.DISABLED} | ${EmailMaskStatusGraphQL.Disabled}
      ${EmailMaskEntityStatus.LOCKED}   | ${EmailMaskStatusGraphQL.Locked}
    `('transforms $input from Entity to GraphQL', ({ input, expected }) => {
      const result = EmailMaskStatusTransformer.entityToGraphQL(input)
      expect(result).toEqual(expected)
    })
  })

  describe('entityToApi', () => {
    it.each`
      input                             | expected
      ${EmailMaskEntityStatus.ENABLED}  | ${EmailMaskStatus.ENABLED}
      ${EmailMaskEntityStatus.DISABLED} | ${EmailMaskStatus.DISABLED}
      ${EmailMaskEntityStatus.LOCKED}   | ${EmailMaskStatus.LOCKED}
    `('transforms $input from Entity to API', ({ input, expected }) => {
      const result = EmailMaskStatusTransformer.entityToApi(input)
      expect(result).toEqual(expected)
    })
  })

  describe('apiToEntity', () => {
    it.each`
      input                       | expected
      ${EmailMaskStatus.ENABLED}  | ${EmailMaskEntityStatus.ENABLED}
      ${EmailMaskStatus.DISABLED} | ${EmailMaskEntityStatus.DISABLED}
      ${EmailMaskStatus.LOCKED}   | ${EmailMaskEntityStatus.LOCKED}
    `('transforms $input from API to Entity', ({ input, expected }) => {
      const result = EmailMaskStatusTransformer.apiToEntity(input)
      expect(result).toEqual(expected)
    })
  })
})
