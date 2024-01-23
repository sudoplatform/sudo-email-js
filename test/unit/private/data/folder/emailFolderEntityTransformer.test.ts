/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailFolderEntityTransformer } from '../../../../../src/private/data/folder/transformer/emailFolderEntityTransformer'
import { EntityDataFactory } from '../../../data-factory/entity'
import { GraphQLDataFactory } from '../../../data-factory/graphQL'

describe('EmailFolderEntityTransformer Test Suite', () => {
  const instanceUnderTest = new EmailFolderEntityTransformer()

  describe('transformGraphQL', () => {
    it('transforms successfully', () => {
      expect(
        instanceUnderTest.transformGraphQL(GraphQLDataFactory.emailFolder),
      ).toStrictEqual(EntityDataFactory.emailFolder)
    })
  })
})
