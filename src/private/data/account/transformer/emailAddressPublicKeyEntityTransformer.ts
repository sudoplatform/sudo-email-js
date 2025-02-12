/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailAddressPublicKey } from '../../../../public/typings/emailAddressPublicKey'
import { EmailAddressPublicKey as EmailAddressPublicKeyGraphQL } from '../../../../gen/graphqlTypes'
import { KeyFormatEntityTransformer } from './keyFormatEntityTransformer'

export class EmailAddressPublicKeyEntityTransformer {
  static transformEntity(
    entity: EmailAddressPublicKey,
  ): EmailAddressPublicKeyGraphQL {
    return {
      __typename: 'EmailAddressPublicKey',
      publicKey: entity.publicKey,
      algorithm: entity.algorithm,
      keyFormat: KeyFormatEntityTransformer.transformEntity(entity.keyFormat),
    }
  }

  static transformGraphQL(
    graphql: EmailAddressPublicKeyGraphQL,
  ): EmailAddressPublicKey {
    return {
      publicKey: graphql.publicKey,
      algorithm: graphql.algorithm,
      keyFormat: KeyFormatEntityTransformer.transformGraphQL(graphql.keyFormat),
    }
  }
}
