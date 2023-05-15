/*
 * Copyright © 2023 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailAddressEntityTransformer } from '../../../../../../src/private/data/account/transformer/emailAddressEntityTransformer'
import { EntityDataFactory } from '../../../../data-factory/entity'

describe('EmailAddressEntityTransformer Test Suite', () => {
  const instanceUnderTest = new EmailAddressEntityTransformer()

  describe('transform', () => {
    it('transforms successfully without alias', () => {
      expect(
        instanceUnderTest.transform(
          EntityDataFactory.emailAddress.emailAddress,
        ),
      ).toStrictEqual(EntityDataFactory.emailAddress)
    })

    it('transforms successfully with alias', () => {
      expect(
        instanceUnderTest.transform(
          EntityDataFactory.emailAddress.emailAddress,
          'Some Alias',
        ),
      ).toStrictEqual(EntityDataFactory.emailAddressWithAlias)
    })
  })
})
