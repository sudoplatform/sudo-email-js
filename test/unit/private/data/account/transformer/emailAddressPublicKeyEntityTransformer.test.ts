/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EntityDataFactory } from '../../../../data-factory/entity'
import { GraphQLDataFactory } from '../../../../data-factory/graphQL'
import { EmailAddressPublicKeyEntityTransformer } from '../../../../../../src/private/data/account/transformer/emailAddressPublicKeyEntityTransformer'

describe('EmailAddressPublicKeyEntityTransformer test suite', () => {
  const entity = EntityDataFactory.emailAddressesPublicInfo[0].publicKeyDetails
  const gqlEntity =
    GraphQLDataFactory.emailAddressesPublicInfo[0].publicKeyDetails

  it('transforms graphQL type to entity', () => {
    expect(
      EmailAddressPublicKeyEntityTransformer.transformGraphQL(gqlEntity),
    ).toStrictEqual(entity)
  })

  it('transforms entity to graphQL type', () => {
    expect(
      EmailAddressPublicKeyEntityTransformer.transformEntity(entity),
    ).toStrictEqual(gqlEntity)
  })
})
