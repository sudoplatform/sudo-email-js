/*
 * Copyright © 2023 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { SealedEmailMessageEntityTransformer } from '../../../../../../src/private/data/message/transformer/sealedEmailMessageEntityTransformer'
import { EntityDataFactory } from '../../../../data-factory/entity'
import { GraphQLDataFactory } from '../../../../data-factory/graphQL'

describe('EmailMessageAPITransformer Test Suite', () => {
  const instanceUnderTest = new SealedEmailMessageEntityTransformer()

  describe('transformGraphQL', () => {
    it('transforms successfully', () => {
      expect(
        instanceUnderTest.transformGraphQL(
          GraphQLDataFactory.sealedEmailMessage,
        ),
      ).toStrictEqual(EntityDataFactory.sealedEmailMessage)
    })
  })
})
