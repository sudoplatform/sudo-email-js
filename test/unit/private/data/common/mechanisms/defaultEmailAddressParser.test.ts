/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import EmailAddressParser from '../../../../../../src/private/domain/entities/common/mechanisms/emailAddressParser'
import { DefaultEmailAddressParser } from '../../../../../../src/private/data/common/mechanisms/defaultEmailAddressParser'

describe('DefaultEmailAddressParser Unit Test Suite', () => {
  describe('generateHash', () => {
    let instanceUnderTest: EmailAddressParser

    beforeEach(() => {
      instanceUnderTest = new DefaultEmailAddressParser()
    })

    it('normalizes email addresses properly', () => {
      const plain = 'spammyMcSpamface@spambot.com'
      const normalized = instanceUnderTest.normalize(plain)
      expect(normalized).toEqual(plain.toLowerCase())
    })
  })
})
