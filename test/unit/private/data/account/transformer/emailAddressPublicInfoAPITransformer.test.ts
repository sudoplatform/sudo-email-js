/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailAddressPublicInfoAPITransformer } from '../../../../../../src/private/data/account/transformer/emailAddressPublicInfoAPITransformer'
import { EmailAddressPublicInfo } from '../../../../../../src/public'
import { EntityDataFactory } from '../../../../data-factory/entity'

describe('EmailAddressPublicInfoAPITransformer Test Suite', () => {
  const instanceUnderTest = EmailAddressPublicInfoAPITransformer

  it('transforms from graphql successfully', () => {
    const entity = EntityDataFactory.emailAddressesPublicInfo[0]
    const expectedResult: EmailAddressPublicInfo = {
      emailAddress: entity.emailAddress,
      keyId: entity.keyId,
      publicKey: entity.publicKeyDetails.publicKey,
      publicKeyDetails: {
        publicKey: entity.publicKeyDetails.publicKey,
        keyFormat: entity.publicKeyDetails.keyFormat,
        algorithm: entity.publicKeyDetails.algorithm,
      },
    }
    expect(instanceUnderTest.transformEntity(entity)).toStrictEqual(
      expectedResult,
    )
  })
})
