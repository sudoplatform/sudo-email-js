/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailMessageAPITransformer } from '../../../../../../src/private/data/message/transformer/emailMessageAPITransformer'
import { APIDataFactory } from '../../../../data-factory/api'
import { EntityDataFactory } from '../../../../data-factory/entity'

describe('EmailMessageAPITransformer Test Suite', () => {
  const instanceUnderTest = new EmailMessageAPITransformer()

  describe('transformEntity', () => {
    it('transforms successfully', () => {
      expect(
        instanceUnderTest.transformEntity(EntityDataFactory.emailMessage),
      ).toEqual(APIDataFactory.emailMessage)
    })
  })
})
