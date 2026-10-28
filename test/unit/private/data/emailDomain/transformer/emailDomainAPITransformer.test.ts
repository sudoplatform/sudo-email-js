/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailDomainAPITransformer } from '../../../../../../src/private/data/emailDomain/transformer/emailDomainAPITransformer'
import { EntityDataFactory } from '../../../../data-factory/entity'

describe('EmailDomainAPITransformer Test Suite', () => {
  const instanceUnderTest = new EmailDomainAPITransformer()

  describe('transformEntity', () => {
    it('transforms successfully with parsed metadata', () => {
      expect(
        instanceUnderTest.transformEntity(
          EntityDataFactory.emailDomainWithMetadata,
        ),
      ).toStrictEqual({
        domain: 'unittest.org',
        isAliasDomain: false,
        metadata: { provider: 'internal' },
      })
    })

    it('returns empty object metadata for invalid JSON', () => {
      expect(
        instanceUnderTest.transformEntity({
          domain: 'example.com',
          isAliasDomain: true,
          metadata: '{',
        }),
      ).toStrictEqual({
        domain: 'example.com',
        isAliasDomain: true,
        metadata: {},
      })
    })

    it('returns empty object metadata when metadata does not exist', () => {
      expect(
        instanceUnderTest.transformEntity({
          domain: 'example.com',
          isAliasDomain: true,
        }),
      ).toStrictEqual({
        domain: 'example.com',
        isAliasDomain: true,
        metadata: {},
      })
    })
  })
})
