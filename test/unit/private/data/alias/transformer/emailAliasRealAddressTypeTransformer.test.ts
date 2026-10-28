/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailMaskRealAddressType as EmailMaskRealAddressTypeGraphQL } from '../../../../../../src/gen/graphqlTypes'
import { EmailAliasRealAddressType } from '../../../../../../src/public'
import { EmailAliasEntityRealAddressType } from '../../../../../../src/private/domain/entities/alias/emailAliasEntity'
import { EmailAliasRealAddressTypeTransformer } from '../../../../../../src/private/data/alias/transformer/emailAliasRealAddressTypeTransformer'

describe('EmailAliasRealAddressTypeTransformer Test Suite', () => {
  describe('graphQLToEntity', () => {
    it.each`
      input                                       | expected
      ${EmailMaskRealAddressTypeGraphQL.External} | ${EmailAliasEntityRealAddressType.EXTERNAL}
      ${EmailMaskRealAddressTypeGraphQL.Internal} | ${EmailAliasEntityRealAddressType.INTERNAL}
    `('transforms $input from GraphQL to Entity', ({ input, expected }) => {
      const result = EmailAliasRealAddressTypeTransformer.graphQLToEntity(input)
      expect(result).toEqual(expected)
    })
  })

  describe('entityToGraphQL', () => {
    it.each`
      input                                       | expected
      ${EmailAliasEntityRealAddressType.EXTERNAL} | ${EmailMaskRealAddressTypeGraphQL.External}
      ${EmailAliasEntityRealAddressType.INTERNAL} | ${EmailMaskRealAddressTypeGraphQL.Internal}
    `('transforms $input from Entity to GraphQL', ({ input, expected }) => {
      const result = EmailAliasRealAddressTypeTransformer.entityToGraphQL(input)
      expect(result).toEqual(expected)
    })
  })

  describe('entityToApi', () => {
    it.each`
      input                                       | expected
      ${EmailAliasEntityRealAddressType.EXTERNAL} | ${EmailAliasRealAddressType.EXTERNAL}
      ${EmailAliasEntityRealAddressType.INTERNAL} | ${EmailAliasRealAddressType.INTERNAL}
    `('transforms $input from Entity to API', ({ input, expected }) => {
      const result = EmailAliasRealAddressTypeTransformer.entityToApi(input)
      expect(result).toEqual(expected)
    })
  })

  describe('apiToEntity', () => {
    it.each`
      input                                 | expected
      ${EmailAliasRealAddressType.EXTERNAL} | ${EmailAliasEntityRealAddressType.EXTERNAL}
      ${EmailAliasRealAddressType.INTERNAL} | ${EmailAliasEntityRealAddressType.INTERNAL}
    `('transforms $input from API to Entity', ({ input, expected }) => {
      const result = EmailAliasRealAddressTypeTransformer.apiToEntity(input)
      expect(result).toEqual(expected)
    })
  })
})
