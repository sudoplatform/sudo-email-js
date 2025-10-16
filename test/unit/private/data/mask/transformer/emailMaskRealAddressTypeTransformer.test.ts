/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailMaskRealAddressType as EmailMaskRealAddressTypeGraphQL } from '../../../../../../src/gen/graphqlTypes'
import { EmailMaskRealAddressType } from '../../../../../../src/public'
import { EmailMaskEntityRealAddressType } from '../../../../../../src/private/domain/entities/mask/emailMaskEntity'
import { EmailMaskRealAddressTypeTransformer } from '../../../../../../src/private/data/mask/transformer/emailMaskRealAddressTypeTransformer'

describe('EmailMaskRealAddressTypeTransformer Test Suite', () => {
  describe('graphQLToEntity', () => {
    it.each`
      input                                       | expected
      ${EmailMaskRealAddressTypeGraphQL.External} | ${EmailMaskEntityRealAddressType.EXTERNAL}
      ${EmailMaskRealAddressTypeGraphQL.Internal} | ${EmailMaskEntityRealAddressType.INTERNAL}
    `('transforms $input from GraphQL to Entity', ({ input, expected }) => {
      const result = EmailMaskRealAddressTypeTransformer.graphQLToEntity(input)
      expect(result).toEqual(expected)
    })
  })

  describe('entityToGraphQL', () => {
    it.each`
      input                                      | expected
      ${EmailMaskEntityRealAddressType.EXTERNAL} | ${EmailMaskRealAddressTypeGraphQL.External}
      ${EmailMaskEntityRealAddressType.INTERNAL} | ${EmailMaskRealAddressTypeGraphQL.Internal}
    `('transforms $input from Entity to GraphQL', ({ input, expected }) => {
      const result = EmailMaskRealAddressTypeTransformer.entityToGraphQL(input)
      expect(result).toEqual(expected)
    })
  })

  describe('entityToApi', () => {
    it.each`
      input                                      | expected
      ${EmailMaskEntityRealAddressType.EXTERNAL} | ${EmailMaskRealAddressType.EXTERNAL}
      ${EmailMaskEntityRealAddressType.INTERNAL} | ${EmailMaskRealAddressType.INTERNAL}
    `('transforms $input from Entity to API', ({ input, expected }) => {
      const result = EmailMaskRealAddressTypeTransformer.entityToApi(input)
      expect(result).toEqual(expected)
    })
  })

  describe('apiToEntity', () => {
    it.each`
      input                                | expected
      ${EmailMaskRealAddressType.EXTERNAL} | ${EmailMaskEntityRealAddressType.EXTERNAL}
      ${EmailMaskRealAddressType.INTERNAL} | ${EmailMaskEntityRealAddressType.INTERNAL}
    `('transforms $input from API to Entity', ({ input, expected }) => {
      const result = EmailMaskRealAddressTypeTransformer.apiToEntity(input)
      expect(result).toEqual(expected)
    })
  })
})
