/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { PublicKeyFormat } from '@sudoplatform/sudo-common'
import { KeyFormat } from '../../../../../../src/gen/graphqlTypes'
import { KeyFormatEntityTransformer } from '../../../../../../src/private/data/account/transformer/keyFormatEntityTransformer'

describe('KeyFormatEntityTransformer test suite', () => {
  it('transforms RSA graphQL type to entity', () => {
    expect(
      KeyFormatEntityTransformer.transformGraphQL(KeyFormat.RsaPublicKey),
    ).toStrictEqual(PublicKeyFormat.RSAPublicKey)
  })

  it('transforms SPKI graphQL type to entity', () => {
    expect(
      KeyFormatEntityTransformer.transformGraphQL(KeyFormat.Spki),
    ).toStrictEqual(PublicKeyFormat.SPKI)
  })

  it('transforms RSA entity to model type', () => {
    expect(
      KeyFormatEntityTransformer.transformEntity(PublicKeyFormat.RSAPublicKey),
    ).toStrictEqual(KeyFormat.RsaPublicKey)
  })

  it('transforms SPKI entity to model type', () => {
    expect(
      KeyFormatEntityTransformer.transformEntity(PublicKeyFormat.SPKI),
    ).toStrictEqual(KeyFormat.Spki)
  })
})
