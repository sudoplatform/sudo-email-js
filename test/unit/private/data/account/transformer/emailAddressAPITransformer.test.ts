/*
 * Copyright © 2023 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailAddressAPITransformer } from '../../../../../../src/private/data/account/transformer/emailAddressAPITransformer'
import { APIDataFactory } from '../../../../data-factory/api'
import { EntityDataFactory } from '../../../../data-factory/entity'

describe('EmailAddressAPITransformer Test Suite', () => {
  const instanceUnderTest = new EmailAddressAPITransformer()

  describe('transformEntity', () => {
    it('transforms successfully', () => {
      expect(
        instanceUnderTest.transformEntity(EntityDataFactory.emailAccount),
      ).toStrictEqual(APIDataFactory.emailAddress)
    })
  })
})
