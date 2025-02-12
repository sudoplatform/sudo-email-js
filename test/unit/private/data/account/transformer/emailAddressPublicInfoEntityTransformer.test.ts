/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { GraphQLDataFactory } from '../../../../data-factory/graphQL'
import { EntityDataFactory } from '../../../../data-factory/entity'
import { EmailAddressPublicInfoEntityTransformer } from '../../../../../../src/private/data/account/transformer/emailAddressPublicInfoEntityTransformer'

describe('EmailAddressPublicInfoEntityTransformer Test Suite', () => {
  const instanceUnderTest = EmailAddressPublicInfoEntityTransformer

  it('transforms from graphql successfully', () => {
    expect(
      instanceUnderTest.transformGraphQL(
        GraphQLDataFactory.emailAddressesPublicInfo[0],
      ),
    ).toStrictEqual(EntityDataFactory.emailAddressesPublicInfo[0])
  })

  it('transforms from entity successfully', () => {
    expect(
      instanceUnderTest.transformEntity(
        EntityDataFactory.emailAddressesPublicInfo[0],
      ),
    ).toStrictEqual(GraphQLDataFactory.emailAddressesPublicInfo[0])
  })
})
