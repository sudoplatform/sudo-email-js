/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailAddressPublicKeyAPITransformer } from '../../../../../../src/private/data/account/transformer/emailAddressPublicKeyAPITransformer'
import { EmailAddressPublicKey } from '../../../../../../src/public/typings/emailAddressPublicKey'
import { EntityDataFactory } from '../../../../data-factory/entity'

describe('EmailAddressPublicKeyAPITransformer Test Suite', () => {
  const instanceUnderTest = EmailAddressPublicKeyAPITransformer

  it('transforms from graphql successfully', () => {
    const entity =
      EntityDataFactory.emailAddressesPublicInfo[0].publicKeyDetails
    const expectedResult: EmailAddressPublicKey = {
      publicKey: entity.publicKey,
      keyFormat: entity.keyFormat,
      algorithm: entity.algorithm,
    }
    expect(instanceUnderTest.transformEntity(entity)).toStrictEqual(
      expectedResult,
    )
  })
})
