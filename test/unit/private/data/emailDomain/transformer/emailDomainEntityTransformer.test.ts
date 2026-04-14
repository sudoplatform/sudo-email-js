/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailDomainEntityTransformer } from '../../../../../../src/private/data/emailDomain/transformer/emailDomainEntityTransformer'
import { EntityDataFactory } from '../../../../data-factory/entity'
import { GraphQLDataFactory } from '../../../../data-factory/graphQL'

describe('EmailDomainEntityTransformer Test Suite', () => {
  const instanceUnderTest = new EmailDomainEntityTransformer()

  describe('transformGraphQL', () => {
    it('transforms successfully', () => {
      expect(
        instanceUnderTest.transformGraphQL(
          GraphQLDataFactory.supportedEmailDomains.domains[0],
        ),
      ).toStrictEqual(EntityDataFactory.emailDomain)
    })
  })

  describe('transformListEmailDomainsGraphQL', () => {
    it('transforms successfully', () => {
      expect(
        instanceUnderTest.transformListEmailDomainsGraphQL(
          GraphQLDataFactory.emailDomains[0],
        ),
      ).toStrictEqual(EntityDataFactory.emailDomainWithMetadata)
    })
  })
})
