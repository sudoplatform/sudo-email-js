/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailAddressPublicInfoTransformer } from '../../../../../../src/private/data/account/transformer/emailAddressPublicInfoTransformer'
import { EntityDataFactory } from '../../../../data-factory/entity'
import { GraphQLDataFactory } from '../../../../data-factory/graphQL'

describe('EmailAddressPublicInfoTransformer Test Suite', () => {
  const instanceUnderTest = EmailAddressPublicInfoTransformer

  it('transforms from graphql successfully', () => {
    expect(
      instanceUnderTest.transformGraphQL(
        GraphQLDataFactory.emailAddressesPublicInfo[0],
      ),
    ).toStrictEqual(EntityDataFactory.emailAddressesPublicInfo[0])
  })

  it('transforms from entity successfully', () => {
    expect(
      instanceUnderTest.transformGraphQL(
        EntityDataFactory.emailAddressesPublicInfo[0],
      ),
    ).toStrictEqual({
      emailAddress: EntityDataFactory.emailAddressesPublicInfo[0].emailAddress,
      keyId: EntityDataFactory.emailAddressesPublicInfo[0].keyId,
      publicKey: EntityDataFactory.emailAddressesPublicInfo[0].publicKey,
    })
  })
})
