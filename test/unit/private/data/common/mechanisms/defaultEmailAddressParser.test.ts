/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import EmailAddressParser from '../../../../../../src/private/domain/entities/common/mechanisms/emailAddressParser'
import { DefaultEmailAddressParser } from '../../../../../../src/private/data/common/mechanisms/defaultEmailAddressParser'
import { generateHash } from '../../../../../../src/private/util/stringUtils'

describe('DefaultEmailAddressParser Unit Test Suite', () => {
  let instanceUnderTest: EmailAddressParser
  describe('normalize', () => {
    beforeEach(() => {
      instanceUnderTest = new DefaultEmailAddressParser()
    })

    it('normalizes email addresses properly', () => {
      const plain = 'spammyMcSpamface@spambot.com'
      const normalized = instanceUnderTest.normalize(plain)
      expect(normalized).toEqual(plain.toLowerCase())
    })
  })

  describe('genrateHash', () => {
    /**
     * This should also server as an integration test between
     * the different SDKs
     */
    it('hash email address', () => {
      const address = 'me@example.com'
      const altAddress = 'ME@example.com'
      const addressHash = 'jCpH07240wlqZHn1Pqw7ckKR218cMWERAPZ1vlU3Mp0='

      const normalizedAddress = instanceUnderTest.normalize(address)
      const normalizedAltAddress = instanceUnderTest.normalize(altAddress)

      expect(normalizedAddress).toStrictEqual(normalizedAltAddress)

      expect(generateHash(normalizedAddress)).toStrictEqual(addressHash)
      expect(generateHash(normalizedAltAddress)).toStrictEqual(addressHash)
    })
  })
})
