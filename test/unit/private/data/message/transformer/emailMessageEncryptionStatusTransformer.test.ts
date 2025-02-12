/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { empty } from 'fp-ts/lib/ReadonlyRecord'
import { EmailMessageEncryptionStatus } from '../../../../../../src/gen/graphqlTypes'
import { EmailMessageEncryptionStatusTransformer } from '../../../../../../src/private/data/message/transformer/emailMessageEncryptionStatusTransformer'
import { EncryptionStatus } from '../../../../../../src/public/typings/encryptionStatus'

describe('EmailMessageEncryptionStatusTransformer Test Suite', () => {
  const instanceUnderTest = new EmailMessageEncryptionStatusTransformer()

  describe('fromAPIToGraphQL', () => {
    it.each`
      input                           | expected
      ${EncryptionStatus.ENCRYPTED}   | ${EmailMessageEncryptionStatus.Encrypted}
      ${EncryptionStatus.UNENCRYPTED} | ${EmailMessageEncryptionStatus.Unencrypted}
    `(
      'converts API status ($input) to GraphQL status ($expected)',
      ({ input, expected }) => {
        expect(instanceUnderTest.fromAPIToGraphQL(input)).toStrictEqual(
          expected,
        )
      },
    )
  })

  describe('fromGraphQLToAPI', () => {
    it.each`
      input                                       | expected
      ${EmailMessageEncryptionStatus.Encrypted}   | ${EncryptionStatus.ENCRYPTED}
      ${EmailMessageEncryptionStatus.Unencrypted} | ${EncryptionStatus.UNENCRYPTED}
    `(
      'converts GraphQL status ($input) to API status ($expected)',
      ({ input, expected }) => {
        expect(instanceUnderTest.fromGraphQLToAPI(input)).toStrictEqual(
          expected,
        )
      },
    )
  })
})
